import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ReviewOrderView from '../ReviewOrderView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { onToast } from '@/utils/toast'
import { orderApi, reviewApi } from '@/services/api'
import type { OrderRecord } from '@/services/api/types'

/**
 * 评价订单页行为测试 TV 组（TODO-USER-003，2026-09-11）
 * 口径出处：PRD 7.7（星级 1-5 / 标签多选 / 文字 / 图片可选；同一订单只允许评价一次）+ PRD 7.16.1 评价订单页三行
 * （顶部栏、评价内容区、提交按钮）+ 契约 §6.2（POST /orders/{orderId}/review、错误码）+ 设计真源
 * `docs/design/exports/用户端/08-评价/01-评价订单/`。
 * 本批口径（负责人 2026-09-11 拍板）：图片区按设计稿渲染占位但**不接上传**（上传属 TODO-USER-007，依赖契约 §10.1），
 * 点击给出批次⑧接入提示；正文长度上限按课程口径 200 字（文档未定，前端 maxlength 与 mock 校验同值，已在留痕登记）。
 * 本组在 feat: 实现前必须红（页面骨架见 chore: 提交）。
 */
vi.mock('@/services/api', () => ({
  orderApi: { getOrder: vi.fn() },
  reviewApi: { submitReview: vi.fn(), getStoreReviews: vi.fn() },
}))

function reviewOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    orderId: 'or01',
    userId: 'u001',
    storeId: 'm002',
    remark: '',
    status: 'COMPLETED',
    reviewed: false,
    createdAt: '2026-09-11 11:00:00',
    itemSubtotal: 39,
    packagingFee: 2,
    total: 41,
    items: [
      { productId: 'p101', name: '香辣脆皮鸡腿堡', unitPrice: 19.5, quantity: 1, subtotal: 19.5 },
      { productId: 'p102', name: '薯条(中)', unitPrice: 11.5, quantity: 1, subtotal: 11.5 },
    ],
    ...overrides,
  }
}

async function mountReview(order: OrderRecord | Error) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useSessionStore().user = { account: '13800000001', nickname: '张同学' }
  if (order instanceof Error) vi.mocked(orderApi.getOrder).mockRejectedValue(order)
  else vi.mocked(orderApi.getOrder).mockResolvedValue(order as never)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/orders', name: 'orders', component: { template: '<div />' } },
      { path: '/orders/:orderId', name: 'order-detail', component: { template: '<div />' } },
      { path: '/orders/:orderId/review', name: 'order-review', component: ReviewOrderView },
    ],
  })
  await router.push(`/orders/or01/review`)
  await router.isReady()
  const wrapper = mount(ReviewOrderView, { global: { plugins: [pinia, router] } })
  return { wrapper, router }
}

