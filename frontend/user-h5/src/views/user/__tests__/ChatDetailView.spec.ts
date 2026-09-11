import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ChatDetailView from '../ChatDetailView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { CONVERSATION_SEED, conversationMockState, messageMockState } from '@/mocks/message'
import { ORDER_SEED, orderMockState } from '@/mocks/order'

/**
 * 聊天详情页行为测试 TX 组（TODO-USER-004b，2026-09-11）
 * 口径出处：PRD 7.8（聊天详情：消息时间线（用户/商家气泡）、底部输入框发送；发送后本端置底刷新；
 * 无聊天显示空态）+ PRD 7.16.1 聊天详情页四行（聊天头部、订单状态卡、消息时间线、底部输入区）
 * + 契约 §6.1（会话详情含消息、发消息、标记已读）+ 设计真源 `09-消息与客服/02-聊天详情/`。
 * 课程口径：设计稿的「**联系骑手**」入口按 PRD **不纳入本期，不实现**；平台客服不在本项目范围。
 * 本组在 feat: 实现前必须红（页面骨架见 chore: 提交）。
 */
async function mountChat(conversationId = 'cv2001') {
  const pinia = createPinia()
  setActivePinia(pinia)
  useSessionStore().user = { account: '13800000001', nickname: '张同学' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/messages', name: 'messages', component: { template: '<div />' } },
      { path: '/messages/:conversationId', name: 'chat-detail', component: ChatDetailView },
      { path: '/orders/:orderId', name: 'order-detail', component: { template: '<div />' } },
    ],
  })
  await router.push(`/messages/${conversationId}`)
  await router.isReady()
  const wrapper = mount(ChatDetailView, { global: { plugins: [pinia, router] } })
  return { wrapper, router }
}

describe('ChatDetailView 聊天详情（批次⑩ TODO-USER-004b）', () => {
  beforeEach(() => {
    conversationMockState.splice(
      0,
      conversationMockState.length,
      ...CONVERSATION_SEED.map((item) => ({ ...item })),
    )
    orderMockState.splice(0, orderMockState.length, ...ORDER_SEED.map((item) => ({ ...item })))
  })

  it('TX-1 渲染：头部商家、订单状态卡（状态/编号/查看订单）、两侧消息气泡与时间；不出现「联系骑手」', async () => {
    const { wrapper } = await mountChat()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="chat-message"]').length).toBeGreaterThan(0),
      { timeout: 2000 },
    )
    const page = wrapper.find('[data-testid="chat-detail"]')
    // 店名映射为二次异步（店铺列表接口），需等映射就绪
    await vi.waitFor(() => expect(page.text()).toContain('麦当劳'), { timeout: 2000 })
    const text = page.text()
    // 订单状态卡（来自订单接口）
    const card = wrapper.find('[data-testid="chat-order-card"]')
    expect(card.exists()).toBe(true)
    expect(card.text()).toContain('o0002')
    expect(wrapper.find('[data-testid="goto-order-btn"]').exists()).toBe(true)
    // 两侧气泡：商家侧与用户侧（PRD：消息时间线含发送方/内容/时间）
    expect(wrapper.findAll('[data-testid="chat-message"][data-sender="MERCHANT"]').length).toBeGreaterThan(0)
    expect(wrapper.findAll('[data-testid="chat-message"][data-sender="USER"]').length).toBeGreaterThan(0)
    expect(text).not.toContain('联系骑手')
  })

  it('TX-2 进入会话即标记已读（用户端未读清零，TC-MSG-002）', async () => {
    const before = conversationMockState.find((item) => item.conversationId === 'cv2001')!
    expect(before.unread).toBeGreaterThan(0)
    await mountChat()
    await vi.waitFor(
      () =>
        expect(
          conversationMockState.find((item) => item.conversationId === 'cv2001')!.unread,
        ).toBe(0),
      { timeout: 2000 },
    )
  })

  it('TX-3 输入后发送：调用接口、消息追加、输入清空、会话摘要更新', async () => {
    const { wrapper } = await mountChat()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="chat-input"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    const before = wrapper.findAll('[data-testid="chat-message"]').length
    await wrapper.find('[data-testid="chat-input"]').setValue('麻烦多给一份餐具')
    expect(wrapper.find('[data-testid="chat-send"]').attributes('aria-disabled')).not.toBe('true')
    await wrapper.find('[data-testid="chat-send"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="chat-message"]').length).toBe(before + 1),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="chat-detail"]').text()).toContain('麻烦多给一份餐具')
    expect((wrapper.find('[data-testid="chat-input"]').element as HTMLTextAreaElement).value).toBe('')
    expect(conversationMockState.find((item) => item.conversationId === 'cv2001')!.lastMessage).toBe(
      '麻烦多给一份餐具',
    )
  })

  it('TX-4 空白内容不可发送（按钮置灰，点击不产生请求）', async () => {
    const { wrapper } = await mountChat()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="chat-input"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    await wrapper.find('[data-testid="chat-input"]').setValue('   ')
    expect(wrapper.find('[data-testid="chat-send"]').attributes('aria-disabled')).toBe('true')
    const countBefore = messageMockState.length
    await wrapper.find('[data-testid="chat-send"]').trigger('click')
    await flushPromises()
    expect(messageMockState.length).toBe(countBefore)
  })

  it('TX-5 发送失败：保留输入并提示可重试（会话已不存在 → 404）', async () => {
    const { wrapper } = await mountChat()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="chat-input"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    // 模拟会话在服务端已不可用（404）
    conversationMockState.splice(0, conversationMockState.length)
    await wrapper.find('[data-testid="chat-input"]').setValue('在吗')
    await wrapper.find('[data-testid="chat-send"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="chat-send-error"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    // 输入保留，便于重试
    expect((wrapper.find('[data-testid="chat-input"]').element as HTMLTextAreaElement).value).toBe('在吗')
  })

  it('TX-6 点快捷回复回填输入框（设计稿固定文案）', async () => {
    const { wrapper } = await mountChat()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="quick-reply"]').length).toBeGreaterThan(0),
      { timeout: 2000 },
    )
    const first = wrapper.findAll('[data-testid="quick-reply"]')[0]!
    await first.trigger('click')
    expect((wrapper.find('[data-testid="chat-input"]').element as HTMLTextAreaElement).value).toBe(
      first.text(),
    )
  })

  it('TX-7 点「查看订单」进入订单详情（携带订单编号）', async () => {
    const { wrapper, router } = await mountChat()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="goto-order-btn"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    await wrapper.find('[data-testid="goto-order-btn"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('order-detail')
    expect(router.currentRoute.value.params.orderId).toBe('o0002')
  })
})
