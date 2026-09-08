/**
 * 内容区导航类型判定（2026-09-08，返回恢复滚动位置方案）
 * 背景：MainLayout 的 app-main 为独立滚动容器（壳 100dvh overflow hidden），
 * vue-router 的 scrollBehavior 只滚 window、在本工程从未生效（T65/T66 仅单测函数返回值）；
 * 真源判定改读 window.history.state.position（vue-router web history 为每个条目维护的递增序号）。
 */

/** 导航类型：back/forward 恢复滚动；push/replace 置顶 */
export type NavKind = 'back' | 'forward' | 'push' | 'replace'

/**
 * prev = 导航前停留条目号，maxSeen = 本会话到达过的最大条目号，next = 导航后条目号
 * - next < prev → back（回退到旧条目）
 * - next > maxSeen → push（越过历史最大值，只能是新推送条目）
 * - prev < next ≤ maxSeen → forward（前进复用既有条目）
 * - next === prev → replace（同条目替换）
 */
export function resolveNavKind(prev: number, maxSeen: number, next: number): NavKind {
  if (next < prev) return 'back'
  if (next > maxSeen) return 'push'
  if (next > prev) return 'forward'
  return 'replace'
}
