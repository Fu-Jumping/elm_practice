<template>
  <div class="ai-page" data-testid="ai-chat-page">
    <!-- 顶部栏（PRD §3.2）：返回 + 标题「小饿 AI 点餐助手」+ 副标题；右侧「清空」（PRD §5.3） -->
    <header class="ai-appbar">
      <button class="ai-back" type="button" aria-label="返回" data-testid="ai-chat-back" @click="goBack">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 4.5L7.5 12L15 19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <div class="ai-title-group">
        <p class="ai-title" data-testid="ai-chat-title">小饿 AI 点餐助手</p>
        <p class="ai-subtitle" data-testid="ai-chat-subtitle">智能推荐 · 只做建议不下单</p>
      </div>
      <button class="ai-clear" type="button" data-testid="ai-chat-clear" @click="onClear">清空</button>
    </header>

    <!-- 消息列表区（PRD §3.3）：用户右对齐橙气泡 / AI 左对齐浅灰气泡 + 头像 -->
    <main ref="listEl" class="ai-list" data-testid="ai-message-list">
      <div
        v-for="message in messages"
        :key="message.id"
        class="ai-message"
        :class="`ai-message--${message.role}`"
        :data-role="message.role"
        data-testid="ai-message"
      >
        <span v-if="message.role === 'ai'" class="ai-avatar" aria-hidden="true">🤖</span>
        <div class="ai-bubble">
          <p v-if="message.status === 'pending' && message.text === ''" class="ai-thinking" data-testid="ai-thinking">
            正在思考<span class="ai-dot">.</span><span class="ai-dot">.</span><span class="ai-dot">.</span>
          </p>
          <!-- 用户消息按纯文本渲染：用户输入不做 Markdown/链接解析（只解析 AI 回复） -->
          <p v-else-if="message.role === 'user'" class="ai-block">{{ message.text }}</p>
          <template v-else>
            <template v-for="(block, blockIndex) in parseAiReply(message.text, storeRefs)" :key="blockIndex">
              <ul v-if="block.kind === 'list'" class="ai-block ai-block--list">
                <li v-for="(runs, itemIndex) in block.items" :key="itemIndex">
                  <template v-for="(run, runIndex) in runs" :key="runIndex">
                    <strong v-if="run.kind === 'bold'">{{ run.text }}</strong>
                    <button
                      v-else-if="run.kind === 'store'"
                      class="ai-store-link"
                      type="button"
                      data-testid="ai-store-link"
                      @click="goStore(run.storeId)"
                    >
                      {{ run.text }}
                    </button>
                    <template v-else>{{ run.text }}</template>
                  </template>
                </li>
              </ul>
              <p v-else class="ai-block">
                <template v-for="(run, runIndex) in block.runs" :key="runIndex">
                  <strong v-if="run.kind === 'bold'">{{ run.text }}</strong>
                  <button
                    v-else-if="run.kind === 'store'"
                    class="ai-store-link"
                    type="button"
                    data-testid="ai-store-link"
                    @click="goStore(run.storeId)"
                  >
                    {{ run.text }}
                  </button>
                  <template v-else>{{ run.text }}</template>
                </template>
              </p>
            </template>
          </template>
          <!-- 失败态（PRD §6.3）：超时可重发，其余只提示 -->
          <p v-if="message.errorText" class="ai-error" data-testid="ai-error-text">{{ message.errorText }}</p>
          <button
            v-if="message.retryable"
            class="ai-retry"
            type="button"
            data-testid="ai-retry-btn"
            @click="retry(message)"
          >
            重试
          </button>
        </div>
      </div>
    </main>

    <!-- 快捷提问栏（PRD §3.4）：5 个预设问题，横向滚动，点击即发送 -->
    <nav class="ai-quick" data-testid="ai-quick-list">
      <button
        v-for="question in QUICK_QUESTIONS"
        :key="question"
        class="ai-quick-item"
        type="button"
        data-testid="ai-quick-item"
        @click="askQuick(question)"
      >
        {{ question }}
      </button>
    </nav>

    <!-- 网络异常提示（PRD §6.3：输入框上方提示） -->
    <p v-if="networkTip" class="ai-network-tip" data-testid="ai-network-tip">网络连接失败，请检查网络</p>

    <!-- 输入区（PRD §3.5）：圆角输入框 + 亮橙发送按钮，空输入禁用，回车发送 -->
    <footer class="ai-composer">
      <input
        ref="inputEl"
        v-model="inputText"
        class="ai-input"
        type="text"
        data-testid="ai-chat-input"
        placeholder="输入你想吃的，比如 我想吃辣的"
        @keyup.enter="onSend"
      />
      <button
        class="ai-send"
        type="button"
        data-testid="ai-chat-send"
        :disabled="!inputText.trim() || busy"
        aria-label="发送"
        @click="onSend"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 11.5L20.5 4L13.5 21L11.2 13.8L3 11.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
        </svg>
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
/**
 * AI 点餐助手对话页（AI点餐助手前端PRD §3~§7，2026-09-14）
 *
 * 口径要点：
 * - **只做推荐与查询**：页面内不出现下单/支付/加购入口（AI-FE-12），回复里的商家编号跳商家详情（§4.2）。
 * - 消息与会话状态为本机状态（§5.1/§5.2）：`sessionId` 与消息记录走 `utils/aiChatSession`（localStorage），
 *   sessionId 随每次请求携带（见该文件对 PRD §5.1 字面口径与 `/stream-chat` 实测差异的说明）。
 * - 优先流式（§4.3）：`aiApi.streamChat` 逐段追加到同一气泡；SSE 失败降级 `aiApi.chat` 非流式。
 * - 异常分流按 §6.3 表：503 → toast「AI 助手暂不可用」；超时 → 气泡「回复超时，请重试」+ 重发；
 *   网络失败 → 输入框上方提示；其余 → 气泡「出了点小问题，请换个说法试试」。
 * - 组件本地状态即可（工程约定 §3.4：新增域不新增常驻 store）。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AiTimeoutError, AiUnavailableError, aiApi } from '@/services/api'
import type { AiChatMessage } from '@/services/api/types'
import { parseAiReply } from '@/utils/aiReply'
import { useCatalogStore } from '@/stores/catalogStore'
import {
  clearAiChat,
  readAiMessages,
  readAiSessionId,
  saveAiMessages,
  writeAiSessionId,
  type StoredAiMessage,
} from '@/utils/aiChatSession'
import { toast } from '@/utils/toast'

/** 快捷提问（PRD §3.4 预设问题，逐字一致） */
const QUICK_QUESTIONS = [
  '不知道吃什么，帮我推荐',
  '我想吃辣的',
  '有什么便宜的',
  '肯德基有什么',
  '今天有什么优惠',
] as const

