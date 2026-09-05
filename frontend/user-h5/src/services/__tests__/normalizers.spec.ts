import { describe, expect, it } from 'vitest'
// 从测试工具箱里取出三样工具：分组(describe)、断言(expect)、用例(it)
import { formatMoney, formatTime, statusText } from '../normalizers'
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