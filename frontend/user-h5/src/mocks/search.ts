/**
 * 搜索域 mock（契约 §3.6）——骨架：先只完成注册与「无匹配返回空列表」的最简形态，
 * 关键词/分类命中、排序与分页规则由紧随其后的 `feat:` 提交实现（TDD：先红后绿）。
 *
 * 契约要点（实现时逐条对齐）：
 * - `keyword` 匹配商家名或商品名；空关键词返回空列表（前端已拦截，不发请求）
 * - `categoryId` 为可选分类条件，来源店铺自身 `categories`；无匹配返回空列表、不返回 404
 * - `sort` = 综合（销量优先、评分次之）/ 销量（monthlySales 倒序）/ 距离（种子 distanceKm 升序）
 * - `page`/`size` 默认 1/10；非正整数或非法 sort → 400
 * - 响应分页对象为 list/page/size/total
 */
import type { SearchResult } from '@/services/api/types'
import type { MockHandler } from './index'
import { ok } from './index'

export const searchMocks: Record<string, MockHandler> = {
  'GET /search': (): ReturnType<typeof ok<SearchResult>> =>
    ok<SearchResult>({
      merchants: { list: [], page: 1, size: 10, total: 0 },
      products: { list: [], page: 1, size: 10, total: 0 },
    }),
}
