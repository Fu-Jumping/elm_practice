import { describe, expect, it } from 'vitest'
// 从测试工具箱里取出三样工具：分组(describe)、断言(expect)、用例(it)
import { formatMoney, formatTime, statusText, payableAmountText } from '../normalizers'
// 把被测函数引进来。'../normalizers' 是相对路径：测试文件在 __tests__ 里，往上一层就是它
describe('formatMoney 金额格式化', () => {
  // 这一组都在测金额格式化

  it('B1 小数金额补齐两位小数', () => {
    // 一条用例。it('场景描述', 一段检查代码)
    expect(formatMoney(12.5)).toBe('12.50')
    // 断言核心：expect(实际值).toBe(期望值)
  })
   it('B2 整数金额补零到两位小数', () => {
    expect(formatMoney(20)).toBe('20.00')
  })
})

describe('formatTime 时间格式化（架构约定 §3.3：yyyy-MM-dd HH:mm:ss 东八区）', () => {
  it('B3 ISO 时间转为 yyyy-MM-dd HH:mm:ss', () => {
    // 输入是后端常见的 ISO 写法：日期用 T 连接时间
    expect(formatTime('2026-09-04T10:30:00')).toBe('2026-09-04 10:30:00')
  })
})

describe('statusText 状态文案（契约：订单 P0 仅 PROCESSING）', () => {
  it('B4 订单状态 PROCESSING → 进行中', () => {
    expect(statusText('PROCESSING')).toBe('进行中')
  })

  it('B5 未知状态兜底：原样返回原始值（2026-09-04 拍板，避免页面出现空白）', () => {
    // 不认识的状态原样返回，绝不让页面显示空白
    expect(statusText('WHATEVER')).toBe('WHATEVER')
  })
})

// 订单实付金额展示归一化 T23–T25（2026-09-07，用例口径来自 TDD 规划矩阵 + PRD 7.4，AI 辅助脚手架）
// 依据：TC-ORD-011（金额以后端计算为准）、TC-ORD-021（实付 = 商品小计 + 打包费 2.00）、
// PRD 7.4（确认订单页金额行展示实付金额，含打包费，不单独列出打包费行）
// 口径：后端返回 payableAmount 时原样展示（两位小数）；缺失时按小计 + 打包费推导兜底；
// 全缺给 '0.00'，禁止 undefined/NaN 上屏（normalizers 既有约定）
describe('payableAmountText 实付金额展示（TC-ORD-011/021 展示侧）', () => {
  it('T23 后端返回实付金额 → 原样两位小数展示（后端计价为准）', () => {
    expect(payableAmountText({ itemsTotal: 39, packagingFee: 2, payableAmount: 41.5 })).toBe('41.50')
  })

  it('T24 后端未返回实付 → 按商品小计 + 打包费推导兜底', () => {
    expect(payableAmountText({ itemsTotal: 19.5, packagingFee: 2 })).toBe('21.50')
  })

  it('T25 全部缺失 → 返回 0.00，不产生 undefined/NaN（TC-ADR-006 前端侧同款兜底）', () => {
    expect(payableAmountText({})).toBe('0.00')
  })
})