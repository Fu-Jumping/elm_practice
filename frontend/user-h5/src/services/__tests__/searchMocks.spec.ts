import { describe, expect, it } from 'vitest'
import { mockDispatch } from '@/mocks'
import type { SearchResult } from '@/services/api/types'

/**
 * 搜索替身规则测试（TODO-USER-005，契约 §3.6）
 * 替身与页面同批落地：页面按契约写适配层，真实后端（批次⑤）就绪后切 real 模式即可。
 * 规则口径逐条来自契约 §3.6：keyword 命中商家名或商品名、categoryId 来源店铺自身 categories、
 * 排序（综合=销量优先评分次之 / 销量=monthlySales 倒序 / 距离=distanceKm 升序）、
 * 分页 page/size 默认 1/10、非法入参 400、空关键词与无命中返回空列表（不 404）。
 */
async function search(params: Record<string, unknown>) {
  const res = await mockDispatch({ method: 'GET', url: '/search', params })
  return res
}

async function okData(params: Record<string, unknown>): Promise<SearchResult> {
  const res = await search(params)
  expect(res.status, `期望 200，实际 ${res.status}`).toBe(200)
  return res.payload.data as SearchResult
}

describe('搜索替身规则（契约 §3.6）', () => {
  it('SM-1 关键词命中商家名：只返回匹配商家，商家分页对象字段齐（list/page/size/total）', async () => {
    const data = await okData({ keyword: '肯德基' })
    expect(data.merchants.list.map((s) => s.storeId)).toEqual(['m002'])
    expect(data.merchants.page).toBe(1)
    expect(data.merchants.size).toBe(10)
    expect(data.merchants.total).toBe(1)
  })

  it('SM-2 关键词命中商品名：返回该商品所属商家，并在 products 中返回命中的商品', async () => {
    const data = await okData({ keyword: '香辣鸡腿堡' })
    expect(data.products.list.length).toBeGreaterThan(0)
    expect(data.products.list[0].storeId).toBe('m002')
    expect(data.merchants.list.map((s) => s.storeId)).toContain('m002')
  })

  it('SM-3 categoryId 在关键词命中范围内再收窄；分类不匹配返回空列表而非 404', async () => {
    // 关键词命中 m002 的商品 → 商家结果只有 m002
    const byKeyword = await okData({ keyword: '香辣鸡腿堡' })
    expect(byKeyword.merchants.list.map((s) => s.storeId)).toEqual(['m002'])
    // c101 属 m002 自身分类 → 仍命中；c201 属 m001 → 收窄为空列表（不 404）
    const sameCategory = await okData({ keyword: '香辣鸡腿堡', categoryId: 'c101' })
    expect(sameCategory.merchants.total).toBe(1)
    const otherCategory = await okData({ keyword: '香辣鸡腿堡', categoryId: 'c201' })
    expect(otherCategory.merchants.total).toBe(0)
    const none = await search({ keyword: '香辣鸡腿堡', categoryId: 'not-exist' })
    expect(none.status).toBe(200)
    expect((none.payload.data as SearchResult).merchants.total).toBe(0)
  })

  it('SM-4 排序：综合=销量优先、评分次之；销量=monthlySales 倒序；距离=distanceKm 升序', async () => {
    // 宽关键词「老」命中 m001/m004（店名）与 m002（商品「老北京鸡肉卷」）→ 3 家可验证排序
    const byDefault = await okData({ keyword: '老' })
    const sales = byDefault.merchants.list.map((s) => s.monthlySales)
    expect(sales).toEqual([...sales].sort((a, b) => b - a))

    const bySales = await okData({ keyword: '老', sort: '销量' })
    expect(bySales.merchants.list.map((s) => s.storeId)).toEqual(
      byDefault.merchants.list.map((s) => s.storeId),
    )

    const byDistance = await okData({ keyword: '老', sort: '距离' })
    const kms = byDistance.merchants.list.map((s) => Number.parseFloat(s.distanceText ?? 'Infinity'))
    expect(kms).toEqual([...kms].sort((a, b) => a - b))
  })

  it('SM-5 分页：默认 page=1&size=10；size=1 时两页不重复且 total 一致', async () => {
    const all = await okData({ keyword: '老' })
    expect(all.merchants.page).toBe(1)
    expect(all.merchants.size).toBe(10)
    expect(all.merchants.total).toBeGreaterThan(1)

    const p1 = await okData({ keyword: '老', page: 1, size: 1 })
    const p2 = await okData({ keyword: '老', page: 2, size: 1 })
    expect(p1.merchants.list).toHaveLength(1)
    expect(p2.merchants.list).toHaveLength(1)
    expect(p1.merchants.list[0].storeId).not.toBe(p2.merchants.list[0].storeId)
    expect(p1.merchants.total).toBe(all.merchants.total)
  })

  it('SM-6 非法入参 400：sort 非取值 / page 或 size 非正整数', async () => {
    for (const params of [
      { keyword: '', sort: '评分' },
      { keyword: '', page: 0 },
      { keyword: '', size: -1 },
      { keyword: '', size: 1.5 },
    ]) {
      const res = await search(params)
      expect(res.status, `参数 ${JSON.stringify(params)} 应 400`).toBe(400)
    }
  })

  it('SM-7 空关键词返回空列表（前端已拦截，替身不报错）', async () => {
    const data = await okData({ keyword: '   ' })
    expect(data.merchants.total).toBe(0)
    expect(data.products.total).toBe(0)
  })

  it('SM-8 无命中返回空列表且不返回 404（TC-SRC-006）', async () => {
    const res = await search({ keyword: '完全不存在的关键词xyz' })
    expect(res.status).toBe(200)
    expect((res.payload.data as SearchResult).merchants.total).toBe(0)
  })
})
