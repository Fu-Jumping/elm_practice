import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import MessageCenterView from '../MessageCenterView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { CONVERSATION_SEED, conversationMockState } from '@/mocks/message'
import { NOTIFICATION_SEED, notificationMockState } from '@/mocks/message'

/**
 * 消息中心页行为测试 TW 组（TODO-USER-004a，2026-09-11）
 * 口径出处：PRD 7.8（通知三类 + 聊天列表以订单维度组织 + 未读角标）+ PRD 7.16.1 消息列表页三行
 * （顶部栏「未读总数来自消息接口」、消息列表「通知和会话来自消息接口，按时间倒序」、底部导航）
 * + 契约 §3.9（通知四接口，含 `unread-count` 明示用于底部导航角标）+ §6.1（会话四接口）
 * + 设计真源 `docs/design/exports/用户端/09-消息与客服/01-消息中心/`（通知区在上、商家会话区在下）。
 * 负责人确认口径（2026-09-11）：会话列表接口支持按 `orderId` 过滤（供「联系商家」直取会话）。
 * 本组在 feat: 实现前必须红（页面骨架见 chore: 提交；`mocks/message.ts` 由 feat: 创建，缺失时本组为文件级失败）。
 */
async function mountCenter() {
  const pinia = createPinia()
  setActivePinia(pinia)
  useSessionStore().user = { account: '13800000001', nickname: '张同学' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/messages', name: 'messages', component: MessageCenterView },
      {
        path: '/messages/:conversationId',
        name: 'chat-detail',
        component: { template: '<div />' },
      },
    ],
  })
  await router.push('/messages')
  await router.isReady()
  const wrapper = mount(MessageCenterView, { global: { plugins: [pinia, router] } })
  return { wrapper, router }
}

describe('MessageCenterView 消息中心（批次⑩ TODO-USER-004a）', () => {
  beforeEach(() => {
    conversationMockState.splice(
      0,
      conversationMockState.length,
      ...CONVERSATION_SEED.map((item) => ({ ...item })),
    )
    notificationMockState.splice(
      0,
      notificationMockState.length,
      ...NOTIFICATION_SEED.map((item) => ({ ...item })),
    )
  })

  it('TW-1 渲染：通知三条（标题/内容/相对时间）与商家会话（未读角标 + 最后消息）', async () => {
    const { wrapper } = await mountCenter()
    // 等数据返回（mock 有 200-500ms 延迟窗口；容器常在，必须等列表项）
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="notification-item"]').length).toBe(3),
      { timeout: 2000 },
    )
    const notifications = wrapper.findAll('[data-testid="notification-item"]')
    expect(notifications).toHaveLength(3)
    expect(notifications[0]!.text()).toContain('订单状态更新')
    expect(notifications[0]!.text()).toContain('正在配送')
    // 相对时间（契约无字段，按 createdAt 本地换算）
    expect(notifications[0]!.text()).toMatch(/刚刚|分钟前|小时前|昨天/)

    const conversations = wrapper.findAll('[data-testid="conversation-item"]')
    expect(conversations).toHaveLength(2)
    expect(conversations[0]!.text()).toContain('您的汉堡已准备好')
    // 未读角标（用户端 unread，按角色分离）
    expect(wrapper.findAll('[data-testid="conversation-unread"]')).toHaveLength(1)
  })

  it('TW-2 点「全部已读」清除全部通知未读标记', async () => {
    const { wrapper } = await mountCenter()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="notification-unread"]').length).toBeGreaterThan(0),
      { timeout: 2000 },
    )
    await wrapper.find('[data-testid="mark-all-read"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="notification-unread"]')).toHaveLength(0),
      { timeout: 2000 },
    )
    expect(notificationMockState.every((item) => item.read)).toBe(true)
  })

  it('TW-3 点单条通知只标记该条已读', async () => {
    const { wrapper } = await mountCenter()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="notification-item"]').length).toBe(3),
      { timeout: 2000 },
    )
    const before = wrapper.findAll('[data-testid="notification-unread"]').length
    await wrapper.findAll('[data-testid="notification-item"]')[0]!.trigger('click')
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="notification-unread"]').length).toBe(before - 1),
      { timeout: 2000 },
    )
  })

  it('TW-4 点商家会话进入聊天详情页（携带会话编号）', async () => {
    const { wrapper, router } = await mountCenter()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="conversation-item"]').length).toBe(2),
      { timeout: 2000 },
    )
    await wrapper.findAll('[data-testid="conversation-item"]')[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('chat-detail')
    expect(router.currentRoute.value.params.conversationId).toBe('cv2001')
  })

  it('TW-5 无通知且无会话时展示空态', async () => {
    notificationMockState.splice(0, notificationMockState.length)
    conversationMockState.splice(0, conversationMockState.length)
    const { wrapper } = await mountCenter()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="message-empty"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="message-empty"]').text()).toContain('暂无消息')
  })
})
