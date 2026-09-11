/**
 * 「再来一单」编排（批次⑩ TODO-USER-008）
 * 口径出处：契约 §3.5「再来一单不新增接口：用户端按 GET /orders/{orderId} 明细重新调用
 * POST /cart/items；商品下架或库存不足时按 §3.4 规则拒绝并提示」+ PRD 6.1 功能清单「按历史订单重建购物车」。
 * 负责人确认口径（2026-09-11）：能加尽加——逐条加入，不可购的商品跳过并汇总提示；
 * 复制完成后由页面跳转商家详情页（不直接创建订单）。
 */
import { cartApi, orderApi } from '@/services/api'
import { normalizeOrderDetail } from '@/services/normalizers'

export interface ReorderResult {
  /** 成功加入购物车的商品行数 */
  added: number
  /** 不可购买的商品名（下架/售罄/库存不足等被 §3.4 拒绝） */
  failed: string[]
  /** 订单所属店铺（供页面跳转商家详情） */
  storeId: string
}

export async function reorderToCart(orderId: string): Promise<ReorderResult> {
  const detail = normalizeOrderDetail(await orderApi.getOrder(orderId))
  let added = 0
  const failed: string[] = []
  for (const item of detail.items) {
    try {
      // 按历史订单快照重建购物车行（后端会重读商品价格与上下架状态，前端只传数量）
      await cartApi.addCartItem({
        storeId: detail.storeId,
        productId: item.productId,
        quantity: item.quantity,
      })
      added += 1
    } catch {
      // 商品下架/售罄/库存不足等（契约 §3.4 拒绝）：跳过该件并汇总商品名
      failed.push(item.name)
    }
  }
  return { added, failed, storeId: detail.storeId }
}
