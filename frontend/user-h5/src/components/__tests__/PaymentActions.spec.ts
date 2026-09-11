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

/**
 * pay-page 变体（批次⑩ TODO-USER-105 支付页底部主按钮，2026-09-11）
 * 口径：支付页「立即支付 ¥实付金额」；模拟失败时 emit failed 供页面跳转支付失败页；
 * 倒计时失效或 payDeadline 未返回时由页面传 disabled 禁用。场景经负责人确认后由 AI 落地。
 */
describe('PaymentActions pay-page 变体（批次⑩ 支付页）', () => {
  beforeEach(() => vi.clearAllMocks())

  it('TD-4a 主按钮文案带实付金额，成功后 emit paid', async () => {
    vi.mocked(orderApi.payOrder).mockResolvedValue({ status: 'PENDING' } as never)
    const view = mount(PaymentActions, {
      props: { orderId: 'o1', status: 'PENDING_PAYMENT', variant: 'pay-page', amountText: '38.90' },
    })
    const submit = view.get('[data-testid="pay-order"]')
    expect(submit.text()).toContain('立即支付')
    expect(submit.text()).toContain('38.90')
    await submit.trigger('click')
    await flushPromises()
    expect(orderApi.payOrder).toHaveBeenCalledWith('o1', true)
    expect(view.emitted('paid')).toHaveLength(1)
  })

  it('TD-5a 模拟失败（返回仍待支付）→ emit failed，不 emit paid', async () => {
    vi.mocked(orderApi.payOrder).mockResolvedValue({ status: 'PENDING_PAYMENT' } as never)
    const view = mount(PaymentActions, {
      props: { orderId: 'o1', status: 'PENDING_PAYMENT', variant: 'pay-page' },
    })
    await view.get('[data-testid="pay-fail-demo"]').trigger('click')
    await flushPromises()
    expect(view.emitted('failed')).toHaveLength(1)
    expect(view.emitted('paid')).toBeUndefined()
  })

  it('TD-3a disabled（倒计时失效或 payDeadline 未返回）时主按钮禁用', () => {
    const view = mount(PaymentActions, {
      props: { orderId: 'o1', status: 'PENDING_PAYMENT', variant: 'pay-page', disabled: true },
    })
    expect(view.get('[data-testid="pay-order"]').attributes('disabled')).toBeDefined()
  })
})