/** 欢迎语（PRD §6.1，首次进入且无历史消息时展示） */
const WELCOME_TEXT = [
  '你好呀～我是小饿，你的 AI 点餐助手 👋',
  '不知道吃什么？告诉我你的口味或预算，我来帮你挑！',
  '试试问我：',
  '- 我想吃辣的',
  '- 推荐肯德基的菜品',
  '- 有什么便宜又好吃的',
].join('\n')

const NETWORK_ERROR_TEXT = '网络连接失败，请检查网络'
const TIMEOUT_ERROR_TEXT = '回复超时，请重试'
const GENERIC_ERROR_TEXT = '出了点小问题，请换个说法试试'

interface ChatMessage extends AiChatMessage {
  status: 'pending' | 'streaming' | 'done' | 'failed'
  errorText?: string
  retryable?: boolean
}

const route = useRoute()
const router = useRouter()
const catalogStore = useCatalogStore()

/** 商家索引（PRD §4.2：按回复里的商家名匹配 storeId，供可点击跳转） */
const storeRefs = computed(() => catalogStore.stores.map((store) => ({ storeId: store.storeId, name: store.name })))

const sessionId = ref('')
const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const busy = ref(false)
const networkTip = ref(false)
const listEl = ref<HTMLElement | null>(null)

let abortController: AbortController | null = null
let sequence = 0

function nextId(): string {
  sequence += 1
  return `ai-msg-${Date.now().toString(36)}-${sequence}`
}

