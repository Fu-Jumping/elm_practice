import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PromotionConfig } from '../src/services/merchantApi'

const respond = (data: unknown) => new Response(JSON.stringify({ code: 0, message: 'success', data }), { status: 200 })
beforeEach(() => { vi.resetModules(); vi.stubEnv('VITE_API_MODE', 'real'); vi.stubEnv('VITE_API_BASE_URL', '/api/v1') })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('第二阶段商家端真实接口请求契约', () => {
  it('优惠保存只发送新版多档结构，不夹带废弃单档字段', async () => {
    const input: PromotionConfig = { enabled: true, fullReductions: [{ threshold: 20, amount: 2, sortOrder: 1 }, { threshold: 40, amount: 5, sortOrder: 2 }], newCustomerEnabled: true, newCustomerAmount: 3, freeDeliveryEnabled: true, freeDeliveryThreshold: 30, memberDiscountEnabled: true, memberDiscountRate: 0.95 }
    const fetcher = vi.fn().mockResolvedValue(respond(input)); vi.stubGlobal('fetch', fetcher)
    const { merchantApi } = await import('../src/services/merchantApi')
    await merchantApi.savePromotion(input)
    expect(fetcher.mock.calls[0][0]).toBe('/api/v1/merchant/promotions')
    expect(fetcher.mock.calls[0][1].method).toBe('PUT')
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(input)
  })

  it('已取消筛选、分类绑定和规格保存使用定稿路径与请求体', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(respond([])).mockResolvedValueOnce(respond(null)).mockResolvedValueOnce(respond({ productId: 'p1', categoryId: 'c1', name: '套餐', price: 20, stock: 1, onSale: true, specOptions: [{ name: '大份', priceDelta: 3 }] }))
    vi.stubGlobal('fetch', fetcher); const { merchantApi } = await import('../src/services/merchantApi')
    await merchantApi.listOrders('CANCELLED'); await merchantApi.bindCategoryProducts('c 1', ['p1', 'p2']); await merchantApi.updateProductSpecifications('p1', [{ name: '大份', priceDelta: 3 }])
    expect(fetcher.mock.calls[0][0]).toBe('/api/v1/merchant/orders?status=CANCELLED')
    expect(fetcher.mock.calls[1][0]).toBe('/api/v1/merchant/categories/c%201/products')
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ productIds: ['p1', 'p2'] })
    expect(fetcher.mock.calls[2][0]).toBe('/api/v1/merchant/products/p1/specifications')
    expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({ specOptions: [{ name: '大份', priceDelta: 3 }] })
  })
})
