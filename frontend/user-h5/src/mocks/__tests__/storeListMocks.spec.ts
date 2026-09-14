import { describe, expect, it } from 'vitest'
import { mockDispatch } from '../index'
import { STORES } from '../store'

/**
 * 店铺列表域 mock 行为测试（契约 §3.2 `GET /stores`，TODO-USER-107 ② 的替身）
 * 逐条对齐契约：可选参数 `keyword`、`categoryId`、`sort`（综合/销量/距离，默认综合）；
 * **列表成功返回数组、无结果返回空数组，不当作错误**（§1.3 列表约定，分页唯一例外是 §3.6 搜索）。
 * SLM-1 按 `categoryId` 收窄：只返回拥有该分类的店铺（分类来源为店铺自身 `categories`）
 * SLM-2 分类无匹配 → 返回空数组且不报错（不 404）
 * SLM-3 `keyword` 命中商家名或商品名
 * SLM-4 `sort` 三种取值语义（销量倒序 / 距离升序 / 综合=销量优先评分次之）
 * SLM-5 `sort` 非取值 → 400
 * SLM-6 不传参数时保持种子顺序（首页 `GET /stores` 现状不被本次改动改变）
 */

type Row = Record<string, unknown>

async function listStores(params?: Record<string, unknown>) {
  const res = await mockDispatch({ method: 'GET', url: '/stores', params })
  return res
}

function distanceOf(row: Row): number {
  return Number.parseFloat(String(row.distanceText ?? ''))
}

describe('店铺列表域 mock（契约 §3.2）', () => {
  it('SLM-1 按 categoryId 只返回拥有该分类的店铺', async () => {
    // 种子分类归属：m002 → c101/c102/c103（主食/小食/饮品）；其余店铺各自独立分类
    const res = await listStores({ categoryId: 'c101' })
    expect(res.status).toBe(200)
    const list = res.payload.data as Row[]
    expect(list.map((row) => row.storeId)).toEqual(['m002'])
  })

  it('SLM-2 分类无匹配 → 空数组且不报错（契约 §1.3：空列表不当作错误）', async () => {
    const res = await listStores({ categoryId: 'c99999' })
    expect(res.status).toBe(200)
    expect(res.payload.data).toEqual([])
  })

  it('SLM-3 keyword 命中商家名或商品名', async () => {
    const byName = await listStores({ keyword: '麦当劳' })
    expect((byName.payload.data as Row[]).map((row) => row.storeId)).toEqual(['m003'])

    // 商品名命中亦回带所属商家（m001 的「家常豆腐」）
    const byProduct = await listStores({ keyword: '家常豆腐' })
    expect((byProduct.payload.data as Row[]).map((row) => row.storeId)).toEqual(['m001'])

    const noHit = await listStores({ keyword: '不存在的店铺名' })
    expect(noHit.payload.data).toEqual([])
  })

  it('SLM-4 sort=销量 按月售倒序、sort=距离 按距离升序、sort=综合 销量优先评分次之', async () => {
    const bySales = (await listStores({ sort: '销量' })).payload.data as Row[]
    const sales = bySales.map((row) => Number(row.monthlySales))
    expect(sales).toEqual([...sales].sort((a, b) => b - a))

    const byDistance = (await listStores({ sort: '距离' })).payload.data as Row[]
    const distances = byDistance.map(distanceOf)
    expect(distances).toEqual([...distances].sort((a, b) => a - b))

    const byDefault = (await listStores({ sort: '综合' })).payload.data as Row[]
    const expected = [...STORES].sort(
      (a, b) => b.monthlySales - a.monthlySales || b.rating - a.rating,
    )
    expect(byDefault.map((row) => row.storeId)).toEqual(expected.map((store) => store.storeId))
  })

  it('SLM-5 sort 非取值 → 400', async () => {
    const res = await listStores({ sort: '评分' })
    expect(res.status).toBe(400)
  })

  it('SLM-6 不传参数时保持种子顺序（首页现状不被改变）', async () => {
    const res = await listStores()
    expect(res.status).toBe(200)
    expect((res.payload.data as Row[]).map((row) => row.storeId)).toEqual(
      STORES.map((store) => store.storeId),
    )
  })
})