function scrollToBottom(): void {
  const el = listEl.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

/** 持久化：只存内容字段（status/errorText 为展示态，不入库） */
function persist(): void {
  const stored: StoredAiMessage[] = messages.value.map((message) => ({
    id: message.id,
    role: message.role,
    text: message.text,
    createdAt: message.createdAt,
  }))
  saveAiMessages(sessionId.value, stored)
}

/**
 * 会话以后端为准（契约 §10.6：`/ai/chat` 回显采用的 sessionId）：
 * 后端返回了不同的会话 id 时，本地切到该 id 并在新 key 下保存当前消息——
 * 避免「数据库里是一段会话、本地展示是另一段」的分叉（2026-09-14 接库口径）。
 */
function adoptSessionId(next: string): void {
  if (!next || next === sessionId.value) return
  sessionId.value = next
  writeAiSessionId(next)
  persist()
}

function push(message: Omit<ChatMessage, 'id' | 'createdAt'>): string {
  const created: ChatMessage = { id: nextId(), createdAt: Date.now(), ...message }
  messages.value.push(created)
  void nextTick(scrollToBottom)
  return created.id
}

/** 取消息的**响应式代理**再改字段：直接改原始对象不会触发视图更新（TDD 实现期实测） */
function messageById(id: string): ChatMessage | undefined {
  return messages.value.find((message) => message.id === id)
}

function removeMessage(id: string): void {
  messages.value = messages.value.filter((message) => message.id !== id)
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true
  const candidate = error as { status?: number; code?: string } | undefined
  return candidate?.status === 0 || candidate?.code === 'ERR_NETWORK'
}

/** 发送一条用户消息并获取回复（`target` 为可复用的 AI 气泡：重发时复用同一气泡，不新增消息） */
async function requestReply(prompt: string, messageId: string): Promise<void> {
  const target = messageById(messageId)
  if (!target) return
  busy.value = true
  networkTip.value = false
  target.text = ''
  target.errorText = undefined
  target.retryable = false
  target.status = 'pending'
  abortController?.abort()
  abortController = new AbortController()

  try {
    const streamed = await aiApi.streamChat(
      { sessionId: sessionId.value, prompt },
      {
        signal: abortController.signal,
        onChunk: (chunk) => {
          target.text += chunk
          target.status = 'streaming'
          void nextTick(scrollToBottom)
        },
      },
    )
    adoptSessionId(streamed.sessionId)
    target.status = 'done'
    persist()
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      // PRD §6.3：503（未配置 key）→ 顶部 Toast，不留空回复气泡
      toast(error.message)
      removeMessage(messageId)
    } else if (error instanceof AiTimeoutError) {
      target.status = 'failed'
      target.errorText = TIMEOUT_ERROR_TEXT
      target.retryable = true
    } else {
      // 非 503/超时：先降级非流式（PRD §4.3），仍失败再按 §6.3 分流
      try {
        const fallback = await aiApi.chat({ sessionId: sessionId.value, prompt })
        adoptSessionId(fallback.sessionId)
        target.text = fallback.reply
        target.status = 'done'
        persist()
      } catch (fallbackError) {
        if (isNetworkError(error) || isNetworkError(fallbackError)) {
          removeMessage(messageId)
          networkTip.value = true
        } else {
          target.status = 'failed'
          target.errorText = GENERIC_ERROR_TEXT
        }
      }
    }
  } finally {
    busy.value = false
    void nextTick(scrollToBottom)
  }
}

async function send(prompt: string): Promise<void> {
  const text = prompt.trim()
  if (text === '' || busy.value) return
  networkTip.value = false
  push({ role: 'user', text, status: 'done' })
  persist()
  const replyId = push({ role: 'ai', text: '', status: 'pending' })
  inputText.value = ''
  await requestReply(text, replyId)
}

function onSend(): void {
  void send(inputText.value)
}

function askQuick(question: string): void {
  void send(question)
}

function retry(message: ChatMessage): void {
  const lastUser = [...messages.value].reverse().find((item) => item.role === 'user')
  if (!lastUser) return
  void requestReply(lastUser.text, message.id)
}

function onClear(): void {
  clearAiChat()
  sessionId.value = readAiSessionId()
  messages.value = []
  networkTip.value = false
  push({ role: 'ai', text: WELCOME_TEXT, status: 'done' })
  persist()
}

function goBack(): void {
  router.back()
}

function goStore(storeId: string): void {
  void router.push({ name: 'store-detail', params: { storeId } })
}

onMounted(() => {
  // 商家名 → storeId 的匹配索引（失败不阻塞对话，回复里的店名退化为纯文本）
  void catalogStore.fetchStores().catch(() => undefined)
  sessionId.value = readAiSessionId()
  const stored = readAiMessages(sessionId.value)
  if (stored.length === 0) {
    push({ role: 'ai', text: WELCOME_TEXT, status: 'done' })
    persist()
  } else {
    messages.value = stored.map((item) => ({ ...item, status: 'done' as const }))
  }
  const preset = route.query.prompt
  if (typeof preset === 'string' && preset.trim() !== '') {
    // PRD §2.2：搜索框入口「预填提示词」（只预填，不自动发送）
    inputText.value = preset
  }
  void nextTick(scrollToBottom)
})

onBeforeUnmount(() => {
  abortController?.abort()
})
</script>

