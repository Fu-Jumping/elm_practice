/**
 * 订单域 mock（契约 §3.5 后端替身，P0 最小集）
 * 口径对齐后端职责（TC-ORD-004/005/013/021）：
 * - 缺 storeId/addressId → 400；addressId 不存在/不属于当前用户 → 按安全需要统一返回不存在（404）
 * - 金额后端重读购物车行计价：实付 = 商品小计 + 打包费 2.00；前端 expectedTotal 仅作一致性提示
 * - 创建成功返回订单号并清空该店购物车（TC-ORD-003，事务成功的 mock 等价行为）
 * P0 订单状态仅 PROCESSING；列表/详情接口待订单页任务接入（9/7 第一批仅锁创建侧）
 */
import { PACKAGING_FEE } from '@/services/normalizers'
import { addressMockState } from './address'
import { clearMockCart, getMockCartSnapshot } from './cart'
import type { MockHandler } from './index'
import { fail, ok } from './index'

let orderSeq = 1

export const orderMocks: Record<string, MockHandler> = {
  'POST /orders': ({ data }) => {
    const { storeId, addressId, remark, expectedTotal } = (data ?? {}) as {
      storeId?: string
      addressId?: string
      remark?: string
      expectedTotal?: number
    }
    if (!storeId || !addressId) {
      return fail(400, 40000, '缺少店铺或收货地址')
    }
    // 地址归属校验：当前用户地址列表外的一律不存在（TC-ORD-005，防跨用户探测）
    const address = addressMockState.find((item) => item.addressId === addressId)
    if (!address) {
      return fail(404, 40400, '地址不存在')
    }
    // 后端重读购物车行计价（TC-ORD-013）：购物车为空时不能创建订单
    const lines = getMockCartSnapshot(storeId)
    if (lines.length === 0) {
      return fail(409, 40900, '购物车为空，无法创建订单')
    }
    const itemsTotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
    const payableAmount = Number((itemsTotal + PACKAGING_FEE).toFixed(2))
    void expectedTotal // 一致性提示字段：mock 后端不采信，仅后端计价口径生效

    const orderId = `o${String(orderSeq++).padStart(4, '0')}`
    clearMockCart(storeId)
    return ok({ orderId, payableAmount, remark: remark ?? '' })
  },
}
