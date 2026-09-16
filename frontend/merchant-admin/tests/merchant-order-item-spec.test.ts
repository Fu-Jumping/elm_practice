import { describe, expect, it } from 'vitest'
import { orderItemSpecText } from '../src/merchantRules'

/**
 * 订单明细「规格」列（SRS §5.10 FR-MORD-01「订单详情：顾客信息、商品明细（名称、规格、数量、单价）、备注、优惠明细、金额」；
 * §5.13 FR-MSKU-01「订单明细保留规格快照」）。
 * 背景：后端订单接口已返回规格快照 specOptions（如 [{name:'大份',priceDelta:3}]），前端明细表此前未渲染该列，
 * 导致同一订单里两行同名商品（老北京鸡肉卷 ¥18.00 / ¥15.00）看不出规格差异，商家无法核对。
 */
describe('订单明细规格文案（规格列渲染口径）', () => {
  it('单个规格取选项名；多个规格用顿号连接（顺序与快照一致）', () => {
    expect(orderItemSpecText({ specOptions: [{ name: '大份', priceDelta: 3 }] })).toBe('大份')
    expect(
      orderItemSpecText({
        specOptions: [
          { name: '大份', priceDelta: 3 },
          { name: '加辣', priceDelta: 0 },
        ],
      }),
    ).toBe('大份、加辣')
  })

  it('无规格 / 字段缺失 / 名称为空白时返回空串，不出现 undefined', () => {
    expect(orderItemSpecText({})).toBe('')
    expect(orderItemSpecText({ specOptions: undefined })).toBe('')
    expect(orderItemSpecText({ specOptions: [] })).toBe('')
    expect(orderItemSpecText({ specOptions: [{ name: '   ', priceDelta: 0 }] })).toBe('')
    expect(orderItemSpecText({ specOptions: [{ name: '', priceDelta: 0 }] })).toBe('')
  })

  it('过滤掉空名称但保留其余规格（半成品数据不整行丢弃）', () => {
    expect(
      orderItemSpecText({
        specOptions: [{ name: '', priceDelta: 0 }, { name: '标准', priceDelta: 0 }],
      }),
    ).toBe('标准')
  })
})