describe('ReviewOrderView 评价订单页（批次⑩ TODO-USER-003）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    messages.length = 0
    offToast = onToast((message) => messages.push(message))
  })

  it('TV-1 渲染：标题/商家与打分提示/五颗星/商品行/标签/文字区/添加图片/提交按钮默认不可提交', async () => {
    const { wrapper } = await mountReview(reviewOrder())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="review-order"]').exists()).toBe(true), {
      timeout: 2000,
    })
    const text = wrapper.find('[data-testid="review-order"]').text()
    expect(text).toContain('评价订单')
    expect(text).toContain('为本次服务打分')
    expect(text).toContain('香辣脆皮鸡腿堡')
    expect(wrapper.findAll('[data-testid="star-btn"]')).toHaveLength(5)
    expect(wrapper.findAll('[data-testid="review-item"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-testid="review-tag"]')).toHaveLength(4)
    expect(wrapper.get('[data-testid="review-content"]').attributes('placeholder')).toContain('说说本次用餐体验')
    expect(wrapper.get('[data-testid="add-image"]').text()).toContain('添加图片')
    expect(wrapper.get('[data-testid="submit-review-btn"]').attributes('aria-disabled')).toBe('true')
  })

  it('TV-2 选星后星级文案更新且提交按钮变为可用（PRD：提交按钮由星级决定）', async () => {
    const { wrapper } = await mountReview(reviewOrder())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="star-btn"]').exists()).toBe(true), {
      timeout: 2000,
    })
    await wrapper.findAll('[data-testid="star-btn"]')[3]!.trigger('click')
    expect(wrapper.get('[data-testid="rating-label"]').text()).toBe('好')
    expect(wrapper.get('[data-testid="submit-review-btn"]').attributes('aria-disabled')).toBe('false')
  })

  it('TV-3 标签多选与文字输入随提交一次发送（契约 §6.2 请求体）', async () => {
    vi.mocked(reviewApi.submitReview).mockResolvedValue({ orderId: 'or01', reviewed: true } as never)
    const { wrapper } = await mountReview(reviewOrder())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="star-btn"]').exists()).toBe(true), {
      timeout: 2000,
    })
    await wrapper.findAll('[data-testid="star-btn"]')[4]!.trigger('click')
    const tags = wrapper.findAll('[data-testid="review-tag"]')
    await tags[0]!.trigger('click')
    await tags[2]!.trigger('click')
    expect(tags[0]!.attributes('aria-pressed')).toBe('true')
    expect(tags[2]!.attributes('aria-pressed')).toBe('true')
    await wrapper.get('[data-testid="review-content"]').setValue('出餐很快，味道不错')
    await wrapper.get('[data-testid="submit-review-btn"]').trigger('click')
    await flushPromises()
    expect(reviewApi.submitReview).toHaveBeenCalledWith('or01', {
      rating: 5,
      content: '出餐很快，味道不错',
      tags: [tags[0]!.text(), tags[2]!.text()],
    })
  })

  it('TV-4 提交成功：提示并回订单列表（PRD：成功回订单列表并刷新订单状态）', async () => {
    vi.mocked(reviewApi.submitReview).mockResolvedValue({ orderId: 'or01', reviewed: true } as never)
    const { wrapper, router } = await mountReview(reviewOrder())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="star-btn"]').exists()).toBe(true), {
      timeout: 2000,
    })
    await wrapper.findAll('[data-testid="star-btn"]')[4]!.trigger('click')
    await wrapper.get('[data-testid="submit-review-btn"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('orders'), { timeout: 2000 })
    expect(messages.join('|')).toContain('评价成功')
  })

  it('TV-5 提交被拒（服务端 409）：保留表单并提示，不跳转', async () => {
    vi.mocked(reviewApi.submitReview).mockRejectedValue(new Error('该订单已评价'))
    const { wrapper, router } = await mountReview(reviewOrder())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="star-btn"]').exists()).toBe(true), {
      timeout: 2000,
    })
    await wrapper.findAll('[data-testid="star-btn"]')[4]!.trigger('click')
    await wrapper.get('[data-testid="submit-review-btn"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="review-error-tip"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.get('[data-testid="review-error-tip"]').text()).toContain('已评价')
    expect(router.currentRoute.value.name).toBe('order-review')
    // 表单保留：星级仍选中
    expect(wrapper.findAll('[data-testid="star-btn"]')[4]!.attributes('aria-pressed')).toBe('true')
  })

  it('TV-6 未选星级点提交：给出必填提示且不调接口', async () => {
    const { wrapper } = await mountReview(reviewOrder())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="submit-review-btn"]').exists()).toBe(true), {
      timeout: 2000,
    })
    await wrapper.get('[data-testid="submit-review-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="rating-tip"]').text()).toContain('请先选择星级')
    expect(reviewApi.submitReview).not.toHaveBeenCalled()
  })

  it('TV-6b 未完成订单进入：提示原因并返回订单列表（PRD 异常列）', async () => {
    const { wrapper, router } = await mountReview(reviewOrder({ status: 'PENDING', paidAt: '2026-09-11 11:05:00' }))
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="review-block-tip"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.get('[data-testid="review-block-tip"]').text()).toContain('未完成')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('orders'), { timeout: 2000 })
  })

  it('TV-6c 已评价订单进入：提示并返回订单列表（同一订单只允许评价一次）', async () => {
    const { wrapper, router } = await mountReview(reviewOrder({ reviewed: true }))
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="review-block-tip"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.get('[data-testid="review-block-tip"]').text()).toContain('已评价')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('orders'), { timeout: 2000 })
  })

  it('TV-7 图片区为占位：点击提示随批次⑧接入，不发起上传与提交', async () => {
    const { wrapper } = await mountReview(reviewOrder())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="add-image"]').exists()).toBe(true), {
      timeout: 2000,
    })
    await wrapper.get('[data-testid="add-image"]').trigger('click')
    await flushPromises()
    expect(messages.join('|')).toContain('批次⑧')
    expect(reviewApi.submitReview).not.toHaveBeenCalled()
  })
})
