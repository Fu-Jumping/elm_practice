import type { Order, PromotionConfig, PromotionTier } from './services/merchantApi'

/** 订单状态文案：覆盖后端 Domain.OrderStatus 全部枚举（新增状态须同步此处） */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: '待支付',
  PENDING: '待接单',
  COOKING: '制作中',
  DELIVERING: '配送中',
  PROCESSING: '进行中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
}

/** 状态枚举 → 中文文案；未知状态保持原样 */
export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status
}

/** 统计/分布数据的状态名本地化（保留原数值与顺序，未知名称不丢数据） */
export function localizeStatusDistribution<T extends { name: string }>(items: T[]): T[] {
  return items.map((item) => ({ ...item, name: orderStatusLabel(item.name) }))
}

const PRODUCT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024

export interface OrderAmountRow {
  key: string
  label: string
  amount: number
  discount?: boolean
  total?: boolean
}

function finiteNonNegative(value: unknown, label: string) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error(`${label}必须是不小于 0 的数值。`)
  }
  return numberValue
}

export function preparePromotionConfig(input: PromotionConfig): PromotionConfig {
  const tiers: PromotionTier[] = input.fullReductions.map((tier) => {
    const threshold = finiteNonNegative(tier.threshold, '满减门槛')
    const amount = finiteNonNegative(tier.amount, '满减金额')
    if (amount > threshold) throw new Error('减额不能超过门槛。')
    return { threshold, amount }
  })

  const thresholds = tiers.map((tier) => tier.threshold)
  if (new Set(thresholds).size !== thresholds.length) throw new Error('满减阶梯门槛不能重复。')

  const memberDiscountRate = Number(input.memberDiscountRate)
  if (!Number.isFinite(memberDiscountRate) || memberDiscountRate <= 0 || memberDiscountRate > 1) {
    throw new Error('会员折扣率须大于 0 且不超过 1。')
  }

  const freeDeliveryThreshold = finiteNonNegative(input.freeDeliveryThreshold, '免配送费门槛')
  if (input.freeDeliveryEnabled && freeDeliveryThreshold <= 0) {
    throw new Error('启用配送费优惠时，免配送费门槛须大于 0。')
  }

  return {
    ...input,
    newCustomerAmount: finiteNonNegative(input.newCustomerAmount, '新客立减金额'),
    freeDeliveryThreshold: input.freeDeliveryEnabled ? freeDeliveryThreshold : 0,
    memberDiscountRate,
    fullReductions: tiers
      .sort((left, right) => left.threshold - right.threshold)
      .map((tier, index) => ({ ...tier, sortOrder: index + 1 })),
  }
}

export function validateProductImage(file: File): string | undefined {
  if (file.size === 0) return '商品图片不能为空文件。'
  if (!PRODUCT_IMAGE_TYPES.has(file.type)) return '仅支持 jpg、jpeg、png、webp 图片。'
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) return '商品图片不能超过 2MB。'
  return undefined
}

export function buildOrderAmountRows(order: Order): OrderAmountRow[] {
  const rows: OrderAmountRow[] = [
    { key: 'productTotal', label: '商品小计', amount: order.productTotal },
    { key: 'packagingFee', label: '打包费', amount: order.packagingFee },
    { key: 'deliveryFee', label: '配送费', amount: order.deliveryFee },
  ]
  const discounts: Array<[string, string, number | undefined]> = [
    ['fullReductionAmount', '满减优惠', order.fullReductionAmount],
    ['newCustomerAmount', '新客立减', order.newCustomerAmount],
    ['memberDiscountAmount', '会员折扣', order.memberDiscountAmount],
    ['couponAmount', '红包抵扣', order.couponAmount],
    ['deliveryFeeDiscount', '配送费优惠', order.deliveryFeeDiscount],
  ]
  discounts.forEach(([key, label, amount]) => {
    if (Number(amount) !== 0) rows.push({ key, label, amount: Number(amount), discount: true })
  })
  rows.push({ key: 'totalAmount', label: '实付金额', amount: order.totalAmount, total: true })
  return rows
}
