import { describe, expect, it } from 'vitest'
import type { Order, PromotionConfig } from '../src/services/merchantApi'
import { buildOrderAmountRows, preparePromotionConfig, validateProductImage } from '../src/merchantRules'

const promotion: PromotionConfig = {
  enabled: true,
  fullReductions: [{ threshold: 40, amount: 5 }, { threshold: 20, amount: 2 }],
  newCustomerEnabled: true,
  newCustomerAmount: 3,
  freeDeliveryEnabled: true,
  freeDeliveryThreshold: 30,
  memberDiscountEnabled: true,
  memberDiscountRate: 0.95,
}

describe('第二阶段商家端规则（PRD v1.3 / 最新契约）', () => {
  it('优惠阶梯按门槛升序保存并重建 sortOrder', () => {
    expect(preparePromotionConfig(promotion).fullReductions).toEqual([
      { threshold: 20, amount: 2, sortOrder: 1 },
      { threshold: 40, amount: 5, sortOrder: 2 },
    ])
  })

  it('重复门槛、减额超过门槛和非法折扣率必须阻止保存', () => {
    expect(() => preparePromotionConfig({ ...promotion, fullReductions: [{ threshold: 20, amount: 2 }, { threshold: 20, amount: 3 }] })).toThrow('门槛不能重复')
    expect(() => preparePromotionConfig({ ...promotion, fullReductions: [{ threshold: 20, amount: 21 }] })).toThrow('减额不能超过门槛')
    expect(() => preparePromotionConfig({ ...promotion, memberDiscountRate: 0 })).toThrow('折扣率')
  })

  it('商品图拒绝 0 字节、超 2MB 和非图片类型', () => {
    expect(validateProductImage(new File([], 'empty.png', { type: 'image/png' }))).toContain('不能为空')
    expect(validateProductImage(new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' }))).toContain('不能超过 2MB')
    expect(validateProductImage(new File(['text'], 'script.svg', { type: 'image/svg+xml' }))).toContain('仅支持')
    expect(validateProductImage(new File(['ok'], 'food.webp', { type: 'image/webp' }))).toBeUndefined()
  })

  it('订单金额始终含四个基础行，只展示实际发生的优惠与红包', () => {
    const order: Order = { orderId: 'o1', status: 'COMPLETED', productTotal: 50, packagingFee: 2, deliveryFee: 3, fullReductionAmount: 5, newCustomerAmount: 0, memberDiscountAmount: 0, couponAmount: 4, deliveryFeeDiscount: 3, totalAmount: 43 }
    const rows = buildOrderAmountRows(order)
    expect(rows.map((row) => row.label)).toEqual(['商品小计', '打包费', '配送费', '满减优惠', '红包抵扣', '配送费优惠', '实付金额'])
    expect(rows.find((row) => row.label === '红包抵扣')).toMatchObject({ amount: 4, discount: true })
    expect(rows.some((row) => row.label === '新客立减')).toBe(false)
    expect(rows.some((row) => row.label === '会员折扣')).toBe(false)
  })
})
