import { beforeEach, describe, expect, it } from 'vitest'
import { mockDispatch } from '../index'
import { FAVORITE_SEED, favoriteMockState } from '../favorite'

/**
 * 收藏域 mock 行为测试（契约 §3.7 后端替身行为，批次⑥ TODO-USER-006）
 * mock 是联调期的"后端替身"，行为逐条对齐契约：
 * FAM-1 列表按收藏时间倒序（契约 §3.7）
 * FAM-2 重复收藏同一商家幂等，不产生重复记录（TC-FAV-003）
 * FAM-3 缺 storeId → 400；storeId 不存在 → 404（TC-FAV-004 前端可校验部分）
 * FAM-4 取消**未被收藏**的商店幂等 200、不报错；storeId 本身不存在仍 404（契约 §3.7 2026-09-10 定稿、TC-FAV-002）
 */
describe('收藏域 mock（契约 §3.7 后端替身行为）', () => {
  beforeEach(() => {
    favoriteMockState.splice(0, favoriteMockState.length, ...FAVORITE_SEED.map((item) => ({ ...item })))
  })

  it('FAM-1 列表按收藏时间倒序返回收藏商家（契约 §3.7）', async () => {
    const res = await mockDispatch({ method: 'GET', url: '/me/favorites' })
    expect(res.status).toBe(200)
    const list = res.payload.data as Array<Record<string, unknown>>
    expect(list.length).toBe(FAVORITE_SEED.length)
    const times = list.map((item) => String(item.createdAt))
    expect(times).toEqual([...times].sort().reverse())
  })

  it('FAM-2 重复收藏同一商家幂等：返回收藏项且不产生重复记录（TC-FAV-003）', async () => {
    const first = await mockDispatch({ method: 'POST', url: '/me/favorites', data: { storeId: 'm001' } })
    expect(first.status).toBe(200)
    const again = await mockDispatch({ method: 'POST', url: '/me/favorites', data: { storeId: 'm001' } })
    expect(again.status).toBe(200)
    const list = await mockDispatch({ method: 'GET', url: '/me/favorites' })
    const items = list.payload.data as Array<Record<string, unknown>>
    expect(items.filter((item) => item.storeId === 'm001')).toHaveLength(1)
  })

  it('FAM-3 缺 storeId → 400；storeId 不存在 → 404（TC-FAV-004）', async () => {
    const missingField = await mockDispatch({ method: 'POST', url: '/me/favorites', data: {} })
    expect(missingField.status).toBe(400)
    const unknownStore = await mockDispatch({
      method: 'POST',
      url: '/me/favorites',
      data: { storeId: 'm999' },
    })
    expect(unknownStore.status).toBe(404)
  })

  it('FAM-4 取消未被收藏的商店幂等 200；storeId 不存在仍 404（TC-FAV-002）', async () => {
    // m001 是真实店铺但未收藏 → 幂等 200，不报错、不产生记录
    const idempotent = await mockDispatch({ method: 'DELETE', url: '/me/favorites/m001' })
    expect(idempotent.status).toBe(200)
    // m999 不是有效店铺 → 404
    const unknownStore = await mockDispatch({ method: 'DELETE', url: '/me/favorites/m999' })
    expect(unknownStore.status).toBe(404)
    // 取消已收藏的商店后从列表移除
    const removed = await mockDispatch({ method: 'DELETE', url: '/me/favorites/m002' })
    expect(removed.status).toBe(200)
    const list = await mockDispatch({ method: 'GET', url: '/me/favorites' })
    const items = list.payload.data as Array<Record<string, unknown>>
    expect(items.some((item) => item.storeId === 'm002')).toBe(false)
  })
})
