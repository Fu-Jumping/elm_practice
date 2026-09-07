import { beforeEach, describe, expect, it } from 'vitest'
import { mockDispatch } from '../index'
import { ORDER_SEED, orderMockState } from '../order'

/**
 * 订单查询 mock 行为测试 M9–M10（2026-09-07 第二批，口径来自 TDD 规划矩阵，AI 辅助脚手架）
 * M9 GET /orders 按创建时间倒序、支持 status 筛选（TC-ORD-013）
 * M10 GET /orders/{orderId} 详情含明细与金额快照三件套（TC-ORD-016/022）；不存在 → 404（TC-ORD-015）
 * 口径：P0 订单状态仅 PROCESSING；订单创建时持久化（第一批 M4 锁创建，本批锁查询侧）
 */
describe('订单查询 mock（契约 §3.5 后端替身行为）', () => {
  beforeEach(() => {
    orderMockState.splice(0, orderMockState.length, ...ORDER_SEED.map((item) => ({ ...item })))
  })

  it('M9 订单列表按创建时间倒序，status 筛选生效（TC-ORD-013）', async () => {
    const res = await mockDispatch({ method: 'GET', url: '/orders' })
    expect(res.status).toBe(200)
    const orders = res.payload.data as Array<Record<string, unknown>>
    expect(orders).toHaveLength(2)
    // 倒序：最新创建（o0002，11:30）在前
    expect(orders[0]!.orderId).toBe('o0002')
    expect(orders[1]!.orderId).toBe('o0001')

    // P0 仅 PROCESSING：筛选命中返回全部，其他状态返回空
    const processing = await mockDispatch({
      method: 'GET',
      url: '/orders',
      params: { status: 'PROCESSING' },
    })
    expect(processing.payload.data).toHaveLength(2)
    const none = await mockDispatch({
      method: 'GET',
      url: '/orders',
      params: { status: 'COMPLETED' },
    })
    expect(none.payload.data).toEqual([])
  })

  it('M10 订单详情含商品明细与金额快照；不存在 → 404（TC-ORD-015/016/022）', async () => {
    const res = await mockDispatch({ method: 'GET', url: '/orders/o0002' })
    expect(res.status).toBe(200)
    const order = res.payload.data as Record<string, unknown>
    expect(order.orderId).toBe('o0002')
    expect(order.status).toBe('PROCESSING')

    // 商品明细快照（不跟随改价；形状对齐真实后端：含 unitPrice/subtotal）
    const items = order.items as Array<Record<string, unknown>>
    expect(items).toHaveLength(1)
    expect(items[0]!.name).toBe('巨无霸')
    expect(items[0]!.unitPrice).toBe(25.5)
    expect(items[0]!.quantity).toBe(1)

    // 金额快照（扁平字段，2026-09-07 对齐真实后端形状）：total = itemSubtotal + packagingFee（TC-ORD-022）
    expect(order.itemSubtotal).toBe(25.5)
    expect(order.packagingFee).toBe(2)
    expect(order.total).toBe(27.5)

    // 地址快照（address 对象，收货信息来自下单时快照）
    const address = order.address as Record<string, unknown>
    expect(address.contactName).toBe('张同学')
    expect(address.detail).toContain('304室')

    // 不存在 → 404（TC-ORD-015）
    const missing = await mockDispatch({ method: 'GET', url: '/orders/o9999' })
    expect(missing.status).toBe(404)
    expect(missing.payload.message).toContain('订单不存在')
  })
})
