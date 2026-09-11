import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cartApi, orderApi } from '@/services/api'
import { reorderToCart } from '../reorder'
import type { OrderRecord } from '@/services/api/types'

/**
 * 「再来一单」编排单元测试 TQ 组（批次⑩ TODO-USER-008）
 * 口径出处：契约 §3.5（不新增接口：按 GET /orders/{orderId} 明细逐条调 POST /cart/items；
 * 商品下架或库存不足时按 §3.4 规则拒绝并提示）+ PRD 6.1「再来一单：按历史订单重建购物车」。
 * 负责人确认口径（2026-09-11）：**能加尽加**——失败项跳过并汇总商品名，成功项照常入购物车。
 * 本组在 feat: 实现前必须红（脚手架见 chore: 提交）。
 */
vi.mock('@/services/api', () => ({
  orderApi: { getOrder: vi.fn() },
  cartApi: { addCartItem: vi.fn() },
}))

function reorderOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    orderId: 'op41',
    userId: 'u001',
    storeId: 'm002',
    remark: '',
    status: 'COMPLETED',
    createdAt: '2026-09-11 11:00:00',
    itemSubtotal: 39,
    packagingFee: 2,
    total: 41,
    items: [
      { productId: 'p101', name: '香辣鸡腿堡', unitPrice: 19.5, quantity: 2, subtotal: 39 },
      { productId: 'p999', name: '已下架商品', unitPrice: 9, quantity: 1, subtotal: 9 },
    ],
    ...overrides,
  }
}

describe('reorderToCart「再来一单」编排（批次⑩ TODO-USER-008）', () => {
  beforeEach(() => vi.clearAllMocks())

  it('TQ-5 逐条按订单快照加入购物车，不可购项汇总商品名（能加尽加）', async () => {
    vi.mocked(orderApi.getOrder).mockResolvedValue(reorderOrder() as never)
    vi.mocked(cartApi.addCartItem).mockImplementation((async ({ productId }: { productId: string }) => {
      if (productId === 'p999') throw new Error('商品已售罄或已下架')
      return {} as never
    }) as never)

    const result = await reorderToCart('op41')
    expect(cartApi.addCartItem).toHaveBeenCalledTimes(2)
    expect(cartApi.addCartItem).toHaveBeenCalledWith({ storeId: 'm002', productId: 'p101', quantity: 2 })
    expect(result.added).toBe(1)
    expect(result.failed).toEqual(['已下架商品'])
    expect(result.storeId).toBe('m002')
  })

  it('TQ-5b 全部加入成功时不返回失败项', async () => {
    vi.mocked(orderApi.getOrder).mockResolvedValue(
      reorderOrder({ items: [{ productId: 'p101', name: '香辣鸡腿堡', unitPrice: 19.5, quantity: 1, subtotal: 19.5 }] }) as never,
    )
    vi.mocked(cartApi.addCartItem).mockResolvedValue({} as never)
    const result = await reorderToCart('op41')
    expect(result.added).toBe(1)
    expect(result.failed).toEqual([])
  })
})
