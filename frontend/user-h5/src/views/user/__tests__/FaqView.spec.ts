import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia } from 'pinia'
import FaqView from '../FaqView.vue'
import { onToast } from '@/utils/toast'
import { mockDispatch } from '@/mocks'

const actualMocks = await vi.importActual<typeof import('@/mocks')>('@/mocks')
vi.mock('@/mocks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/mocks')>()
  return { ...actual, mockDispatch: vi.fn() }
})

/**
 * 常见问题页测试（设置与 FAQ P2，PRD 7.16.1「常见问题页-顶部栏 / 常见问题解答区」两行）
 * FAQ-1 顶部栏标题「常见问题」+ 返回；不出现第三方品牌字样
 * FAQ-2 5 条问答文案与设计稿一致（PRD 字段列：前端固定文案）
 * FAQ-3 默认全部收起；点击仅本地展开/收起，全程不发请求（PRD 交互列）
 * FAQ-4 底部「联系在线客服」为不可交互占位：点击提示「暂未开放」，不发起会话
 * FAQ-5 返回：有历史回上一页；无历史回我的页（PRD 检查列）
 * 本组在 feat: 实现前必须红（页面与路由由 feat: 加入）
 */
let dispatched: string[] = []

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/mine', name: 'mine', component: { template: '<div />' } },
      { path: '/faq', name: 'faq', component: FaqView },
    ],
  })
}

async function mountFaq() {
  const pinia = createPinia()
  const router = makeRouter()
  await router.push('/faq')
  await router.isReady()
  const wrapper = mount(FaqView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('FaqView（常见问题页，设置与 FAQ P2）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  beforeEach(() => {
    messages.length = 0
    dispatched = []
    offToast = onToast((message) => messages.push(message))
    vi.mocked(mockDispatch).mockImplementation(async (config) => {
      dispatched.push(String(config.url ?? ''))
      return actualMocks.mockDispatch(config)
    })
  })

  afterEach(() => {
    offToast?.()
    vi.mocked(mockDispatch).mockReset()
  })

  it('FAQ-1 顶部栏标题为「常见问题」，返回按钮存在，且不出现第三方品牌字样', async () => {
    const { wrapper } = await mountFaq()
    expect(wrapper.find('[data-testid="faq-header"]').text()).toContain('常见问题')
    expect(wrapper.find('[data-testid="faq-back"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('饿了么')
  })

  it('FAQ-2 渲染设计稿的 5 条问答文案（PRD：前端固定文案，不来自接口）', async () => {
    const { wrapper } = await mountFaq()
    expect(wrapper.text()).toContain('常见问题解答')
    const questions = ['address', 'coupon', 'refund', 'delivery', 'contact']
    for (const key of questions) {
      expect(wrapper.find(`[data-testid="faq-item-${key}"]`).exists()).toBe(true)
    }
    const text = wrapper.text()
    expect(text).toContain('如何修改收货地址?')
    expect(text).toContain('优惠券如何使用?')
    expect(text).toContain('如何申请退款?')
    expect(text).toContain('配送超时怎么办?')
    expect(text).toContain('如何联系客服?')
  })

  it('FAQ-3 默认全部收起；点击条目本地展开，再点收起，全程不发请求', async () => {
    const { wrapper } = await mountFaq()
    // 默认全部收起（PRD 字段列）
    expect(wrapper.find('[data-testid="faq-answer-address"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="faq-answer-coupon"]').exists()).toBe(false)

    await wrapper.find('[data-testid="faq-item-address"]').trigger('click')
    expect(wrapper.find('[data-testid="faq-answer-address"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="faq-item-address"]').attributes('aria-expanded')).toBe('true')
    // 其余条目不受影响
    expect(wrapper.find('[data-testid="faq-answer-coupon"]').exists()).toBe(false)

    await wrapper.find('[data-testid="faq-item-address"]').trigger('click')
    expect(wrapper.find('[data-testid="faq-answer-address"]').exists()).toBe(false)

    // 展开/收起为纯前端状态，不产生任何业务请求（PRD：加载与展开不产生请求）
    expect(dispatched).toHaveLength(0)
  })

  it('FAQ-4 底部「联系在线客服」点击提示「暂未开放」，不发起会话（PRD：平台客服已移出范围）', async () => {
    const { wrapper } = await mountFaq()
    expect(wrapper.find('[data-testid="faq-contact-support"]').text()).toContain('联系在线客服')
    await wrapper.find('[data-testid="faq-contact-support"]').trigger('click')
    await flushPromises()
    expect(messages).toContain('暂未开放')
    expect(dispatched).toHaveLength(0)
  })

  it('FAQ-5 无历史记录时返回我的页（PRD 检查列）', async () => {
    const { wrapper, router } = await mountFaq()
    const backSpy = vi.spyOn(router, 'back').mockImplementation(() => undefined)
    await wrapper.find('[data-testid="faq-back"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('mine')
    backSpy.mockRestore()
  })
})
