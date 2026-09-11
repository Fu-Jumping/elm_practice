import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import TabBar from '../TabBar.vue'
import { messageApi } from '@/services/api'

/**
 * 底部导航未读角标用例 TW-11（TODO-USER-004a，2026-09-11）
 * 口径出处：PRD 首页行（消息未读角标为语义红，未读数来自消息接口）+ 契约 §3.9
 * `GET /me/notifications/unread-count`（该接口用途即「底部导航角标」）。
 * 负责人确认口径：角标**只算通知未读**；会话未读在消息列表的会话行单独显示。
 * 本组在 feat: 实现前必须红（TabBar 当前为静态红点）。
 */
vi.mock('@/services/api', () => ({
  messageApi: { getNotificationUnreadCount: vi.fn() },
}))

async function mountTabBar() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/messages', name: 'messages', component: { template: '<div />' } },
      { path: '/orders', name: 'orders', component: { template: '<div />' } },
      { path: '/mine', name: 'mine', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()
  const wrapper = mount(TabBar, { global: { plugins: [pinia, router] } })
  return { wrapper, router }
}

describe('TabBar 消息未读角标（批次⑩ TODO-USER-004a）', () => {
  beforeEach(() => vi.clearAllMocks())

  it('TW-11 通知未读 > 0 显示红点；= 0 不显示', async () => {
    vi.mocked(messageApi.getNotificationUnreadCount).mockResolvedValue(3)
    const { wrapper } = await mountTabBar()
    await flushPromises()
    expect(wrapper.find('[data-testid="tab-badge-messages"]').exists()).toBe(true)

    vi.mocked(messageApi.getNotificationUnreadCount).mockResolvedValue(0)
    const zero = await mountTabBar()
    await flushPromises()
    expect(zero.wrapper.find('[data-testid="tab-badge-messages"]').exists()).toBe(false)
  })

  it('TW-11b 未读接口失败时降级为不显示红点（不阻塞导航）', async () => {
    vi.mocked(messageApi.getNotificationUnreadCount).mockRejectedValue(new Error('网络异常'))
    const { wrapper } = await mountTabBar()
    await flushPromises()
    expect(wrapper.find('.tab-bar').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-badge-messages"]').exists()).toBe(false)
  })
})
