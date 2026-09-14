import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import MessageCenterView from '../MessageCenterView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { formatTime } from '@/services/normalizers'
import { CONVERSATION_SEED, conversationMockState } from '@/mocks/message'

/**
 * 消息中心真后端健壮性用例 MC-R1~MC-R4（BUG-20260914-004 / BUG-20260914-005，2026-09-14 线上复验）
 *
 * 背景（线上 `20260914-a2f15b1` 实测）：
 * - 通知接口未实现（`GET /me/notifications` → 404 `40401 接口不存在`），而会话接口正常（200 / 19 条）；
 *   原实现 `loadAll` 用 `Promise.all` 合并两个数据源 → 通知 404 时**会话被整体丢弃**，页面显示「暂无消息」。
 * - 线上会话对象为 `{conversationId, orderId, merchantId, userNickname, unreadCount, lastMessage, updatedAt}`
 *   （**无 `storeId` / `lastMessageAt` / `unread`**），原实现按自拟字段渲染 `storeName(item.storeId).slice(0,1)`
 *   → `TypeError: Cannot read properties of undefined (reading 'slice')`，**整页白屏**。
 * 判据：任一数据源失败不得拖垮另一个；会话字段缺失一律降级、不崩。
 * 本组在 fix: 实现前必须红（`loadAll` 与 `normalizeConversation` 由 fix: 提供）。
 */
const h = vi.hoisted(() => ({ dispatch: vi.fn() }))
vi.mock('@/mocks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/mocks')>()
  return { ...actual, mockDispatch: h.dispatch }
})
const actualMocks = await vi.importActual<typeof import('@/mocks')>('@/mocks')

interface MockRes {
  status: number
  payload: { code: number; message: string; data: unknown; details: null }
}
const ok = (data: unknown): MockRes => ({
  status: 200,
  payload: { code: 0, message: 'success', data, details: null },
})
const notFound = (): MockRes => ({
  status: 404,
  payload: { code: 40401, message: '接口不存在', data: null, details: null },
})

/** 按 method+url 覆写响应，其余请求（店铺列表等）走真实替身 */
function withRoutes(routes: Record<string, () => MockRes>): void {
  h.dispatch.mockImplementation(async (config) => {
    const key = `${(config.method ?? 'get').toUpperCase()} ${config.url}`
    const route = routes[key]
    if (route) return route()
    return actualMocks.mockDispatch(config)
  })
}

/** 线上真后端会话形状（无 storeId / lastMessageAt / unread，2026-09-14 实测原文） */
const LIVE_SHAPE_CONVERSATIONS = [
  {
    conversationId: 'cv1008',
    orderId: 'o1007',
    userId: 'u001',
    userNickname: '演**',
    merchantId: 'ma001',
    userRead: false,
    merchantRead: true,
    unreadCount: 2,
    lastMessage: '您的餐品已备好',
    updatedAt: formatTime(new Date(Date.now() - 5 * 60 * 1000)),
  },
  {
    conversationId: 'cv1019',
    orderId: 'o1018',
    userId: 'u001',
    userNickname: '演**',
    merchantId: 'ma002',
    userRead: true,
    merchantRead: true,
    unreadCount: 0,
    lastMessage: '',
    updatedAt: formatTime(new Date(Date.now() - 40 * 60 * 1000)),
  },
]

async function mountCenter() {
  const pinia = createPinia()
  setActivePinia(pinia)
  useSessionStore().user = { account: '13800000001', nickname: '张同学' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/messages', name: 'messages', component: MessageCenterView },
      { path: '/messages/:conversationId', name: 'chat-detail', component: { template: '<div />' } },
    ],
  })
  await router.push('/messages')
  await router.isReady()
  const wrapper = mount(MessageCenterView, { global: { plugins: [pinia, router] } })
  return { wrapper, router }
}

describe('MessageCenterView 真后端健壮性（BUG-20260914-004 / 005）', () => {
  beforeEach(() => {
    h.dispatch.mockReset()
    h.dispatch.mockImplementation(actualMocks.mockDispatch)
    conversationMockState.splice(
      0,
      conversationMockState.length,
      ...CONVERSATION_SEED.map((item) => ({ ...item })),
    )
  })

  it('MC-R1 通知接口 404 时不得丢弃会话：会话照常渲染 + 通知区局部失败提示（BUG-20260914-004）', async () => {
    withRoutes({
      'GET /me/notifications': notFound,
      'GET /conversations': () => ok(LIVE_SHAPE_CONVERSATIONS),
    })
    const { wrapper } = await mountCenter()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="conversation-item"]').length).toBe(2),
      { timeout: 10000 },
    )
    // 会话渲染出来了、不再显示整页空态
    expect(wrapper.find('[data-testid="message-empty"]').exists()).toBe(false)
    // 通知区给出局部失败提示与重试入口，而不是静默吞掉
    const hint = wrapper.get('[data-testid="notification-error"]')
    expect(hint.text()).toContain('通知')
    expect(wrapper.find('[data-testid="notification-retry"]').exists()).toBe(true)
  })

  it('MC-R2 线上会话形状（无 storeId/lastMessageAt/unread）不崩，字段按别名降级（BUG-20260914-005）', async () => {
    withRoutes({
      'GET /me/notifications': () => ok([]),
      'GET /conversations': () => ok(LIVE_SHAPE_CONVERSATIONS),
    })
    const { wrapper } = await mountCenter()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="conversation-item"]').length).toBe(2),
      { timeout: 10000 },
    )
    // 未读角标取 unreadCount；店名缺 storeId 时回退到 merchantId（不回退到 undefined/不崩）
    expect(wrapper.get('[data-testid="conversation-unread"]').text()).toBe('2')
    const first = wrapper.findAll('[data-testid="conversation-item"]')[0]!
    expect(first.text()).toContain('ma001')
    expect(first.text()).toContain('您的餐品已备好')
    // 时间取 updatedAt（40 分钟前那条显示相对时间）
    expect(wrapper.findAll('[data-testid="conversation-item"]')[1]!.text()).toMatch(/分钟前/)
  })

  it('MC-R3 会话字段几乎全缺（仅 conversationId）时也不崩（BUG-20260914-005 极端场景）', async () => {
    withRoutes({
      'GET /me/notifications': () => ok([]),
      'GET /conversations': () => ok([{ conversationId: 'cv-bare' }]),
    })
    const { wrapper } = await mountCenter()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="conversation-item"]').length).toBe(1),
      { timeout: 10000 },
    )
    // 页面不展示会话 id：字段全缺时给占位店名（不得出现 undefined、不得崩）
    const text = wrapper.get('[data-testid="conversation-item"]').text()
    expect(text).toContain('未知商家')
    expect(text).not.toContain('undefined')
  })

  it('MC-R4 回归锁：替身标准形状（storeId/lastMessageAt/unread）仍按店名渲染（不放宽既有口径）', async () => {
    withRoutes({ 'GET /conversations': () => ok(CONVERSATION_SEED) })
    const { wrapper } = await mountCenter()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="conversation-item"]').length).toBe(2),
      { timeout: 10000 },
    )
    // 店名映射依赖页面挂载时异步拉取的商家列表：等映射生效后再断言（CI 慢机上曾先于列表返回 → 误判为失败）
    await vi.waitFor(
      () => expect(wrapper.get('[data-testid="conversation-item"]').text()).toContain('麦当劳'),
      { timeout: 10000 },
    )
    const text = wrapper.get('[data-testid="conversation-item"]').text()
    // 标准形状仍按 storeId 映射店铺名（m003 麦当劳），不显示内部 id
    expect(text).not.toContain('m003')
  })
})
