/**
 * 订单域 mock（契约 §3.5 后端替身，2026-09-07 起对齐真实后端响应形状）
 * 与真实后端一致的扁平字段：itemSubtotal/packagingFee/total、address 对象、items 明细、
 * 无 storeName（店名由前端按 storeId 映射，缺口与真实后端保持一致）
 * 口径对齐后端职责（TC-ORD-001/003/004/005/013/015/016/021/022）：
 * - 缺 storeId/addressId → 400；addressId 不存在/不属于当前用户 → 按安全需要统一返回不存在（404）
 * - 金额后端重读购物车行计价，**按 PRD 7.4 七步顺序**（`priceOrder` 逐行镜像后端 `PricingService`）：
 *   满减取最大满足档 → 新客立减（该店首单）→ 免配送费门槛（基数=原始小计）→ 会员折扣（本期为非会员）
 *   → 红包（前端选择未接入，恒 0）→ 实付且不小于 0；快照含 `deliveryFee` 与优惠各字段（契约 §3.5/§10.4）
 * - 创建成功持久化订单（含商品/地址/金额快照与创建时间）并清空该店购物车（TC-ORD-003）
 * - GET /orders 按创建时间倒序、支持 status 筛选（TC-ORD-013）；GET /orders/{orderId} 详情含明细（TC-ORD-016）
 * 与真实后端的两处已知差异（2026-09-12 对接核对，均已登记，替身按契约先行）：
 * - `payDeadline`（待支付倒计时）与 `reviewed`（待评价判定）：契约 §3.5 已定稿，**真实后端尚未返回**
 *   （`ViewMapper.order` 无这两个字段，且后端待办未登记）。替身按契约返回，使前端功能可测；
 *   前端在字段缺失时按「只隐藏对应字段」降级（`reviewed` 缺失不误标「待评价」，见 normalizers 注释）。
 * 状态口径：种子数据保持 P0 纯度仅 PROCESSING（历史数据兼容，详情页按等价档位展示）；
 * 新建订单自 2026-09-11（批次⑩ 支付页）起对齐契约 §3.5 定稿状态机——创建成功即 PENDING_PAYMENT
 * 并附带 payDeadline（= 创建时间 + 15 分钟），使「下单 → 支付页 → 模拟支付」链路在 mock 下可完整走通。
 */
import { PACKAGING_FEE, formatTime, remainingSeconds } from '@/services/normalizers'
import type { CouponRecord, OrderRecord } from '@/services/api/types'
import { addressMockState } from './address'
import { clearMockCart, getMockCartSnapshot } from './cart'
import type { MockHandler } from './index'
import { fail, ok } from './index'
import { findMockStore } from './store'
import { couponMockState, formatDateTime } from './coupon'

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
    // 七步计价（m002 配置了优惠）：小计 39 − 满减 2（满 20 档；未达满 40）− 新客 0（非该店首单）
    // + 配送费 5 − 配送费优惠 5（小计 ≥ 免配送门槛 30）+ 打包费 2 = 39.00
    deliveryFee: 5,
    fullReductionAmount: 2,
    deliveryFeeDiscount: 5,
    total: 39,
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
    // 契约 §3.5 口径补充：真实后端尚未返回该字段（见文件头差异说明），替身按契约先行返回
    reviewed: false,
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
    // m003 无优惠配置（种子仅 m002 有 promotions 行）→ 无满减/免配送费：25.50 + 打包费 2.00 + 配送费 5.00 = 32.50
    deliveryFee: 5,
    total: 32.5,
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
    reviewed: false,
  },
]

export const orderMockState: MockOrder[] = ORDER_SEED.map((item) => ({ ...item }))

let orderSeq = ORDER_SEED.length + 1

/**
 * 店铺优惠配置（镜像后端 `promotions` + `promotion_tiers` 种子，backend/database/seed/seed.sql 第 72–77 行）：
 * 仅 m002 配置了优惠——满 20 减 2、满 40 减 5、新客立减 3、满 30 免配送费、会员 95 折；
 * 其余店铺无配置行 → 后端 PromoConfig 默认值（enabled=false、新客 0、免配送门槛 0、会员折扣率 1）即不优惠。
 * 与后端 `Domain.PromoConfig` 默认值逐字段一致（enabled/newUserAmount/freeDeliveryThreshold/memberDiscountRate）。
 */
interface PromoTier {
  threshold: number
  amount: number
}

interface PromoConfig {
  enabled: boolean
  tiers: PromoTier[]
  newUserAmount: number
  freeDeliveryThreshold: number
  memberDiscountRate: number
}

