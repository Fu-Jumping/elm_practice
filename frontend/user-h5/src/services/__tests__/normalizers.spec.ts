import { describe, expect, it } from 'vitest'
// 从测试工具箱里取出三样工具：分组(describe)、断言(expect)、用例(it)
import {
  formatMoney,
  formatTime,
  statusText,
  payableAmountText,
  normalizeOrderSummary,
  normalizeOrderDetail,
} from '../normalizers'
import type { OrderRecord } from '../api/types'
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

// 订单记录归一化 N1–N3 + B6（2026-09-07 联调补，AI 设计落地、负责人已追认框架）
// 依据：真实后端 GET /orders 实际形状（扁平金额字段 itemSubtotal/packagingFee/total、
// address 对象、items 明细、无 storeName）与前端视图模型（嵌套 amounts 三件套）的差异归一；
// 架构约定 §3.3：后端字段 → 页面字段归一化的唯一出口是 normalizers，缺字段给确定默认值
const REAL_ORDER_RECORD: OrderRecord = {
  orderId: 'o1005',
  userId: 'u001',
  storeId: 'm002',
  addressId: 'da001',
  remark: 'less spicy',
  status: 'PENDING_PAYMENT',
  createdAt: '2026-09-07 13:25:04',
  itemSubtotal: 58.0,
  packagingFee: 2.0,
  total: 60.0,
  paidAt: null,
  address: {
    addressId: 'da001',
    contactName: '张同学',
    contactSex: '先生',
    contactPhone: '13800000001',
    region: '天津大学软件园校区',
    detail: '12号楼 304室',
    label: '学校',
    isDefault: true,
  },
  items: [
    { productId: 'p101', name: '吮指原味鸡', image: '', unitPrice: 29.0, quantity: 2, subtotal: 58.0 },
  ],
}

describe('statusText 支付扩展状态（契约 §3.5 P1 扩展，后端已实现）', () => {
  it('B6 PENDING_PAYMENT → 待支付（避免列表出现英文原文）', () => {
    expect(statusText('PENDING_PAYMENT')).toBe('待支付')
  })

  it('B7 COMPLETED → 已完成（后端种子含已完成订单，联调实测）', () => {
    expect(statusText('COMPLETED')).toBe('已完成')
  })
})

describe('normalizeOrderSummary 订单记录 → 视图模型', () => {
  it('N1 扁平金额字段归一为三件套并满足实付=小计+打包费（TC-ORD-022）', () => {
    const view = normalizeOrderSummary(REAL_ORDER_RECORD)
    expect(view.orderId).toBe('o1005')
    expect(view.status).toBe('PENDING_PAYMENT')
    expect(view.storeId).toBe('m002')
    expect(view.amounts).toEqual({ itemsTotal: 58, packagingFee: 2, payableAmount: 60 })
    expect(view.createdAt).toBe('2026-09-07 13:25:04')
  })

  it('N2 金额字段缺失 → 三件套兜底 0，不产生 undefined/NaN（缺字段确定性默认值约定）', () => {
    const view = normalizeOrderSummary({
      orderId: 'o0000',
      storeId: 'm001',
      status: 'PROCESSING',
      createdAt: '2026-09-07 00:00:00',
      remark: '',
      itemSubtotal: undefined as unknown as number,
      packagingFee: undefined as unknown as number,
      total: undefined as unknown as number,
    })
    expect(view.amounts).toEqual({ itemsTotal: 0, packagingFee: 0, payableAmount: 0 })
  })
})

describe('normalizeOrderDetail 订单详情归一（含明细与地址快照）', () => {
  it('N3 items 映射为明细快照、address 映射为地址快照（TC-ORD-002/016）', () => {
    const view = normalizeOrderDetail(REAL_ORDER_RECORD)
    expect(view.remark).toBe('less spicy')
    expect(view.items).toEqual([
      { productId: 'p101', name: '吮指原味鸡', unitPrice: 29, quantity: 2 },
    ])
    expect(view.addressSnapshot).toEqual({
      contactName: '张同学',
      contactPhone: '13800000001',
      region: '天津大学软件园校区',
      detail: '12号楼 304室',
    })
  })

  it('N3b 无 address/items 字段 → 空数组与空快照，不产生 undefined', () => {
    const view = normalizeOrderDetail({
      orderId: 'o0000',
      storeId: 'm001',
      status: 'PROCESSING',
      createdAt: '2026-09-07 00:00:00',
      remark: '',
      itemSubtotal: 10,
      packagingFee: 2,
      total: 12,
    })
    expect(view.items).toEqual([])
    expect(view.addressSnapshot).toEqual({ contactName: '', contactPhone: '', region: '', detail: '' })
  })
})