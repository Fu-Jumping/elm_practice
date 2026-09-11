/**
 * 订单域 mock（契约 §3.5 后端替身，2026-09-07 起对齐真实后端响应形状）
 * 与真实后端一致的扁平字段：itemSubtotal/packagingFee/total、address 对象、items 明细、
 * 无 storeName（店名由前端按 storeId 映射，缺口与真实后端保持一致）
 * 口径对齐后端职责（TC-ORD-001/003/004/005/013/015/016/021/022）：
 * - 缺 storeId/addressId → 400；addressId 不存在/不属于当前用户 → 按安全需要统一返回不存在（404）
 * - 金额后端重读购物车行计价：实付 = 商品小计 + 打包费 2.00；前端 expectedTotal 仅作一致性提示
 * - 创建成功持久化订单（含商品/地址/金额快照与创建时间）并清空该店购物车（TC-ORD-003）
 * - GET /orders 按创建时间倒序、支持 status 筛选（TC-ORD-013）；GET /orders/{orderId} 详情含明细（TC-ORD-016）
 * 状态口径：种子数据保持 P0 纯度仅 PROCESSING（历史数据兼容，详情页按等价档位展示）；
 * 新建订单自 2026-09-11（批次⑩ 支付页）起对齐契约 §3.5 定稿状态机——创建成功即 PENDING_PAYMENT
 * 并附带 payDeadline（= 创建时间 + 15 分钟），使「下单 → 支付页 → 模拟支付」链路在 mock 下可完整走通。
 */
import { PACKAGING_FEE, formatTime, remainingSeconds } from '@/services/normalizers'
import type { OrderRecord } from '@/services/api/types'
import { addressMockState } from './address'
import { clearMockCart, getMockCartSnapshot } from './cart'
import type { MockHandler } from './index'
import { fail, ok } from './index'

/** 订单内存态（查询侧数据源；导出供测试隔离重灌，与 addressMockState 同风格） */
export type MockOrder = OrderRecord

/** 待支付时长（契约 §3.5：payDeadline = createdAt + 15 分钟） */
const PAY_DEADLINE_MINUTES = 15

export const ORDER_SEED: MockOrder[] = [
  {
    orderId: 'o0001',
    userId: 'u001',
    storeId: 'm002',
    addressId: 'da001',
    remark: '少放辣',
    status: 'PROCESSING',
    createdAt: '2026-09-07 10:00:00',
    itemSubtotal: 39,
    packagingFee: 2,
    total: 41,
    address: {
      addressId: 'da001',
      contactName: '张同学',
      contactSex: '男',
      contactPhone: '13800000001',
      region: '天津大学北洋园校区',
      detail: '12号楼 304室',
      label: '学校',
      isDefault: true,
    },
    items: [{ productId: 'p101', name: '香辣鸡腿堡', unitPrice: 19.5, quantity: 2, subtotal: 39 }],
  },
  {
    orderId: 'o0002',
    userId: 'u001',
    storeId: 'm003',
    addressId: 'da001',
    remark: '',
    status: 'PROCESSING',
    createdAt: '2026-09-07 11:30:00',
    itemSubtotal: 25.5,
    packagingFee: 2,
    total: 27.5,
    address: {
      addressId: 'da001',
      contactName: '张同学',
      contactSex: '男',
      contactPhone: '13800000001',
      region: '天津大学北洋园校区',
      detail: '12号楼 304室',
      label: '学校',
      isDefault: true,
    },
    items: [{ productId: 'p301', name: '巨无霸', unitPrice: 25.5, quantity: 1, subtotal: 25.5 }],
  },
]

export const orderMockState: MockOrder[] = ORDER_SEED.map((item) => ({ ...item }))

