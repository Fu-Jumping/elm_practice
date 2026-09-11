/**
 * 契约字段归一化（架构约定 §3.3）：金额/时间/状态枚举 → 展示形态的唯一出口
 * 单测必测对象（TDD 规划 §4.2）；缺字段给确定默认值，禁止多键名试探式解包
 * 本文件 9/4 起按 TDD 实现（测试场景由人设计，AI 只辅助脚手架）
 */
import type { OrderAmountLine, OrderDetail, OrderDiscountItem, OrderRecord, OrderSummary } from '@/services/api/types'

/** 金额：后端返回数字元，展示保留两位小数（契约：金额后端保留两位小数） */
export function formatMoney(amount: number): string {
  // TODO(9/4 TDD)：实现金额格式化与测试
  // toFixed(2)：JS 自带方法，干两件事——四舍五入到 2 位 + 不足补零
  // 12.5 → '12.50'（B1），20 → '20.00'（B2），正好是 B1/B2 要的
  return amount.toFixed(2)
}

/** 时间：统一 yyyy-MM-dd HH:mm:ss（东八区） */
export function formatTime(input: string | number | Date): string {
  // TODO(9/4 TDD)：实现时间格式化与测试
  const date = new Date(input)
  // padStart(2, '0')：一位数前面补 0（9 月 → '09'），不然输出 '2026-9-4 10:30:00' 就不合规范了
  const pad = (n: number): string => String(n).padStart(2, '0')
  // 不用 toLocaleString 是因为它在不同机器上输出可能不一样，手动拼接保证结果永远一致
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

/** 状态枚举 → 文案映射（如订单状态），值对齐契约枚举，禁止页面散落魔法数字 */
const STATUS_TEXT_MAP: Record<string, string> = {
  PROCESSING: '进行中',
  // 后端已实现支付扩展状态机（联调实测 2026-09-07）：创建订单即进入待支付
  PENDING_PAYMENT: '待支付',
  PENDING: '待接单',
  COOKING: '制作中',
  DELIVERING: '配送中',
  // 后端种子数据含已完成状态订单（联调实测 2026-09-07）
  COMPLETED: '已完成',
  // 批次⑩（契约 §3.5「前端需补齐 PENDING/COOKING/DELIVERING/CANCELLED 文案映射」）
  CANCELLED: '已取消',
}

export function statusText(status: string): string {
  // TODO(9/4 TDD)：按契约枚举实现映射与测试
  // ?? 叫"空值合并"：左边取不到值（映射里没有这个键）时用右边的兜底
  // B4：PROCESSING 查表 → '进行中'；B5：WHATEVER 查不到 → 原样返回（你拍板的口径）
  return STATUS_TEXT_MAP[status] ?? status
}

/** 打包费固定 2.00 元（PRD 7.4 2026-09-01 评审决议演示口径，与后端计价规则一致） */
export const PACKAGING_FEE = 2

export interface PayableAmountInput {
  itemsTotal?: number
  packagingFee?: number
  payableAmount?: number
}

/**
 * 实付金额展示归一化（TC-ORD-011/021 展示侧，PRD 7.4）：实付 = 商品小计 + 打包费
 * 口径：后端返回 payableAmount 时原样展示（后端计价为准）；缺失时按小计 + 打包费推导兜底；
 * 全缺给 '0.00'，禁止 undefined/NaN 上屏（normalizers 既有约定）
 */
export function payableAmountText(input: PayableAmountInput): string {
  const { itemsTotal, packagingFee, payableAmount } = input
  if (typeof payableAmount === 'number' && Number.isFinite(payableAmount)) {
    return payableAmount.toFixed(2)
  }
  if (typeof itemsTotal === 'number' && Number.isFinite(itemsTotal)) {
    const fee = typeof packagingFee === 'number' && Number.isFinite(packagingFee) ? packagingFee : 0
    return (itemsTotal + fee).toFixed(2)
  }
  return '0.00'
}

/**
 * 订单记录归一化（2026-09-07 联调对齐）：后端 GET /orders 实际形状（扁平金额字段、
 * address 对象、无 storeName）→ 前端视图模型（OrderSummary/OrderDetail）
 * 架构约定 §3.3：归一化唯一出口；缺字段给确定默认值，禁止 undefined 上屏
 */
function toFiniteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** 扁平金额字段 → 三件套视图模型（itemSubtotal/total → itemsTotal/payableAmount） */
export function normalizeOrderSummary(raw: OrderRecord): OrderSummary {
  return {
    orderId: raw.orderId,
    status: raw.status,
    storeId: raw.storeId,
    storeName: '',
    amounts: {
      itemsTotal: toFiniteNumber(raw.itemSubtotal),
      packagingFee: toFiniteNumber(raw.packagingFee),
      payableAmount: toFiniteNumber(raw.total),
    },
    createdAt: raw.createdAt,
  }
}

/** 详情：补明细快照与地址快照映射（无字段时空数组/空快照兜底） */
export function normalizeOrderDetail(raw: OrderRecord): OrderDetail {
  return {
    ...normalizeOrderSummary(raw),
    remark: raw.remark ?? '',
    items: (raw.items ?? []).map((item) => ({
      productId: item.productId,
      name: item.name,
      unitPrice: toFiniteNumber(item.unitPrice),
      quantity: item.quantity,
    })),
    addressSnapshot: {
      contactName: raw.address?.contactName ?? '',
      contactPhone: raw.address?.contactPhone ?? '',
      region: raw.address?.region ?? '',
      detail: raw.address?.detail ?? '',
    },
    // 批次⑩（契约 §3.5/§10.4 定稿字段 + CHG-004）：配送费缺省按 0（店铺可配、未配置按 0）
    deliveryFee: toFiniteNumber(raw.deliveryFee),
    discounts: buildDiscounts(raw),
    cancelReason: raw.cancelReason ?? '',
    cancelledAt: raw.cancelledAt ?? null,
    // 待支付截止时间（契约 §3.5）：支付页倒计时数据源，缺失表示不可支付（页面据此禁用支付按钮）
    payDeadline: raw.payDeadline ?? null,
  }
}

/**
 * 优惠项定义（顺序固定为 CHG-004 定稿：满减优惠 → 红包优惠 → 其他优惠）
 * key 供页面 data-key 与测试挂钩；field 为契约 §10.4 定稿快照字段名
 */
const DISCOUNT_DEFINITIONS: Array<{
  key: OrderDiscountItem['key']
  label: string
  field: keyof OrderRecord
}> = [
  { key: 'full-reduction', label: '满减优惠', field: 'fullReductionAmount' },
  { key: 'coupon', label: '红包优惠', field: 'couponAmount' },
  { key: 'new-customer', label: '新客立减', field: 'newCustomerAmount' },
  { key: 'member-discount', label: '会员折扣', field: 'memberDiscountAmount' },
  { key: 'delivery-fee-discount', label: '配送费优惠', field: 'deliveryFeeDiscount' },
]

/**
 * 优惠项提取（CHG-004）：金额非 0 才生成行，未发生不显示；顺序按 DISCOUNT_DEFINITIONS 固定
 * 边界：快照可能为负数口径差异 → 取绝对值展示，页面统一按「品牌橙负号」呈现
 */
export function buildDiscounts(raw: OrderRecord): OrderDiscountItem[] {
  const discounts: OrderDiscountItem[] = []
  for (const { key, label, field } of DISCOUNT_DEFINITIONS) {
    const amount = toFiniteNumber(raw[field])
    if (amount !== 0) {
      discounts.push({ key, label, amount: Math.abs(amount) })
    }
  }
  return discounts
}

/**
 * 金额明细行构造（CHG-004 定稿口径，批次⑩ TODO-USER-104）：
 * 基础四行恒显示（商品小计/打包费/配送费 0 仍显示/实付金额），优惠项金额非 0 各占一行
 * 品牌橙负数、未发生不显示；顺序固定 商品小计→打包费→配送费→满减→红包→其他→实付。
 * 断言见 normalizers.spec OD-N4；本行为确认订单页/订单详情页/支付页三处共用口径的唯一出口。
 */
export function buildAmountLines(input: {
  itemsTotal: number
  packagingFee: number
  deliveryFee?: number
  discounts?: OrderDiscountItem[]
  payableAmount: number
}): OrderAmountLine[] {
  const lines: OrderAmountLine[] = [
    { key: 'items-total', label: '商品小计', text: `¥${formatMoney(toFiniteNumber(input.itemsTotal))}`, kind: 'base' },
    { key: 'packaging', label: '打包费', text: `¥${formatMoney(toFiniteNumber(input.packagingFee))}`, kind: 'base' },
    // 配送费为 0 时仍显示 ¥0.00（基础四行恒显示，2026-09-11 定稿）
    { key: 'delivery-fee', label: '配送费', text: `¥${formatMoney(toFiniteNumber(input.deliveryFee))}`, kind: 'base' },
  ]
  for (const discount of input.discounts ?? []) {
    if (toFiniteNumber(discount.amount) === 0) continue
    lines.push({
      key: discount.key,
      label: discount.label,
      // 优惠行以品牌橙负数展示（−¥5.00），绝对值取金额快照
      text: `−¥${formatMoney(Math.abs(toFiniteNumber(discount.amount)))}`,
      kind: 'discount',
    })
  }
  lines.push({
    key: 'payable',
    label: '实付金额',
    text: `¥${formatMoney(toFiniteNumber(input.payableAmount))}`,
    kind: 'payable',
  })
  return lines
}

/**
 * 待支付剩余秒数（契约 §3.5 `payDeadline` = createdAt + 15 分钟；支付页倒计时数据源）
 * 口径：缺失/非法时间/已过期一律返回 0（调用方据此显示「已失效」并禁用支付）
 */
export function remainingSeconds(deadline: string | null | undefined, now: Date = new Date()): number {
  if (!deadline) return 0
  const end = new Date(deadline)
  if (Number.isNaN(end.getTime())) return 0
  const diff = Math.floor((end.getTime() - now.getTime()) / 1000)
  return diff > 0 ? diff : 0
}

/**
 * 倒计时文本 mm:ss（支付页倒计时卡大字；负数按 0 处理，分钟位不设上限）
 */
export function formatCountdown(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`
}
