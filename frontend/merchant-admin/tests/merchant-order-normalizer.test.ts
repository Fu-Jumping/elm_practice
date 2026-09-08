/**
 * BUG-20260908-010 回归测试（TDD 红）：商家端订单归一化对齐真实后端形状
 *
 * 真实后端（MySQL 迁移后）GET /merchant/orders 的订单形状：
 * 扁平金额 itemSubtotal/packagingFee/total；顾客信息嵌在 address.contactName/contactPhone；
 * 状态含 COMPLETED 等英文枚举。
 * 当前 normalizeOrder 只认 totalAmount/goodsAmount 等旧别名，导致页面金额 ¥0.00、
 * 顾客「暂无」、地址 [object Object]、状态显示原始英文。
 *
 * fixture 直接取自 2026-09-08 真实接口响应（与 user-h5 白屏回归锁同口径）。
 * 预期首次运行失败（红）；字段与状态映射补齐后转绿。修复时不得删除或放宽断言。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { normalizeOrder } from '../src/services/merchantApi'
import { orderStatusLabel } from '../src/App'

/** 2026-09-08 真实接口 GET /merchant/orders 首条响应原样快照 */
const REAL_ORDER = {
  orderId: 'o1001',
  userId: 'u001',
  storeId: 'm002',
  addressId: 'da001',
  remark: '少放辣',
  status: 'PROCESSING',
  createdAt: '2026-09-07 19:57:50',
  itemSubtotal: 29.0,
  packagingFee: 2.0,
  total: 31.0,
  paidAt: '2026-09-07 19:57:50',
  address: {
    addressId: null,
    contactName: '张同学',
    contactSex: '先生',
    contactPhone: '13800000001',
    region: '天津大学软件园校区',
    detail: '12号楼 304室',
    label: '学校',
    isDefault: true,
    updatedAt: null,
  },
}

beforeEach(async () => {
  // normalizeOrder 为纯函数；session 仅用于保持与既有测试一致的上下文
})

describe('商家端订单归一化（BUG-20260908-010）', () => {
  it('扁平金额字段应映射为商品合计与实付', () => {
    const order = normalizeOrder(REAL_ORDER)
    expect(order.productTotal).toBe(29)
    expect(order.totalAmount).toBe(31)
    expect(order.packagingFee).toBe(2)
  })

  it('顾客姓名与电话应从 address 快照中展平', () => {
    const order = normalizeOrder(REAL_ORDER)
    expect(order.customerName).toBe('张同学')
    expect(order.contactPhone).toBe('13800000001')
  })

  it('配送地址应展平为可读文本，而非 [object Object]', () => {
    const order = normalizeOrder(REAL_ORDER)
    expect(order.address).toBe('天津大学软件园校区 12号楼 304室')
  })

  it('状态枚举应翻译为中文文案', () => {
    expect(orderStatusLabel('PROCESSING')).toBe('进行中')
    expect(orderStatusLabel('COMPLETED')).toBe('已完成')
    expect(orderStatusLabel('PENDING_PAYMENT')).toBe('待支付')
    expect(orderStatusLabel('CANCELLED')).toBe('已取消')
  })
})
