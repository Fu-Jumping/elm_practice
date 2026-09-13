/**
 * 搜索历史（PRD 7.16.1「首页-搜索框」：搜索历史与热门词本期实现）
 *
 * 口径说明：
 * - 契约**没有**搜索历史接口 → 历史属**本机用户侧状态**，用 localStorage 承载（不是接口结果）
 * - 规则：写入前 trim、空词不写；同词去重并提到最前；最多 `SEARCH_HISTORY_MAX` 条，超出丢最旧
 * - 容错：隐私模式/存储不可用或内容损坏时，读写一律静默降级（返回空、不抛错），不影响搜索主流程
 */
export const SEARCH_HISTORY_KEY = 'elm.search-history'
export const SEARCH_HISTORY_MAX = 8

/** 取 localStorage（不可用时返回 null：SSR/隐私模式/被禁用） */
function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** 读历史（最新在前）；内容损坏或非字符串数组时视为空 */
export function readSearchHistory(): string[] {
  const store = storage()
  if (!store) return []
  try {
    const raw = store.getItem(SEARCH_HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      .slice(0, SEARCH_HISTORY_MAX)
  } catch {
    return []
  }
}

/** 写入一条历史（去重 + 最新在前 + 上限），返回写入后的历史 */
export function pushSearchHistory(keyword: string): string[] {
  const word = keyword.trim()
  if (!word) return readSearchHistory()
  const next = [word, ...readSearchHistory().filter((item) => item !== word)].slice(
    0,
    SEARCH_HISTORY_MAX,
  )
  try {
    storage()?.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next))
  } catch {
    // 配额或隐私模式：静默降级，不阻塞搜索
  }
  return next
}

/** 清空历史 */
export function clearSearchHistory(): void {
  try {
    storage()?.removeItem(SEARCH_HISTORY_KEY)
  } catch {
    // 静默降级
  }
}