let orderSeq = ORDER_SEED.length + 1

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
    const itemsTotal = Number(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0).toFixed(2))
    const total = Number((itemsTotal + PACKAGING_FEE).toFixed(2))
    void expectedTotal // 一致性提示字段：mock 后端不采信，仅后端计价口径生效

    const orderId = `o${String(orderSeq++).padStart(4, '0')}`
    const items = lines.map((line) => ({
      productId: line.productId,
      name: line.name,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      subtotal: Number((line.unitPrice * line.quantity).toFixed(2)),
    }))
    const order: MockOrder = {
      orderId,
      userId: 'u001',
      storeId,
      addressId,
      remark: remark ?? '',
      // 契约 §3.5 定稿：创建成功即待支付（PROCESSING 仅作为 P0 阶段历史状态保留）
      status: 'PENDING_PAYMENT',
      createdAt: new Date().toISOString(),
      // 待支付倒计时（契约 §3.5）：payDeadline = createdAt + 15 分钟，前端据此倒计时
      payDeadline: new Date(Date.now() + PAY_DEADLINE_MINUTES * 60 * 1000).toISOString(),
      itemSubtotal: itemsTotal,
      packagingFee: PACKAGING_FEE,
      total,
      address: { ...address },
      items: items.map((item) => ({ ...item })),
    }
    orderMockState.push(order)
    // 事务成功后清空该用户该店购物车（TC-ORD-003）
    clearMockCart(storeId)
    return ok({ ...order, items: items.map((item) => ({ ...item })) })
  },

  'GET /orders': ({ params }) => {
    const status = typeof params?.status === 'string' ? params.status : ''
    const filtered = status
      ? orderMockState.filter((order) => order.status === status)
      : [...orderMockState]
    // 按创建时间倒序（TC-ORD-013）；响应形状与真实后端一致（扁平 OrderRecord，非视图模型）
    const sorted = filtered.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    return ok(sorted.map((order) => ({ ...order, items: (order.items ?? []).map((item) => ({ ...item })) })))
  },

  'GET /orders/:orderId': ({ params }) => {
    const order = orderMockState.find((item) => item.orderId === params?.orderId)
    if (!order) return fail(404, 40400, '订单不存在')
    return ok({ ...order, items: (order.items ?? []).map((item) => ({ ...item })) })
  },

  /**
   * 模拟支付（契约 §3.5，批次⑩ 支付页）
   * - success=true：待支付订单 → `PENDING`（待接单）并记录 `paidAt`；已过 `payDeadline` 返回 409（超时不回补库存）
   * - success=false：模拟失败，订单保持 `PENDING_PAYMENT`（前端据此进入支付失败页）
   * - 幂等：非待支付状态重复请求直接返回当前订单，不二次变更状态（契约 §3.5 / §7）
   */
  'POST /orders/:orderId/payment': ({ params, data }) => {
    const order = orderMockState.find((item) => item.orderId === params?.orderId)
    if (!order) return fail(404, 40400, '订单不存在')
    const copy = { ...order, items: (order.items ?? []).map((item) => ({ ...item })) }
    if (order.status !== 'PENDING_PAYMENT') return ok(copy)
    const success = (data as { success?: boolean } | undefined)?.success === true
    if (!success) return ok(copy)
    if (remainingSeconds(order.payDeadline, new Date()) <= 0) {
      return fail(409, 40900, '支付已超时，订单已失效')
    }
    order.status = 'PENDING'
    order.paidAt = formatTime(new Date())
    return ok({ ...order, items: (order.items ?? []).map((item) => ({ ...item })) })
  },

  /**
   * 用户取消订单（契约 §3.5，批次⑩ TODO-USER-002）
   * - reason 必填且 1–50 字：缺失/全空白/超长 → 400
   * - 仅 `PENDING_PAYMENT`（未支付）与 `PENDING`（已支付未接单）可取消；`COOKING` 及之后 → 409
   * - 已是 `CANCELLED` 幂等返回当前订单（HTTP 200），不重复回补库存
   * - 成功：状态置 `CANCELLED` 并写入 cancelReason/cancelledAt/cancelledBy=USER（订单与金额快照保留）
   *   库存回补：mock 不维护库存，真实后端在取消事务内按明细回补（契约 §7），此处以注释标注口径
   */
  'POST /orders/:orderId/cancel': ({ params, data }) => {
    const order = orderMockState.find((item) => item.orderId === params?.orderId)
    if (!order) return fail(404, 40400, '订单不存在')
    const copy = { ...order, items: (order.items ?? []).map((item) => ({ ...item })) }
    if (order.status === 'CANCELLED') return ok(copy)
    const reason = String((data as { reason?: string } | undefined)?.reason ?? '').trim()
    if (reason.length < 1 || reason.length > 50) {
      return fail(400, 40000, '取消原因必填且不超过 50 字')
    }
    if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PENDING') {
      return fail(409, 40900, '商家已接单，无法取消')
    }
    order.status = 'CANCELLED'
    order.cancelReason = reason
    order.cancelledAt = formatTime(new Date())
    order.cancelledBy = 'USER'
    return ok({ ...order, items: (order.items ?? []).map((item) => ({ ...item })) })
  },
}
