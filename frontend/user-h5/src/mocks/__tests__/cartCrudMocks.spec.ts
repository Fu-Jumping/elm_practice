import { beforeEach, describe, expect, it } from 'vitest'
import { mockDispatch } from '../index'

/**
 * 购物车增改删 mock 行为测试 M11–M12（2026-09-07 第三批，口径来自 TDD 规划矩阵，AI 辅助脚手架）
 * M11 PATCH /cart/items/{cartLineId} 修改数量；quantity<=0 → 400（契约：数量必须大于 0，前端减到 0 改发 DELETE）
 * M12 DELETE /cart/items/{cartLineId} 删行；行不存在 → 404（TC-CRT-011 归属/存在口径）
 * 前置：加购 p101（m002）产生 cartLineId
 */
describe('购物车增改删 mock（契约 §3.4 后端替身行为）', () => {
  let cartLineId = ''

  beforeEach(async () => {
    cartLineId = ''
    const add = await mockDispatch({
      method: 'POST',
      url: '/cart/items',
      data: { storeId: 'm002', productId: 'p101', quantity: 2 },
    })
    const line = add.payload.data as Record<string, unknown>
    cartLineId = String(line.cartLineId)
  })

  it('M11 PATCH 修改数量成功；数量为 0 → 400（TC-CRT-004/005）', async () => {
    const patch = await mockDispatch({
      method: 'PATCH',
      url: `/cart/items/${cartLineId}`,
      data: { quantity: 5 },
    })
    expect(patch.status).toBe(200)
    const line = patch.payload.data as Record<string, unknown>
    expect(line.quantity).toBe(5)

    // 契约：数量必须大于 0；减到 0 由前端改为 DELETE
    const zero = await mockDispatch({
      method: 'PATCH',
      url: `/cart/items/${cartLineId}`,
      data: { quantity: 0 },
    })
    expect(zero.status).toBe(400)
  })

  it('M12 DELETE 删行成功且列表不再含该行；重复删除 → 404（TC-CRT-006/011）', async () => {
    const del = await mockDispatch({ method: 'DELETE', url: `/cart/items/${cartLineId}` })
    expect(del.status).toBe(200)

    const list = await mockDispatch({
      method: 'GET',
      url: '/cart',
      params: { storeId: 'm002' },
    })
    expect(list.payload.data).toEqual([])

    const again = await mockDispatch({ method: 'DELETE', url: `/cart/items/${cartLineId}` })
    expect(again.status).toBe(404)
    expect(again.payload.message).toContain('购物车行不存在')
  })
})
