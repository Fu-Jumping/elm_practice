import { describe, expect, it } from 'vitest'
import { mockDispatch } from '../index'
import { ORDER_SEED, orderMockState } from '../order'
import { clearMockCart } from '../cart'

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

  it('M4 创建订单成功：后端七步计价 39.00、返回订单号、清空该店购物车（TC-ORD-001/003/013/021/022）', async () => {
    // 先加购 p101 香辣鸡腿堡 ×2（单价 19.50 → 小计 39.00）
    // 七步计价（m002 种子：满 20 减 2、满 40 减 5、新客 3、满 30 免配送费）：
    // 39.00 − 满减 2.00 − 新客 0（u001 在 m002 已有种子订单 o0001，非首单）+ 配送费 5.00
    // − 配送费优惠 5.00（小计 ≥ 门槛 30）+ 打包费 2.00 = 39.00
    const add = await mockDispatch({
      method: 'POST',
      url: '/cart/items',
      data: { storeId: 'm002', productId: 'p101', quantity: 2 },
    })
    expect(add.status).toBe(200)

    const res = await mockDispatch({
      method: 'POST',
      url: '/orders',
      data: { storeId: 'm002', addressId: 'da001', remark: '少放辣', expectedTotal: 39 },
    })
    expect(res.status).toBe(200)
    const order = res.payload.data as Record<string, unknown>
    expect(String(order.orderId)).toBeTruthy()
    // 后端重读购物车行计价，金额快照逐字段与 PRD 7.4 七步顺序一致（契约 §3.5/§10.4）
    expect(order.total).toBe(39)
    expect(order.itemSubtotal).toBe(39)
    expect(order.packagingFee).toBe(2)
    expect(order.deliveryFee).toBe(5)
    expect(order.fullReductionAmount).toBe(2)
    expect(order.deliveryFeeDiscount).toBe(5)
    expect(order.newCustomerAmount).toBe(0)
    expect(order.memberDiscountAmount).toBe(0)
    expect(order.couponAmount).toBe(0)

    // 事务成功后清空该用户该店购物车（TC-ORD-003）
    const cart = await mockDispatch({
      method: 'GET',
      url: '/cart',
      params: { storeId: 'm002' },
    })
    expect(cart.payload.data).toEqual([])
  })
})

/**
 * PR 七步组（批次① 计价替身镜像，2026-09-12）
 * 出处：PRD 7.4「计算顺序」七步与演示数值、契约 §3.5「优惠计价接入下单」、
 * 后端 `PricingService.java`（批次①，PR #48）与 `backend/database/seed/seed.sql` 的
 * `promotions`/`promotion_tiers` 种子（仅 m002：满 20 减 2、满 40 减 5、新客 3、满 30 免配送费、会员 95 折）。
 * 口径：替身是"后端替身"，金额必须与真实后端一致；前端 `expectedTotal` 只作提示不参与计价。
 */
describe('订单计价 mock（PRD 7.4 七步顺序，镜像后端 PricingService）', () => {
  /** 每条用例重灌订单种子与购物车（订单态是模块级内存态，避免跨用例互相影响） */
  function resetState(): void {
    orderMockState.splice(0, orderMockState.length, ...ORDER_SEED.map((item) => ({ ...item })))
    clearMockCart('m002')
    clearMockCart('m003')
  }

  async function createOrder(storeId: string, productId: string, quantity: number) {
    const add = await mockDispatch({
      method: 'POST',
      url: '/cart/items',
      data: { storeId, productId, quantity },
    })
    expect(add.status).toBe(200)
    const res = await mockDispatch({
      method: 'POST',
      url: '/orders',
      data: { storeId, addressId: 'da001', expectedTotal: 0 },
    })
    expect(res.status).toBe(200)
    return res.payload.data as Record<string, unknown>
  }

  it('PR-1 满减取"满足门槛的最大档"且两档不叠加（小计 58.50 → 满 40 减 5）', async () => {
    resetState()
    // p101 香辣鸡腿堡 19.50 × 3 = 58.50（同时满足满 20 与满 40，取最大档 5.00 而非 2.00）
    const order = await createOrder('m002', 'p101', 3)
    expect(order.itemSubtotal).toBe(58.5)
    expect(order.fullReductionAmount).toBe(5)
    // 58.50 − 5 + 配送费 5 − 配送费优惠 5（≥ 门槛 30）+ 打包费 2 = 55.50
    expect(order.total).toBe(55.5)
  })

  it('PR-2 未达任何门槛时不产生优惠（小计 9.00 → 无满减、无免配送费）', async () => {
    resetState()
    const order = await createOrder('m002', 'p105', 1) // 九珍果汁 9.00
    expect(order.itemSubtotal).toBe(9)
    expect(order.fullReductionAmount).toBe(0)
    expect(order.deliveryFeeDiscount).toBe(0)
    // 9.00 + 配送费 5.00 + 打包费 2.00 = 16.00
    expect(order.total).toBe(16)
  })

  it('PR-3 免配送费门槛基数为原始商品小计（不扣满减，TC-PRV-005）', async () => {
    resetState()
    // 小计 39.00（满 20 减 2 后 37.00 仍 ≥ 30，故仍免配送费；门槛判定用的是原始小计 39.00）
    const order = await createOrder('m002', 'p101', 2)
    expect(order.deliveryFee).toBe(5)
    expect(order.deliveryFeeDiscount).toBe(5)
    expect(order.total).toBe(39)
  })

  it('PR-4 该店首单应用新客立减 3.00；已有订单则不再立减', async () => {
    resetState()
    // 先清空历史订单 → 该店首单（镜像后端 countByUserAndStore == 0 的判定）
    orderMockState.splice(0, orderMockState.length)
    const first = await createOrder('m002', 'p101', 2)
    expect(first.newCustomerAmount).toBe(3)
    // 39.00 − 满减 2.00 − 新客 3.00 + 5.00 − 5.00 + 2.00 = 36.00
    expect(first.total).toBe(36)
    // 同一用户该店已有订单（上一笔已入库）→ 第二笔不再享新客立减
    await mockDispatch({ method: 'POST', url: '/cart/items', data: { storeId: 'm002', productId: 'p101', quantity: 2 } })
    const second = await mockDispatch({
      method: 'POST',
      url: '/orders',
      data: { storeId: 'm002', addressId: 'da001' },
    })
    const secondOrder = second.payload.data as Record<string, unknown>
    expect(secondOrder.newCustomerAmount).toBe(0)
    expect(secondOrder.total).toBe(39)
  })

  it('PR-5 无优惠配置的店铺不产生任何优惠行（m003：仅小计 + 打包费 + 配送费）', async () => {
    resetState()
    const order = await createOrder('m003', 'p204', 1) // 巨无霸 25.50
    expect(order.itemSubtotal).toBe(25.5)
    expect(order.fullReductionAmount).toBe(0)
    expect(order.newCustomerAmount).toBe(0)
    expect(order.memberDiscountAmount).toBe(0)
    expect(order.couponAmount).toBe(0)
    expect(order.deliveryFeeDiscount).toBe(0)
    expect(order.total).toBe(32.5)
  })
})
