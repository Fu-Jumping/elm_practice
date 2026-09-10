import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const respond = (data: unknown, status = 200, code = 0) => new Response(JSON.stringify({ code, message: status === 401 ? '账号或密码错误' : 'success', data }), { status })
beforeEach(() => { vi.resetModules(); vi.stubEnv('VITE_API_MODE', 'real'); vi.stubEnv('VITE_API_BASE_URL', '/api/v1') })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('真实商家契约（按既有接口验收矩阵）', () => {
  it('未登录必须保持 401，不能回退演示账号', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(null, 401, 40101)))
    const { merchantApi } = await import('../src/services/merchantApi')
    await expect(merchantApi.me()).rejects.toMatchObject({ status: 401 })
  })
  it('分类排序使用 sortOrder 并保留服务端结果', async () => {
    const fetcher = vi.fn().mockResolvedValue(respond({ categoryId: 'c9', name: '饮料', sortOrder: 7 }))
    vi.stubGlobal('fetch', fetcher)
    const { merchantApi } = await import('../src/services/merchantApi')
    expect(await merchantApi.createCategory({ name: '饮料', sortOrder: 7 })).toMatchObject({ sortOrder: 7 })
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ name: '饮料', sortOrder: 7 })
  })
  it('上下架仅修改状态，避免覆盖顾客下单后的实时库存', async () => {
    const fetcher = vi.fn().mockResolvedValue(respond({ productId: 'p1', stock: 17, onSale: false }))
    vi.stubGlobal('fetch', fetcher)
    const { merchantApi } = await import('../src/services/merchantApi')
    await merchantApi.updateProductAvailability('p1', { onSale: false })
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ onSale: false })
  })
  it('订单快照和金额映射真实响应，不生成固定经营数字', async () => {
    const { normalizeOrder } = await import('../src/services/merchantApi')
    expect(normalizeOrder({ orderId: 'o1', itemSubtotal: '58.00', packagingFee: '2.00', total: '60.00', address: { contactName: '同学', region: '天津大学', detail: '12号楼' }, items: [{ name: '套餐', unitPrice: '29.00', quantity: 2 }] })).toMatchObject({ productTotal: 58, totalAmount: 60, address: '天津大学 12号楼', contactName: '同学', items: [{ price: 29, quantity: 2 }] })
  })
  it('非 JSON 响应明确失败', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>error</html>')))
    const { merchantApi } = await import('../src/services/merchantApi')
    await expect(merchantApi.me()).rejects.toThrow('JSON')
  })
})