<style scoped>
/* 视觉规范（PRD §8）：品牌亮橙按钮/用户气泡、AI 浅灰气泡、气泡圆角 16px、输入框圆角 24px */
.ai-page {
  display: flex;
  flex-direction: column;
  /* 三行固定布局（2026-09-14 负责人口径）：顶部栏与底部输入区固定不动，只有中间消息区滚动。
     高度取外层滚动容器（MainLayout .app-main，flex:1 的确定高度）的 100%，页面自身 overflow:hidden
     不再滚动——否则整页在 .app-main 里滚，顶部栏会被滚出屏幕、输入框也随内容飘走。
     顶部留出状态栏/安全区间距：桌面/普通浏览器 12px，刘海屏独立打开取 env(safe-area-inset-top)
     （index.html 已 viewport-fit=cover，与底部栏 env(safe-area-inset-bottom) 同口径）；
     顶部栏自身仍按 PRD §3.2 保持 48px。 */
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding-top: max(12px, env(safe-area-inset-top));
  background: #ffffff;
}

.ai-appbar {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-bottom: 1px solid #f0f0f0;
}

.ai-back {
  position: absolute;
  left: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-text-primary);
}

.ai-back svg {
  width: 22px;
  height: 22px;
}

.ai-title-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
}

.ai-title {
  /* 清掉 <p> 默认外边距：默认 1em 上下边距会把标题块撑到 83px 塞进 48px 顶栏，
     副标题被顶到栏底以下（2026-09-14 负责人走查「智推文案太靠下」的根因） */
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.ai-subtitle {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.ai-clear {
  position: absolute;
  right: 12px;
  padding: 4px 8px;
  border: none;
  background: none;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.ai-list {
  /* 唯一滚动容器（负责人口径 2026-09-14）：顶部栏与底部输入区固定，只有聊天记录滚动 */
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px 14px 8px;
  /* 设计稿无常驻滚动条（与 .app-main 同口径） */
  scrollbar-width: none;
}

.ai-list::-webkit-scrollbar {
  display: none;
}

.ai-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}

.ai-message--user {
  justify-content: flex-end;
}

.ai-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fff3ee;
  font-size: 16px;
  line-height: 28px;
  text-align: center;
}

.ai-bubble {
  max-width: 74%;
  padding: 10px 14px;
  border-radius: 16px;
  background: #f5f5f5;
  color: #333333;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.ai-message--user .ai-bubble {
  background: var(--color-primary);
  color: #ffffff;
}

.ai-block {
  margin: 0;
}

.ai-block + .ai-block,
.ai-block--list + .ai-block,
.ai-block + .ai-block--list {
  margin-top: 6px;
}

.ai-block--list {
  margin: 0;
  padding-left: 18px;
  list-style: disc;
}

/* 商家名可点击（PRD §4.2：亮橙色文字；回复文本不出现商家编号） */
.ai-store-link {
  padding: 0 2px;
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: inherit;
  font-weight: 600;
  text-decoration: none;
}

.ai-thinking {
  margin: 0;
  color: var(--color-text-tertiary);
}

.ai-dot {
  animation: ai-blink 1.2s infinite;
}

.ai-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.ai-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes ai-blink {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 1;
  }
}

.ai-error {
  margin: 6px 0 0;
  color: #d4380d;
  font-size: 13px;
}

.ai-retry {
  margin-top: 6px;
  padding: 4px 12px;
  border: 1px solid var(--color-primary);
  border-radius: 14px;
  background: none;
  color: var(--color-primary);
  font-size: 13px;
}

.ai-quick {
  flex: none;
  display: flex;
  gap: 8px;
  height: 36px;
  padding: 0 14px 6px;
  overflow-x: auto;
}

.ai-quick-item {
  flex: none;
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: 15px;
  background: #fff3ee;
  color: var(--color-primary);
  font-size: 13px;
  white-space: nowrap;
}

.ai-network-tip {
  flex: none;
  margin: 0;
  padding: 0 14px 6px;
  color: #d4380d;
  font-size: 13px;
}

.ai-composer {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 56px;
  padding: 0 14px calc(8px + env(safe-area-inset-bottom));
  border-top: 1px solid #f0f0f0;
}

.ai-input {
  flex: 1;
  height: 40px;
  padding: 0 16px;
  border: 1px solid #e5e5e5;
  border-radius: 24px;
  background: #fafafa;
  font-size: 15px;
  color: var(--color-text-primary);
}

.ai-send {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: var(--color-primary);
  color: #ffffff;
}

.ai-send svg {
  width: 20px;
  height: 20px;
}

.ai-send:disabled {
  opacity: 0.5;
}
</style>
