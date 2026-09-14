/**
 * 店铺列表排序的公共实现——契约 §3.2 `GET /stores` 与 §3.6 `/search` 共用同一套排序口径，
 * 避免两处各写一份导致「综合/销量/距离」语义漂移。
 *
 * 契约 §3.6 定义：综合 = 销量优先、评分次之；销量 = `monthlySales` 倒序；距离 = 种子距离升序。
 * 距离取值：真实后端用种子固定字段 `distanceKm`；替身按 `distanceText` 解析等价数值，缺该字段的店铺排最后。
 */
import type { SearchSort, StoreSummary } from '@/services/api/types'

/** `sort` 最小取值（契约 §3.2 与 §3.6 相同） */
export const STORE_SORT_VALUES: SearchSort[] = ['综合', '销量', '距离']

export function distanceValue(store: StoreSummary): number {
  const parsed = Number.parseFloat(store.distanceText ?? '')
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY
}

export function sortStores(stores: StoreSummary[], sort: SearchSort): StoreSummary[] {
  const list = [...stores]
  if (sort === '销量') return list.sort((a, b) => b.monthlySales - a.monthlySales)
  if (sort === '距离') return list.sort((a, b) => distanceValue(a) - distanceValue(b))
  // 综合（契约 §3.6）：销量优先、评分次之，不做加权公式
  return list.sort((a, b) => b.monthlySales - a.monthlySales || b.rating - a.rating)
}
