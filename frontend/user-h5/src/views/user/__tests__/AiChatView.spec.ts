import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { createPinia } from 'pinia'
import { AiTimeoutError, AiUnavailableError, type AiChatResult } from '@/services/api'
import { onToast } from '@/utils/toast'
import { AI_SESSION_KEY, aiMessagesKey, readAiSessionId } from '@/utils/aiChatSession'
import AiChatView from '../AiChatView.vue'

/**
 * AI 对话页用例 AI-1~AI-14（AI 点餐助手前端 PRD §3~§7，2026-09-14）
 *
 * 口径出处（逐条对应 PRD 验收表）：
 * AI-1 欢迎语 + 快捷提问（§6.1/§3.4，AI-FE-02）；AI-2 发送消息（§3.5，AI-FE-03）；
 * AI-3 流式逐段渲染（§4.3，AI-FE-06）；AI-4 Markdown 渲染（§4.1，AI-FE-04）；
 * AI-5 商家编号跳转（§4.2，AI-FE-07）；AI-6 快捷提问直接发送（§3.4/§7.3，AI-FE-08）；
 * AI-7 会话保持（§5.1/§5.2，AI-FE-09）；AI-8 清空对话（§5.3，AI-FE-10）；
 * AI-9~AI-12 异常状态（§6.3，AI-FE-11）；AI-13 流式失败降级非流式（§4.3）；
 * AI-14 搜索框入口预填（§2.2）。AI-FE-12（不下单）由 AI-15 锁定。
 * 本组在 feat: 实现前必须红（`views/user/AiChatView.vue` 由 feat: 创建）。
 */
const h = vi.hoisted(() => ({
  chat: vi.fn(),
  streamChat: vi.fn(),
}))

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>()
  return {
    ...actual,
    aiApi: { chat: h.chat, streamChat: h.streamChat },
  }
})

const QUICK_QUESTIONS = [
  '不知道吃什么，帮我推荐',
  '我想吃辣的',
  '有什么便宜的',
  '肯德基有什么',
  '今天有什么优惠',
]

function streamOk(reply: string, chunks?: string[]) {
  h.streamChat.mockImplementation(
    async (payload: { sessionId: string; prompt: string }, opts: { onChunk: (c: string) => void }) => {
      for (const chunk of chunks ?? [reply]) opts.onChunk(chunk)
      return { sessionId: payload.sessionId, reply } satisfies AiChatResult
    },
  )
}

let router: Router
async function mountChat(query: Record<string, string> = {}): Promise<VueWrapper> {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/ai-chat', name: 'ai-chat', component: AiChatView },
      { path: '/stores/:storeId', name: 'store-detail', component: { template: '<div />' } },
      { path: '/', name: 'home', component: { template: '<div />' } },
    ],
  })
  await router.push({ path: '/ai-chat', query })
  await router.isReady()
  const wrapper = mount(AiChatView, { global: { plugins: [createPinia(), router] } })
  await flushPromises()
  return wrapper
}

async function sendMessage(wrapper: VueWrapper, text: string): Promise<void> {
  await wrapper.get('[data-testid="ai-chat-input"]').setValue(text)
  await wrapper.get('[data-testid="ai-chat-send"]').trigger('click')
  await flushPromises()
}

