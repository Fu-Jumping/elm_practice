/**
 * 契约字段归一化（架构约定 §3.3）：金额/时间/状态枚举 → 展示形态的唯一出口
 * 单测必测对象（TDD 规划 §4.2）；缺字段给确定默认值，禁止多键名试探式解包
 * 本文件 9/4 起按 TDD 实现（测试场景由人设计，AI 只辅助脚手架）
 */

/** 金额：后端返回数字元，展示保留两位小数（契约：金额后端保留两位小数） */
export function formatMoney(_amount: number): string {
  // TODO(9/4 TDD)：实现金额格式化与测试
  throw new Error('formatMoney 待 9/4 TDD 实现')
}

/** 时间：统一 yyyy-MM-dd HH:mm:ss（东八区） */
export function formatTime(_input: string | number | Date): string {
  // TODO(9/4 TDD)：实现时间格式化与测试
  throw new Error('formatTime 待 9/4 TDD 实现')
}

/** 状态枚举 → 文案映射（如订单状态），值对齐契约枚举，禁止页面散落魔法数字 */
export function statusText(_status: string): string {
  // TODO(9/4 TDD)：按契约枚举实现映射与测试
  throw new Error('statusText 待 9/4 TDD 实现')
}
