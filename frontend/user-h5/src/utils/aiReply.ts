/**
 * AI 回复渲染解析（AI点餐助手前端PRD §4.1/§4.2，2026-09-14 口径同步）
 *
 * 口径：PRD §4.1 表格——`**文字**` 加粗、`- 项` 无序列表、换行保留、其余原样显示；
 * §4.2（main 5848651 起）——**AI 回复文本本身不出现商家编号**，改为按**商家名**匹配商家列表拿到
 * `storeId` 并渲染为可点击片段（视觉：亮橙色文字）。`[m002]` 旧编号标记保留为**防御分支**：
 * 后端提示词回退时仍可跳转，展示时也换成店名（不把编号露给用户）。
 *
 * 实现口径：解析为**结构化块**，不在本层拼 HTML 字符串；渲染层用 Vue 插值输出文本，
 * 因此回复内容（大模型输出，不可信）天然无 XSS 面——见用例 AR-6。
 */
export type AiRun =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'store'; text: string; storeId: string }

export type AiBlock =
  | { kind: 'paragraph'; runs: AiRun[] }
  | { kind: 'list'; items: AiRun[][] }

/** 行内标记源：`**加粗**`、`[商家编号]`（后接 `(` 视为 Markdown 链接，不解析）、以及商家名 */
const BOLD_TOKEN = '\\*\\*[^*]+\\*\\*'
const ID_TOKEN = '\\[[A-Za-z0-9_-]+\\](?!\\()'

/** 商家索引（按名匹配拿 storeId、按 id 反查店名） */
export interface AiStoreRef {
  storeId: string
  name: string
}

interface StoreMatcher {
  /** 商家名候选（已按长度倒序转义，最长优先） */
  names: string | null
  storeIdOf: (name: string) => string | undefined
  nameOf: (storeId: string) => string | undefined
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildStoreMatcher(stores: AiStoreRef[]): StoreMatcher {
  const byName = new Map<string, string>()
  const byId = new Map<string, string>()
  for (const store of stores) {
    const name = typeof store?.name === 'string' ? store.name.trim() : ''
    const storeId = typeof store?.storeId === 'string' ? store.storeId : ''
    if (name !== '' && storeId !== '') {
      byName.set(name, storeId)
      byId.set(storeId, name)
    }
  }
  // 最长优先，避免「老王」抢先命中「老王小店」
  const names = [...byName.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|')
  return {
    names: names === '' ? null : names,
    storeIdOf: (name) => byName.get(name),
    nameOf: (storeId) => byId.get(storeId),
  }
}

function parseRuns(line: string, matcher: StoreMatcher, tokenRe: RegExp): AiRun[] {
  const runs: AiRun[] = []
  let cursor = 0
  for (const match of line.matchAll(tokenRe)) {
    const index = match.index ?? 0
    if (index > cursor) runs.push({ kind: 'text', text: line.slice(cursor, index) })
    const token = match[0]
    if (token.startsWith('**')) {
      // 加粗内容恰为商家名时优先作为可跳转片段（AI 常用 **店名** 强调，不得只加粗不可点）
      const inner = token.slice(2, -2).trim()
      const storeId = matcher.storeIdOf(inner)
      if (storeId) runs.push({ kind: 'store', text: inner, storeId })
      else runs.push({ kind: 'bold', text: token.slice(2, -2) })
    } else if (token.startsWith('[')) {
      // 防御分支：旧编号标记 → 展示店名、按 id 跳转（新口径下后端不再输出编号）
      const storeId = token.slice(1, -1)
      runs.push({ kind: 'store', text: matcher.nameOf(storeId) ?? storeId, storeId })
    } else {
      const storeId = matcher.storeIdOf(token)
      runs.push({ kind: 'store', text: token, storeId: storeId ?? token })
    }
    cursor = index + token.length
  }
  if (cursor < line.length) runs.push({ kind: 'text', text: line.slice(cursor) })
  return runs
}

/**
 * 解析 AI 回复为块列表：连续 `- ` 行合并为列表块，空行只分段。
 * `stores` 用于把回复里的商家名匹配成可跳转片段（缺省时不产生商家链接，加粗仍按加粗渲染）。
 */
export function parseAiReply(text: string, stores: AiStoreRef[] = []): AiBlock[] {
  const matcher = buildStoreMatcher(stores)
  const tokenRe = new RegExp(
    [BOLD_TOKEN, ID_TOKEN, matcher.names].filter((part): part is string => Boolean(part)).join('|'),
    'g',
  )
  const blocks: AiBlock[] = []
  let listItems: AiRun[][] | null = null

  const flushList = (): void => {
    if (listItems && listItems.length > 0) blocks.push({ kind: 'list', items: listItems })
    listItems = null
  }

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (line === '') {
      flushList()
      continue
    }
    if (line.startsWith('- ')) {
      const item = line.slice(2).trim()
      if (item !== '') {
        if (!listItems) listItems = []
        listItems.push(parseRuns(item, matcher, tokenRe))
      }
      continue
    }
    flushList()
    const runs = parseRuns(line, matcher, tokenRe)
    if (runs.length > 0) blocks.push({ kind: 'paragraph', runs })
  }
  flushList()
  return blocks
}
