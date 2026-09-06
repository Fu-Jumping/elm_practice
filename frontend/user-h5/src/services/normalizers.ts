/**
 * 契约字段归一化（架构约定 §3.3）：金额/时间/状态枚举 → 展示形态的唯一出口
 * 单测必测对象（TDD 规划 §4.2）；缺字段给确定默认值，禁止多键名试探式解包
 * 本文件 9/4 起按 TDD 实现（测试场景由人设计，AI 只辅助脚手架）
 */

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