describe('AiChatView（AI 点餐助手对话页）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  beforeEach(() => {
    localStorage.clear()
    messages.length = 0
    offToast?.()
    offToast = onToast((m) => messages.push(m))
    h.chat.mockReset()
    h.streamChat.mockReset()
  })

  it('AI-1 首次进入显示欢迎语与 5 条快捷提问（AI-FE-02）', async () => {
    const wrapper = await mountChat()
    expect(wrapper.get('[data-testid="ai-chat-title"]').text()).toContain('小饿')
    const aiMessages = wrapper.findAll('[data-testid="ai-message"][data-role="ai"]')
    expect(aiMessages).toHaveLength(1)
    expect(aiMessages[0]!.text()).toContain('我是小饿')
    const quick = wrapper.findAll('[data-testid="ai-quick-item"]')
    expect(quick.map((node) => node.text())).toEqual(QUICK_QUESTIONS)
  })

  it('AI-2 空输入时发送按钮禁用；发送后用户气泡上屏、输入框清空并调用流式接口（AI-FE-03）', async () => {
    streamOk('好的，推荐您吃辣味的。')
    const wrapper = await mountChat()
    const send = wrapper.get('[data-testid="ai-chat-send"]')
    expect((send.element as HTMLButtonElement).disabled).toBe(true)

    await sendMessage(wrapper, '  我想吃辣的  ')
    expect((wrapper.get('[data-testid="ai-chat-input"]').element as HTMLInputElement).value).toBe('')
    const userMessages = wrapper.findAll('[data-testid="ai-message"][data-role="user"]')
    expect(userMessages).toHaveLength(1)
    expect(userMessages[0]!.text()).toContain('我想吃辣的')
    expect(h.streamChat).toHaveBeenCalledTimes(1)
    const [payload] = h.streamChat.mock.calls[0]!
    expect((payload as { prompt: string }).prompt).toBe('我想吃辣的')
    expect((payload as { sessionId: string }).sessionId).toBe(readAiSessionId())
  })

  it('AI-3 流式分片逐段追加到同一气泡，完成后为完整回复（AI-FE-06）', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    h.streamChat.mockImplementation(
      async (payload: { sessionId: string }, opts: { onChunk: (c: string) => void }) => {
        opts.onChunk('第一段')
        await gate
        opts.onChunk('，第二段')
        return { sessionId: payload.sessionId, reply: '第一段，第二段' }
      },
    )
    const wrapper = await mountChat()
    await wrapper.get('[data-testid="ai-chat-input"]').setValue('推荐点吃的')
    await wrapper.get('[data-testid="ai-chat-send"]').trigger('click')
    await flushPromises()

    const bubbles = () => wrapper.findAll('[data-testid="ai-message"][data-role="ai"]')
    expect(bubbles()).toHaveLength(2) // 欢迎语 + 本次回复
    expect(bubbles()[1]!.text()).toContain('第一段')
    // 流式中：仍是同一气泡（未新增消息）
    expect(bubbles()).toHaveLength(2)
    release()
    await flushPromises()
    expect(bubbles()).toHaveLength(2)
    expect(bubbles()[1]!.text()).toContain('第一段，第二段')
  })

  it('AI-4 Markdown 渲染：加粗与列表按 PRD §4.1 呈现（AI-FE-04）', async () => {
    streamOk('**肯德基宅急送** [m002]\n- 香辣鸡腿堡 ¥19.50\n- 九珍果汁 ¥9.00')
    const wrapper = await mountChat()
    await sendMessage(wrapper, '肯德基有什么')
    const reply = wrapper.findAll('[data-testid="ai-message"][data-role="ai"]')[1]!
    expect(reply.findAll('strong').map((node) => node.text())).toContain('肯德基宅急送')
    const items = reply.findAll('li')
    expect(items.map((node) => node.text())).toEqual(['香辣鸡腿堡 ¥19.50', '九珍果汁 ¥9.00'])
  })

  it('AI-5 商家编号可点击并跳转商家详情（AI-FE-07）', async () => {
    streamOk('推荐肯德基宅急送 [m002] 的香辣鸡腿堡')
    const wrapper = await mountChat()
    await sendMessage(wrapper, '推荐点吃的')
    const link = wrapper.get('[data-testid="ai-store-link"]')
    expect(link.text()).toBe('m002')
    await link.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('store-detail')
    expect(router.currentRoute.value.params.storeId).toBe('m002')
  })

  it('AI-6 点快捷提问直接发送该问题（AI-FE-08）', async () => {
    streamOk('好的呀')
    const wrapper = await mountChat()
    await wrapper.findAll('[data-testid="ai-quick-item"]')[1]!.trigger('click')
    await flushPromises()
    expect(h.streamChat).toHaveBeenCalledTimes(1)
    expect((h.streamChat.mock.calls[0]![0] as { prompt: string }).prompt).toBe('我想吃辣的')
  })

  it('AI-7 退出再进入保留历史与 sessionId，不重复欢迎语（AI-FE-09）', async () => {
    streamOk('辣味推荐来啦')
    const first = await mountChat()
    await sendMessage(first, '我想吃辣的')
    const sid = readAiSessionId()
    first.unmount()

    const second = await mountChat()
    const aiMessages = second.findAll('[data-testid="ai-message"][data-role="ai"]')
    // 欢迎语 1 条 + 上一轮回复 1 条，不重复插入欢迎语
    expect(aiMessages).toHaveLength(2)
    expect(second.findAll('[data-testid="ai-message"][data-role="user"]')).toHaveLength(1)
    expect(readAiSessionId()).toBe(sid)
    expect(localStorage.getItem(aiMessagesKey(sid))).toContain('辣味推荐来啦')
  })

  it('AI-8 清空对话：消息清空、重新显示欢迎语、会话 id 更换（AI-FE-10）', async () => {
    streamOk('推荐如下')
    const wrapper = await mountChat()
    await sendMessage(wrapper, '推荐点吃的')
    const before = readAiSessionId()

    await wrapper.get('[data-testid="ai-chat-clear"]').trigger('click')
    await flushPromises()
    const aiMessages = wrapper.findAll('[data-testid="ai-message"][data-role="ai"]')
    expect(aiMessages).toHaveLength(1)
    expect(aiMessages[0]!.text()).toContain('我是小饿')
    expect(wrapper.findAll('[data-testid="ai-message"][data-role="user"]')).toHaveLength(0)
    expect(readAiSessionId()).not.toBe(before)
    expect(localStorage.getItem(AI_SESSION_KEY)).not.toBeNull()
  })

  it('AI-9 后端 503 → toast 提示「AI 助手暂不可用」，不留下空回复气泡（AI-FE-11）', async () => {
    h.streamChat.mockRejectedValue(new AiUnavailableError())
    const wrapper = await mountChat()
    await sendMessage(wrapper, '我想吃辣的')
    expect(messages.some((m) => m.includes('AI 助手暂不可用'))).toBe(true)
    // 只剩欢迎语
    expect(wrapper.findAll('[data-testid="ai-message"][data-role="ai"]')).toHaveLength(1)
  })

  it('AI-10 超时 → 气泡「回复超时，请重试」并可点击重发（AI-FE-11）', async () => {
    h.streamChat.mockRejectedValueOnce(new AiTimeoutError())
    streamOk('这次成功了')
    const wrapper = await mountChat()
    await sendMessage(wrapper, '我想吃辣的')

    const timeoutBubble = wrapper.findAll('[data-testid="ai-message"][data-role="ai"]')[1]!
    expect(timeoutBubble.text()).toContain('回复超时，请重试')
    const retry = wrapper.get('[data-testid="ai-retry-btn"]')
    await retry.trigger('click')
    await flushPromises()
    expect(h.streamChat).toHaveBeenCalledTimes(2)
    expect((h.streamChat.mock.calls[1]![0] as { prompt: string }).prompt).toBe('我想吃辣的')
    expect(wrapper.findAll('[data-testid="ai-message"][data-role="ai"]')[1]!.text()).toContain('这次成功了')
  })

  it('AI-11 网络失败（流式与非流式都失败）→ 输入框上方提示网络异常（AI-FE-11）', async () => {
    h.streamChat.mockRejectedValue(new TypeError('Failed to fetch'))
    h.chat.mockRejectedValue(new TypeError('Failed to fetch'))
    const wrapper = await mountChat()
    await sendMessage(wrapper, '我想吃辣的')
    expect(wrapper.get('[data-testid="ai-network-tip"]').text()).toContain('网络连接失败')
  })

  it('AI-12a 流式失败但非流式可用 → 降级渲染回复（PRD §4.3）', async () => {
    h.streamChat.mockRejectedValue(new Error('SSE 不可用'))
    h.chat.mockResolvedValue({ sessionId: 'sid', reply: '降级后的回复' })
    const wrapper = await mountChat()
    await sendMessage(wrapper, '我想吃辣的')
    expect(wrapper.findAll('[data-testid="ai-message"][data-role="ai"]')[1]!.text()).toContain(
      '降级后的回复',
    )
  })

  it('AI-12b 流式与非流式都失败（非网络原因）→ 通用错误气泡', async () => {
    h.streamChat.mockRejectedValue(new Error('SSE 不可用'))
    h.chat.mockRejectedValue(new Error('也失败了'))
    const wrapper = await mountChat()
    await sendMessage(wrapper, '我想吃辣的')
    expect(wrapper.findAll('[data-testid="ai-message"][data-role="ai"]')[1]!.text()).toContain(
      '出了点小问题',
    )
  })

  it('AI-13 搜索框入口带 prompt 时预填输入框，且不自动发送（PRD §2.2）', async () => {
    const wrapper = await mountChat({ prompt: '帮我推荐今天吃什么' })
    expect((wrapper.get('[data-testid="ai-chat-input"]').element as HTMLInputElement).value).toBe(
      '帮我推荐今天吃什么',
    )
    expect(h.streamChat).not.toHaveBeenCalled()
  })

  it('AI-15 非流式返回了后端会话 id 时，本地会话切换为后端 id（会话以服务端为准）', async () => {
    h.streamChat.mockRejectedValue(new Error('SSE 不可用'))
    h.chat.mockResolvedValue({ sessionId: 'sid-from-server', reply: '降级后的回复' })
    const wrapper = await mountChat()
    const localBefore = readAiSessionId()
    await sendMessage(wrapper, '我想吃辣的')

    expect(localBefore).not.toBe('sid-from-server')
    expect(readAiSessionId()).toBe('sid-from-server')
    expect(localStorage.getItem(aiMessagesKey('sid-from-server'))).toContain('降级后的回复')
    // 后续追问携带后端会话 id
    streamOk('继续推荐')
    await sendMessage(wrapper, '还有什么喝的')
    const lastCall = h.streamChat.mock.calls[h.streamChat.mock.calls.length - 1]!
    expect((lastCall[0] as { sessionId: string }).sessionId).toBe(
      'sid-from-server',
    )
  })

  it('AI-14 页面不含下单/支付入口，只做推荐（AI-FE-12）', async () => {
    streamOk('- 香辣鸡腿堡 ¥19.50')
    const wrapper = await mountChat()
    await sendMessage(wrapper, '肯德基有什么')
    const html = wrapper.html()
    for (const forbidden of ['立即支付', '去结算', '去支付', '加入购物车']) {
      expect(html).not.toContain(forbidden)
    }
    expect(wrapper.find('[data-testid="checkout-btn"]').exists()).toBe(false)
  })
})
