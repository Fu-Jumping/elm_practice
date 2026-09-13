/**
 * 搜索历史（PRD 7.16.1「首页-搜索框」：搜索历史与热门词本期实现）——骨架：
 * 先声明读写接口（当前返回空/不落盘），真实实现（localStorage 持久化、去重、最新在前、上限）由
 * 紧随其后的 `feat:` 提交落地（TDD：先红后绿）。
 *
 * 口径说明：契约没有搜索历史接口，历史属**本机用户侧状态**，故用 localStorage 承载；
 * 热门词同源无接口 → 由页面内置课程演示清单（不得当作接口结果）。
 */
export const SEARCH_HISTORY_KEY = 'elm.search-history'
export const SEARCH_HISTORY_MAX = 8

export function readSearchHistory(): string[] {
  return []
}

export function pushSearchHistory(_keyword: string): string[] {
  return []
}

export function clearSearchHistory(): void {
  // 骨架：无副作用
}
