import { describe, expect, it } from 'vitest'
import { mockDispatch } from '../index'

/**
 * 地址/订单域 mock 行为测试 M1–M4（2026-09-07，用例口径来自 TDD 规划矩阵，AI 辅助脚手架）
 * mock 是 P0 全链路联调期的"后端替身"，其行为必须逐条对齐后端契约：
 * M1 GET /me/addresses（TC-ADR-006：只返回当前用户地址，空则 []）
 * M2 POST /orders 缺 addressId → 400（TC-ORD-004）
 * M3 POST /orders addressId 不存在/不属于用户 → 404（TC-ORD-005）
 * M4 POST /orders 成功 → 后端重读购物车计价（TC-ORD-013）、实付 = 小计 + 打包费 2.00
 *    （TC-ORD-021）、返回订单号（TC-ORD-001）、成功后清空该店购物车（TC-ORD-003）
 * 口径：金额由 mock 后端重读商品价格计算，前端传入 expectedTotal 仅作一致性提示不作依据
 */
describe('地址/订单 mock（契约 §3.3/§3.5 后端替身行为）', () => {
  it('M1 查询地址返回种子列表且含默认地址（TC-ADR-006）', async () => {
    const res = await mockDispatch({ method: 'GET', url: '/me/addresses' })
    expect(res.status).toBe(200)
    const addresses = res.payload.data as Array<Record<string, unknown>>
    expect(Array.isArray(addresses)).toBe(true)
    const defaultAddress = addresses.find((item) => item.isDefault === true)
    expect(defaultAddress).toBeDefined()
    // 固定演示数据（契约 §2）：默认地址 = 天津大学北洋园校区，12号楼 304室
    expect(String(defaultAddress!.detail)).toContain('12号楼 304室')
  })

  it('M2 创建订单缺 addressId → 400（TC-ORD-004）', async () => {
    const res = await mockDispatch({
      method: 'POST',
      url: '/orders',
      data: { storeId: 'm002' },
    })
    expect(res.status).toBe(400)
  })

  it('M3 创建订单 addressId 不存在 → 404 且提示地址不存在（TC-ORD-005）', async () => {
    const res = await mockDispatch({
      method: 'POST',
      url: '/orders',
      data: { storeId: 'm002', addressId: 'da999' },
    })
    expect(res.status).toBe(404)
    // 防假绿：mock 未注册也返回 404（"mock 未定义"），必须断言业务提示区分真实校验路径
    expect(res.payload.message).toContain('地址不存在')
  })

  it('M4 创建订单成功：后端计价 46.00、返回订单号、清空该店购物车（TC-ORD-001/003/013/021/022）', async () => {
    // 先加购 p101 香辣鸡腿堡 ×2（单价 19.50 → 小计 39.00 + 打包费 2.00 + 配送费 5.00(m002) = 实付 46.00）
    const add = await mockDispatch({
      method: 'POST',
      url: '/cart/items',
      data: { storeId: 'm002', productId: 'p101', quantity: 2 },
    })
    expect(add.status).toBe(200)

    const res = await mockDispatch({
      method: 'POST',
      url: '/orders',
      data: { storeId: 'm002', addressId: 'da001', remark: '少放辣', expectedTotal: 46 },
    })
    expect(res.status).toBe(200)
    const order = res.payload.data as Record<string, unknown>
    expect(String(order.orderId)).toBeTruthy()
    // 后端重读购物车计价，实付 = 小计 + 打包费 + 配送费（契约 §3.5 定稿公式的无优惠退化口径）
    expect(order.total).toBe(46)
    expect(order.itemSubtotal).toBe(39)
    expect(order.packagingFee).toBe(2)
    // 金额快照新增 deliveryFee（契约 §3.5/§10.4 定稿命名，TC-ORD-022）
    expect(order.deliveryFee).toBe(5)

    // 事务成功后清空该用户该店购物车（TC-ORD-003）
    const cart = await mockDispatch({
      method: 'GET',
      url: '/cart',
      params: { storeId: 'm002' },
    })
    expect(cart.payload.data).toEqual([])
  })
})
