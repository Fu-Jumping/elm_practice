import { describe, expect, it } from 'vitest'
// 从测试工具箱里取出三样工具：分组(describe)、断言(expect)、用例(it)
import {
  formatMoney,
  formatTime,
  statusText,
  payableAmountText,
  normalizeOrderSummary,
  normalizeOrderDetail,
  buildAmountLines,
  remainingSeconds,
  formatCountdown,
  orderDisplayStatus,
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
// 依据：TC-ORD-011（金额以后端计算为准）、TC-ORD-021（实付 = 商品小计 + 打包费 + 配送费）、
// PRD 7.4 与契约 §3.5（金额明细「基础四行 + 优惠项按实际发生展示」，2026-09-11 定稿 CHG-004）
// 口径：后端返回 payableAmount 时原样展示（两位小数）；缺失时按小计 + 打包费 + 配送费推导兜底；
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

  // TA-5（批次① TODO-USER-001）：配送费计入实付兜底（CHG-004 定稿公式的无优惠退化口径）
  it('TA-5 实付兜底含配送费；配送费缺失或为 0 按 0 计', () => {
    expect(payableAmountText({ itemsTotal: 39, packagingFee: 2, deliveryFee: 5 })).toBe('46.00')
    expect(payableAmountText({ itemsTotal: 39, packagingFee: 2, deliveryFee: 0 })).toBe('41.00')
    expect(payableAmountText({ itemsTotal: 39, packagingFee: 2 })).toBe('41.00')
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

/**
 * 批次⑩ OD-N 组（TODO-USER-104，2026-09-11；口径：契约 §3.5 + CHG-003/CHG-004 + PRD 7.6）
 * 测试场景由负责人确认后由 AI 落地脚手架（TDD 纪律）；本组在 feat: 实现前必须红。
 * OD-N1 statusText 补 CANCELLED → 已取消（契约 §3.5「前端需补齐 CANCELLED 文案映射」/ TODO-USER-009）
 * OD-N2 详情归一化透传配送费与优惠快照（TC-ORD-022 CHG-004 口径）
 * OD-N3 详情归一化透传取消字段（契约 §3.5 取消成功响应新增字段）
 * OD-N4 金额明细行构造：基础四行恒显示 + 优惠项非 0 各一行 + 顺序固定（CHG-004 定稿）
 */
const OD_ORDER_RECORD: OrderRecord = {
  orderId: 'od10',
  userId: 'u001',
  storeId: 'm002',
  addressId: 'da001',
  remark: '',
  status: 'COOKING',
  createdAt: '2026-09-11 12:00:00',
  itemSubtotal: 39,
  packagingFee: 2,
  deliveryFee: 3,
  fullReductionAmount: 5,
  couponAmount: 3,
  total: 36,
  paidAt: '2026-09-11 12:01:00',
  cancelReason: '地址填错了',
  cancelledAt: '2026-09-11 12:10:00',
  cancelledBy: 'USER',
  address: {
    addressId: 'da001',
    contactName: '张同学',
    contactSex: '男',
    contactPhone: '13800000001',
    region: '天津大学软件园校区',
    detail: '4号楼',
    label: '学校',
    isDefault: true,
  },
  items: [{ productId: 'p101', name: '香辣鸡腿堡', unitPrice: 19.5, quantity: 2, subtotal: 39 }],
}

describe('批次⑩ 订单详情扩展归一化 OD-N（CHG-003/004）', () => {
  it('OD-N1 statusText CANCELLED → 已取消（契约 §3.5 前端需补齐）', () => {
    expect(statusText('CANCELLED')).toBe('已取消')
  })

  it('OD-N2 详情透传配送费与优惠快照（deliveryFee/discounts，CHG-004）', () => {
    const view = normalizeOrderDetail(OD_ORDER_RECORD)
    expect(view.deliveryFee).toBe(3)
    expect(view.discounts).toEqual([
      { key: 'full-reduction', label: '满减优惠', amount: 5 },
      { key: 'coupon', label: '红包优惠', amount: 3 },
    ])
  })

  it('OD-N3 详情透传取消字段（cancelReason/cancelledAt，契约 §3.5）', () => {
    const view = normalizeOrderDetail(OD_ORDER_RECORD)
    expect(view.cancelReason).toBe('地址填错了')
    expect(view.cancelledAt).toBe('2026-09-11 12:10:00')
  })

  it('OD-N4 金额明细行：基础四行恒显示 + 优惠非 0 各一行 + 顺序固定（CHG-004）', () => {
    const lines = buildAmountLines({
      itemsTotal: 39,
      packagingFee: 2,
      deliveryFee: 3,
      discounts: [
        { key: 'full-reduction', label: '满减优惠', amount: 5 },
        { key: 'coupon', label: '红包优惠', amount: 3 },
      ],
      payableAmount: 36,
    })
    expect(lines.map((line) => line.label)).toEqual([
      '商品小计',
      '打包费',
      '配送费',
      '满减优惠',
      '红包优惠',
      '实付金额',
    ])
    // 配送费为 0 时仍显示 ¥0.00（基础四行恒显示）
    const zeroDelivery = buildAmountLines({
      itemsTotal: 39,
      packagingFee: 2,
      deliveryFee: 0,
      discounts: [],
      payableAmount: 41,
    })
    expect(zeroDelivery.find((line) => line.key === 'delivery-fee')?.text).toBe('¥0.00')
    // 优惠未发生（金额 0）不生成行；优惠行为负数品牌橙（kind=discount）
    const noDiscount = buildAmountLines({
      itemsTotal: 39,
      packagingFee: 2,
      deliveryFee: 3,
      discounts: [
        { key: 'full-reduction', label: '满减优惠', amount: 0 },
        { key: 'coupon', label: '红包优惠', amount: 0 },
      ],
      payableAmount: 44,
    })
    expect(noDiscount.filter((line) => line.kind === 'discount')).toEqual([])
    expect(lines.find((line) => line.key === 'coupon')?.text).toBe('−¥3.00')
    expect(lines.find((line) => line.key === 'payable')?.kind).toBe('payable')
  })
})
/**
 * 批次⑩ 105 TD-12 组（TODO-USER-105，2026-09-11；契约 §3.5 待支付倒计时）
 * 测试场景由负责人确认（倒计时归零仅前端禁用，不回查后端）后由 AI 落地脚手架；本组在 feat: 前必须红。
 * TD-12a 详情归一化透传 payDeadline（支付页倒计时数据源）
 * TD-12b remainingSeconds：未到期返回剩余秒数；到点/过期/缺失/非法一律 0
 * TD-12c formatCountdown：mm:ss 补零、负数按 0、分钟位不截断上限
 */
const PAY_DEADLINE_RECORD: OrderRecord = {
  ...OD_ORDER_RECORD,
  status: 'PENDING_PAYMENT',
  payDeadline: '2026-09-11 12:15:00',
}

describe('批次⑩ 待支付倒计时 TD-12（契约 §3.5 payDeadline）', () => {
  it('TD-12a 详情归一化透传 payDeadline', () => {
    expect(normalizeOrderDetail(PAY_DEADLINE_RECORD).payDeadline).toBe('2026-09-11 12:15:00')
  })

  it('TD-12b remainingSeconds：剩余秒数 / 到点 / 过期 / 缺失 / 非法', () => {
    expect(remainingSeconds('2026-09-11 12:15:00', new Date('2026-09-11 12:00:00'))).toBe(900)
    expect(remainingSeconds('2026-09-11 12:15:00', new Date('2026-09-11 12:15:00'))).toBe(0)
    expect(remainingSeconds('2026-09-11 12:15:00', new Date('2026-09-11 12:20:00'))).toBe(0)
    expect(remainingSeconds(null, new Date('2026-09-11 12:00:00'))).toBe(0)
    expect(remainingSeconds(undefined, new Date('2026-09-11 12:00:00'))).toBe(0)
    expect(remainingSeconds('not-a-date', new Date('2026-09-11 12:00:00'))).toBe(0)
  })

  it('TD-12c formatCountdown：mm:ss 格式与边界', () => {
    expect(formatCountdown(899)).toBe('14:59')
    expect(formatCountdown(900)).toBe('15:00')
    expect(formatCountdown(59)).toBe('00:59')
    expect(formatCountdown(0)).toBe('00:00')
    expect(formatCountdown(-5)).toBe('00:00')
    expect(formatCountdown(3661)).toBe('61:01')
  })
})

/**
 * 批次⑩ 评价相关归一化 TV-11（TODO-USER-003，契约 §3.5/§6.2）
 * TV-11a 摘要/详情透传 reviewed（待评价判定依据，非独立存储状态）
 * TV-11b orderDisplayStatus：已完成未评价显示「待评价」，已评价显示「已完成」，其余回落 statusText
 */
describe('批次⑩ 评价相关归一化 TV-11', () => {
  it('TV-11a 摘要与详情透传 reviewed', () => {
    const record: OrderRecord = { ...OD_ORDER_RECORD, status: 'COMPLETED', reviewed: false }
    expect(normalizeOrderSummary(record).reviewed).toBe(false)
    expect(normalizeOrderDetail(record).reviewed).toBe(false)
    expect(normalizeOrderDetail({ ...record, reviewed: true }).reviewed).toBe(true)
  })

  it('TV-11b orderDisplayStatus：待评价/已完成与其余状态回落', () => {
    expect(orderDisplayStatus({ status: 'COMPLETED', reviewed: false })).toBe('待评价')
    expect(orderDisplayStatus({ status: 'COMPLETED', reviewed: true })).toBe('已完成')
    expect(orderDisplayStatus({ status: 'PENDING' })).toBe('待接单')
    expect(orderDisplayStatus({ status: 'CANCELLED' })).toBe('已取消')
  })
})

/**
 * 批次⑩ 打磨：订单状态文案全覆盖（TODO-USER-009）
 * 口径：契约 §3.5 全部状态值（含 CANCELLED）都要有中文展示文案，页面不得出现英文原文；
 * 「已完成未评价」按 003 引入的 reviewed 判定展示为「待评价」。
 */
describe('批次⑩ 打磨：订单状态文案全覆盖（TODO-USER-009）', () => {
  it('T09 全部状态值均有中文映射且不出现英文原文', () => {
    const cases: Array<[string, string]> = [
      ['PENDING_PAYMENT', '待支付'],
      ['PENDING', '待接单'],
      ['COOKING', '制作中'],
      ['DELIVERING', '配送中'],
      ['COMPLETED', '已完成'],
      ['CANCELLED', '已取消'],
      ['PROCESSING', '进行中'],
    ]
    for (const [raw, text] of cases) {
      expect(statusText(raw)).toBe(text)
      expect(statusText(raw)).not.toContain('_')
    }
    expect(orderDisplayStatus({ status: 'COMPLETED', reviewed: false })).toBe('待评价')
    expect(orderDisplayStatus({ status: 'COMPLETED', reviewed: true })).toBe('已完成')
  })
})