const PROMO_SEED: Record<string, PromoConfig> = {
  m002: {
    enabled: true,
    tiers: [
      { threshold: 20, amount: 2 },
      { threshold: 40, amount: 5 },
    ],
    newUserAmount: 3,
    freeDeliveryThreshold: 30,
    memberDiscountRate: 0.95,
  },
}

function promoOf(storeId: string): PromoConfig {
  return (
    PROMO_SEED[storeId] ?? {
      enabled: false,
      tiers: [],
      newUserAmount: 0,
      freeDeliveryThreshold: 0,
      memberDiscountRate: 1,
    }
  )
}

/** 计价结果：与契约金额快照字段一一对应（镜像后端 `PricingService.Result`） */
interface PriceResult {
  itemSubtotal: number
  packagingFee: number
  deliveryFee: number
  fullReductionAmount: number
  newCustomerAmount: number
  memberDiscountAmount: number
  couponAmount: number
  deliveryFeeDiscount: number
  total: number
}

/**
 * 优惠计价七步（**镜像后端 `PricingService.price`，逐行对齐**）：
 * 出处 PRD 7.4 七步顺序 + 契约 §3.5「优惠计价接入下单」+ 后端 `PricingService.java`（批次①，PR #48）。
 * ① 商品小计（调用方传入）→ ② 满减（enabled 时取"满足门槛的最大档"，两档不叠加）
 * → ③ 新客立减（该店首单且配置 > 0）→ ④ 配送费优惠（免配送门槛基数 = **原始商品小计**，满足则免全额配送费）
 * → ⑤ 会员折扣（作用于商品小计；本期后端 `isMember` 恒传 false，会员批次未接入）
 * → ⑥ 用户红包（一单一红包；前端红包选择未接入，当前恒 0）
 * → ⑦ 实付 = 小计 − 满减 − 新客 − 会员折扣 − 红包 + 配送费 − 配送费优惠 + 打包费，且**不小于 0**（超额优惠截断）。
 * 全部金额按两位小数（后端 setScale(2)）。
 */
function priceOrder(input: {
  itemSubtotal: number
  deliveryFee: number
  storeId: string
  isNewCustomer: boolean
  isMember?: boolean
  couponAmount?: number
}): PriceResult {
  const round2 = (value: number): number => Number(value.toFixed(2))
  const cfg = promoOf(input.storeId)
  const itemSubtotal = round2(input.itemSubtotal)
  const deliveryFee = round2(input.deliveryFee)

  // ② 满减：取满足「小计 ≥ 门槛」的最大档
  let fullReductionAmount = 0
  if (cfg.enabled) {
    let best: PromoTier | null = null
    for (const tier of cfg.tiers) {
      if (itemSubtotal >= tier.threshold && (best === null || tier.threshold > best.threshold)) best = tier
    }
    if (best) fullReductionAmount = round2(best.amount)
  }
  // ③ 新客立减（店铺新用户首单）
  const newCustomerAmount =
    input.isNewCustomer && cfg.newUserAmount > 0 ? round2(cfg.newUserAmount) : 0
  // ④ 配送费优惠：门槛基数用原始商品小计（不扣满减/折扣，TC-PRV-005）
  const deliveryFeeDiscount =
    cfg.freeDeliveryThreshold > 0 && itemSubtotal >= cfg.freeDeliveryThreshold ? deliveryFee : 0
  // ⑤ 会员折扣：本期后端恒传非会员（memberPrice 与会员折扣归会员批次）
  const memberDiscountAmount =
    input.isMember && cfg.memberDiscountRate > 0 && cfg.memberDiscountRate < 1
      ? round2(itemSubtotal * (1 - cfg.memberDiscountRate))
      : 0
  // ⑥ 用户红包（前端红包选择未接入 → 0）
  const couponAmount = round2(input.couponAmount ?? 0)
  // ⑦ 实付且不小于 0
  const raw =
    itemSubtotal -
    fullReductionAmount -
    newCustomerAmount -
    memberDiscountAmount -
    couponAmount +
    deliveryFee -
    deliveryFeeDiscount +
    round2(PACKAGING_FEE)
  return {
    itemSubtotal,
    packagingFee: round2(PACKAGING_FEE),
    deliveryFee,
    fullReductionAmount,
    newCustomerAmount,
    memberDiscountAmount,
    couponAmount,
    deliveryFeeDiscount,
    total: raw < 0 ? 0 : round2(raw),
  }
}

/** 当前时间文本（东八区 `yyyy-MM-dd HH:mm:ss` 口径，用于红包有效期窗口判定） */
function nowText(): string {
  return formatDateTime(new Date())
}

/** 是否该店新客：镜像后端 `orders.countByUserAndStore(userId, storeId) == 0` */
function isNewCustomerAt(storeId: string): boolean {
  return !orderMockState.some((order) => order.storeId === storeId)
}

