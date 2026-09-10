import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PaymentActions from '../PaymentActions.vue'
import { orderApi } from '@/services/api'
vi.mock('@/services/api', () => ({ orderApi: { payOrder: vi.fn() } }))
describe('既有支付接口的用户端入口', () => {
  beforeEach(() => vi.clearAllMocks())
  it('待支付订单提供操作，成功后通知详情刷新', async () => {
    vi.mocked(orderApi.payOrder).mockResolvedValue({ status: 'PROCESSING' } as never)
    const view = mount(PaymentActions, { props: { orderId:'o1', status:'PENDING_PAYMENT' } })
    await view.get('[data-testid="pay-order"]').trigger('click'); await flushPromises()
    expect(orderApi.payOrder).toHaveBeenCalledWith('o1', true)
    expect(view.emitted('paid')).toHaveLength(1)
  })
  it('超时错误保留订单与重试入口，不能显示成功', async () => {
    vi.mocked(orderApi.payOrder).mockRejectedValue(new Error('支付已超时'))
    const view = mount(PaymentActions, { props: { orderId:'o1', status:'PENDING_PAYMENT' } })
    await view.get('[data-testid="pay-order"]').trigger('click'); await flushPromises()
    expect(view.text()).toContain('支付已超时'); expect(view.emitted('paid')).toBeUndefined()
  })
  it('已支付订单不再提供支付按钮', () => {
    const view = mount(PaymentActions, { props: { orderId:'o1', status:'PROCESSING' } })
    expect(view.find('[data-testid="pay-order"]').exists()).toBe(false)
  })
})
