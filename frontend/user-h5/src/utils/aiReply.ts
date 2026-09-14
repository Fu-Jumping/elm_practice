/**
 * AI 回复渲染解析（AI点餐助手前端PRD §4.1/§4.2）
 *
 * 口径：PRD §4.1 表格——`**文字**` 加粗、`- 项` 无序列表、换行保留、其余原样显示；
 * §4.2——商家编号 `[m002]` 渲染为可点击链接（跳商家详情）。
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

/** 行内标记：`**加粗**` 或 `[商家编号]`（编号为 ASCII 标识；后接 `(` 视为 Markdown 链接，不解析） */
const INLINE_TOKEN = /\*\*[^*]+\*\*|\[[A-Za-z0-9_-]+\](?!\()/g

function parseRuns(line: string): AiRun[] {
  const runs: AiRun[] = []
  let cursor = 0
  for (const match of line.matchAll(INLINE_TOKEN)) {
    const index = match.index ?? 0
    if (index > cursor) runs.push({ kind: 'text', text: line.slice(cursor, index) })
    const token = match[0]
    if (token.startsWith('**')) {
      runs.push({ kind: 'bold', text: token.slice(2, -2) })
    } else {
      const storeId = token.slice(1, -1)
      runs.push({ kind: 'store', text: storeId, storeId })
    }
    cursor = index + token.length
  }
  if (cursor < line.length) runs.push({ kind: 'text', text: line.slice(cursor) })
  return runs
}

/** 解析 AI 回复为块列表：连续 `- ` 行合并为列表块，空行只分段 */
export function parseAiReply(text: string): AiBlock[] {
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
        listItems.push(parseRuns(item))
      }
      continue
    }
    flushList()
    const runs = parseRuns(line)
    if (runs.length > 0) blocks.push({ kind: 'paragraph', runs })
  }
  flushList()
  return blocks
}