export const orderMocks: Record<string, MockHandler> = {
  /**
   * 计价预览（契约 §3.5 `POST /orders/preview`，CHG-006）：确认订单页在下单前取后端七步计价结果。
   * 只读：不落订单、不清购物车、不扣库存；复用 `priceOrder`（与 `POST /orders` 同一口径，避免两套算法）；
   * 空购物车按后端口径返回 400。
   */
  'POST /orders/preview': ({ data }) => {
    const { storeId } = (data ?? {}) as { storeId?: string }
    if (!storeId) return fail(400, 40000, '缺少店铺')
    const lines = getMockCartSnapshot(storeId)
    if (lines.length === 0) return fail(400, 40000, '购物车为空')
    const itemsTotal = Number(
      lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0).toFixed(2),
    )
    const deliveryFee = findMockStore(storeId)?.deliveryFee ?? 0
    return ok(
      priceOrder({
        itemSubtotal: itemsTotal,
        deliveryFee,
        storeId,
        isNewCustomer: isNewCustomerAt(storeId),
        couponAmount: 0,
      }),
    )
  },

  'POST /orders': ({ data }) => {
    const { storeId, addressId, remark, expectedTotal, couponId } = (data ?? {}) as {
      storeId?: string
      addressId?: string
      remark?: string
      expectedTotal?: number
      couponId?: unknown
    }
    // 一单一红包（契约 §3.8 / TC-CPN-004）：请求体只允许一个 couponId
    if (Array.isArray(couponId)) {
      return fail(400, 40000, '一单只能使用一个红包')
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
    // 配送费取店铺配置，未配置/店铺缺失按 0（契约 §3.5：配送费默认 3.00、店铺可配、未配置按 0）
    const deliveryFee = findMockStore(storeId)?.deliveryFee ?? 0
    // 红包选用（契约 §3.8）：后端重新校验门槛/适用范围/有效期/归属并锁定，一单一红包（七步第 ⑥ 步）
    let couponAmount = 0
    let lockedCoupon: CouponRecord | undefined
    if (typeof couponId === 'string' && couponId.trim()) {
      const coupon = couponMockState.find((item) => item.couponId === couponId.trim())
      if (!coupon) return fail(404, 40400, '红包不存在')
      const inWindowNow = coupon.validFrom <= nowText() && coupon.validTo >= nowText()
      if (coupon.used || !inWindowNow) return fail(409, 40900, '红包已使用或已过期')
      if (coupon.scope === 'STORE' && coupon.storeId !== storeId) {
        return fail(400, 40000, '红包不适用于当前店铺')
      }
      if (itemsTotal < coupon.threshold) return fail(400, 40000, '未满足红包使用门槛')
      couponAmount = coupon.amount
      lockedCoupon = coupon
    }
    // 七步计价（镜像后端 PricingService；前端 expectedTotal 只作一致性提示，不参与计价）
    const price = priceOrder({
      itemSubtotal: itemsTotal,
      deliveryFee,
      storeId,
      isNewCustomer: isNewCustomerAt(storeId),
      couponAmount,
    })
    const total = price.total
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
      itemSubtotal: price.itemSubtotal,
      packagingFee: price.packagingFee,
      deliveryFee: price.deliveryFee,
      // 优惠项快照（契约 §3.5/§10.4 定稿字段，CHG-004 按实际发生展示）
      fullReductionAmount: price.fullReductionAmount,
      newCustomerAmount: price.newCustomerAmount,
      memberDiscountAmount: price.memberDiscountAmount,
      couponAmount: price.couponAmount,
      deliveryFeeDiscount: price.deliveryFeeDiscount,
      total,
      address: { ...address },
      items: items.map((item) => ({ ...item })),
    }
    orderMockState.push(order)
    // 红包核销：与订单在同一事务内（替身按核销后置表示；真实后端为条件更新，并发下同一券只成功一次）
    if (lockedCoupon) lockedCoupon.used = true
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
    // 超时判定基准（契约 §3.5）：真实后端由 `createdAt` + 15 分钟派生，**不依赖 `payDeadline` 字段是否返回**；
    // 替身原先直接用 `payDeadline`（缺失 → remainingSeconds 返回 0 → 误判超时），与后端不一致，2026-09-14 修正。
    const createdMs = Date.parse(String(order.createdAt).replace(' ', 'T'))
    const deadlineMs = order.payDeadline
      ? Date.parse(String(order.payDeadline).replace(' ', 'T'))
      : createdMs + 15 * 60 * 1000
    if (Number.isFinite(deadlineMs) && deadlineMs - Date.now() <= 0) {
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
