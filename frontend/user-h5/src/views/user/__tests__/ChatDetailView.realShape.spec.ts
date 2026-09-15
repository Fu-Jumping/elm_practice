import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ChatDetailView from '../ChatDetailView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { mockDispatch } from '@/mocks'

/**
 * 聊天详情页真实后端形状测试 CD 组（2026-09-15 验收修复，P1 消息簇）
 * 口径：后端 conversationView 返回 senderRole（无 sender）、POST messages 返回**整个会话对象**
 * （非单条消息）；本组锁定页面在真实形状下：① 商家名直取 storeName；② 气泡方向按 senderRole；
 * ③ 发送后以返回会话的最后一条消息回显（不得出现空气泡）；④ 会话加载失败提供重试而非静默跳回。
 */
const actualMocks = await vi.importActual<typeof import('@/mocks')>('@/mocks')
vi.mock('@/mocks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/mocks')>()
  return { ...actual, mockDispatch: vi.fn() }
})

/** 真实形状的会话详情（对齐 ExtensionService.conversationView） */
function realConversation(overrides: Record<string, unknown> = {}) {
  return {
    conversationId: 'cvR1',
    orderId: 'oR1',
    storeId: 'm002',
    storeName: '肯德基宅急送',
    userId: 'u001',
    userNickname: '张**',
    merchantId: 'ma001',
    unreadCount: 0,
    lastMessage: '您好，正在备餐',
    updatedAt: '2026-09-15 10:00:00',
    messages: [
      { messageId: 'm1', senderId: 'u001', senderRole: 'USER', content: '你好', createdAt: '2026-09-15 09:59:00' },
      { messageId: 'm2', senderId: 'ma001', senderRole: 'MERCHANT', content: '您好，正在备餐', createdAt: '2026-09-15 10:00:00' },
    ],
    ...overrides,
  }
}

function overrideDispatch(detail: unknown = realConversation(), sendResult: unknown = null, failDetail = false) {
  vi.mocked(mockDispatch).mockImplementation(async (config) => {
    const url = String((config as { url?: string }).url ?? '')
    if (url.includes('/conversations/') && config.method === 'GET') {
      if (failDetail) throw new Error('网络异常')
      return { status: 200, payload: { code: 0, message: 'success', data: detail } }
    }
    if (url.includes('/messages') && config.method === 'POST') {
      return { status: 200, payload: { code: 0, message: 'success', data: sendResult ?? detail } }
    }
    if (url.includes('/read') || url.includes('/orders/')) {
      return { status: 200, payload: { code: 0, message: 'success', data: url.includes('/orders/') ? { orderId: 'oR1', status: 'PENDING' } : null } }
    }
    if (url.includes('/stores')) return { status: 200, payload: { code: 0, message: 'success', data: [] } }
    return actualMocks.mockDispatch(config)
  })
}

async function mountChat(id = 'cvR1') {
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
  await router.push(`/messages/${id}`)
  await router.isReady()
  const wrapper = mount(ChatDetailView, { global: { plugins: [pinia, router] } })
  return { wrapper, router }
}

describe('ChatDetailView 真实后端形状（2026-09-15 P1 消息簇）', () => {
  beforeEach(() => {
    vi.mocked(mockDispatch).mockReset()
  })

  it('CD-1 店名直取会话 storeName；气泡方向按 senderRole（用户右/商家左），不出现空气泡', async () => {
    overrideDispatch()
    const { wrapper } = await mountChat()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="chat-message"]').length).toBe(2),
      { timeout: 3000 },
    )
    const page = wrapper.find('[data-testid="chat-detail"]')
    expect(page.text()).toContain('肯德基宅急送')
    const mine = wrapper.findAll('[data-testid="chat-message"][data-sender="USER"]')
    const partner = wrapper.findAll('[data-testid="chat-message"][data-sender="MERCHANT"]')
    expect(mine.length).toBe(1)
    expect(partner.length).toBe(1)
    expect(mine[0]!.text()).toContain('你好')
    expect(partner[0]!.text()).toContain('您好，正在备餐')
  })

  it('CD-2 发送返回整个会话对象：以最后一条消息回显，不产生内容为 undefined 的空气泡', async () => {
    const sent = realConversation({
      messages: [
        { messageId: 'm1', senderId: 'u001', senderRole: 'USER', content: '你好', createdAt: '2026-09-15 09:59:00' },
        { messageId: 'm2', senderId: 'ma001', senderRole: 'MERCHANT', content: '您好，正在备餐', createdAt: '2026-09-15 10:00:00' },
        { messageId: 'm3', senderId: 'u001', senderRole: 'USER', content: '麻烦尽快', createdAt: '2026-09-15 10:01:00' },
      ],
      lastMessage: '麻烦尽快',
    })
    overrideDispatch(realConversation(), sent)
    const { wrapper } = await mountChat()
    await vi.waitFor(() => expect(wrapper.findAll('[data-testid="chat-message"]').length).toBe(2), { timeout: 3000 })
    await wrapper.find('[data-testid="chat-input"]').setValue('麻烦尽快')
    await wrapper.find('[data-testid="chat-send"]').trigger('click')
    await flushPromises()
    const messages = wrapper.findAll('[data-testid="chat-message"]')
    expect(messages.length).toBe(3)
    expect(messages[2]!.attributes('data-sender')).toBe('USER')
    expect(messages[2]!.text()).toContain('麻烦尽快')
    expect(page_hasNoUndefined(wrapper)).toBe(true)
  })

  it('CD-3 会话加载失败：显示失败态与重试入口，不静默跳回消息列表', async () => {
    overrideDispatch(realConversation(), null, true)
    const { wrapper, router } = await mountChat()
    await vi.waitFor(() => expect(wrapper.find('[data-testid="chat-load-error"]').exists()).toBe(true), { timeout: 3000 })
    expect(wrapper.find('[data-testid="chat-missing"]').exists()).toBe(false)
    expect(router.currentRoute.value.name).toBe('chat-detail')
    expect(wrapper.find('[data-testid="chat-retry-btn"]').exists()).toBe(true)
  })

  it('CD-4 订单卡失败显示「无法查看订单」而非整卡消失', async () => {
    vi.mocked(mockDispatch).mockImplementation(async (config) => {
      const url = String((config as { url?: string }).url ?? '')
      if (url.includes('/conversations/') && config.method === 'GET') {
        return { status: 200, payload: { code: 0, message: 'success', data: realConversation() } }
      }
      if (url.includes('/orders/')) throw new Error('订单接口失败')
      if (url.includes('/read')) return { status: 200, payload: { code: 0, message: 'success', data: null } }
      if (url.includes('/stores')) return { status: 200, payload: { code: 0, message: 'success', data: [] } }
      return actualMocks.mockDispatch(config)
    })
    const { wrapper } = await mountChat()
    await vi.waitFor(() => expect(wrapper.find('[data-testid="chat-order-unavailable"]').exists()).toBe(true), { timeout: 3000 })
    expect(wrapper.find('[data-testid="chat-order-unavailable"]').text()).toContain('订单状态暂时无法查看')
  })
})

/** 页面文本不得出现 undefined（空气泡回归） */
function page_hasNoUndefined(wrapper: { text: () => string }): boolean {
  return !wrapper.text().includes('undefined')
}
