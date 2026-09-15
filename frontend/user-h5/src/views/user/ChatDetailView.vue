<script setup lang="ts">
/**
 * 聊天详情页 —— 批次⑩ TODO-USER-004b（2026-09-11）
 * 设计真源：`docs/design/exports/用户端/09-消息与客服/02-聊天详情/`
 * 口径出处：PRD 7.8（消息时间线含发送方/内容/时间；底部输入框发送；发送后本端置底刷新；无聊天显示空态）
 * + PRD 7.16.1 聊天详情页四行 + 契约 §6.1（会话详情含消息 / 发消息 / 标记已读）
 * 关键口径：
 * - 头部会话标题与商家名来自会话详情；后端不返回 storeName → 经店铺列表按 storeId 映射（与订单同一约定）
 * - 订单状态卡：状态/编号/商家名来自订单接口，「查看订单」按订单编号进入订单详情；
 *   设计稿的「联系骑手」按 PRD **不纳入本期，不实现**（用例已以负向断言锁定）
 * - 进入会话即标记已读（PATCH read；用户端未读清零，不影响商家端，TC-MSG-002）
 * - 发送：内容 trim 后为空不可发送；请求中禁用防重；成功追加并置底、清空输入；失败保留输入并可重试
 */
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { messageApi, orderApi } from '@/services/api'
import { formatTime, normalizeOrderDetail, statusText } from '@/services/normalizers'
import { useCatalogStore } from '@/stores/catalogStore'
import type { ChatMessageRecord, ConversationDetailRecord, OrderDetail } from '@/services/api/types'

const route = useRoute()
const router = useRouter()
const catalogStore = useCatalogStore()

const conversationId = typeof route.params.conversationId === 'string' ? route.params.conversationId : ''
const conversation = ref<ConversationDetailRecord | null>(null)
const order = ref<OrderDetail | null>(null)
const missing = ref(false)
const content = ref('')
const sending = ref(false)
const sendError = ref('')
const timelineRef = ref<HTMLElement | null>(null)

/** 快捷回复（设计稿固定文案） */
const QUICK_REPLIES = ['请问多久送达', '麻烦尽快', '不用餐具'] as const
const MAX_MESSAGE_LENGTH = 200

const storeName = computed(() => {
  const storeId = conversation.value?.storeId
  if (!storeId) return ''
  return catalogStore.stores.find((store) => store.storeId === storeId)?.name ?? storeId
})
const canSend = computed(() => content.value.trim().length > 0 && !sending.value)

/**
 * 置底（2026-09-15 负责人走查：发送后必须手动下滑才看得到新消息）。
 * 根因：页面滚动容器是 MainLayout 的 `.app-main`，`.chat-timeline` 自身 `overflow: visible`
 * **不是滚动容器**，原实现对它设 `scrollTop` 不产生任何效果。
 * 改为滚动真正的滚动容器；`.chat-page` 预留了底部输入区的 132px 内边距，
 * 置底后最后一条消息不会被固定输入区盖住。
 */
function scrollToBottom(): void {
  void nextTick(() => {
    const scroller = document.querySelector('.app-main')
    if (scroller instanceof HTMLElement) scroller.scrollTop = scroller.scrollHeight
  })
}

async function load(): Promise<void> {
  if (!conversationId) {
    missing.value = true
    window.setTimeout(() => void router.replace({ name: 'messages' }), 400)
    return
  }
  try {
    const detail = await messageApi.getConversation(conversationId)
    conversation.value = detail
    void catalogStore.fetchStores().catch(() => undefined)
    try {
      order.value = normalizeOrderDetail(await orderApi.getOrder(detail.orderId))
    } catch {
      order.value = null
    }
    // 进入会话即标记已读（用户端未读清零）
    void messageApi.markConversationRead(conversationId).catch(() => undefined)
    scrollToBottom()
  } catch {
    missing.value = true
    window.setTimeout(() => void router.replace({ name: 'messages' }), 400)
  }
}

onMounted(load)

function pickQuickReply(text: string): void {
  content.value = text
}

async function onSend(): Promise<void> {
  if (sending.value || !canSend.value) return
  const text = content.value.trim()
  sending.value = true
  sendError.value = ''
  try {
    const message = await messageApi.sendMessage(conversationId, text)
    conversation.value?.messages.push(message)
    if (conversation.value) {
      conversation.value.lastMessage = message.content
      conversation.value.lastMessageAt = message.createdAt
    }
    content.value = ''
    scrollToBottom()
  } catch (err) {
    // 失败保留输入并提示可重试（PRD 异常列）
    sendError.value = err instanceof Error ? err.message : '发送失败，请重试'
  } finally {
    sending.value = false
  }
}

function goBack(): void {
  void router.push({ name: 'messages' })
}

/** 查看订单（按订单编号进入订单详情） */
function goOrder(): void {
  const orderId = conversation.value?.orderId
  if (!orderId) {
    void router.push({ name: 'orders' })
    return
  }
  void router.push({ name: 'order-detail', params: { orderId } })
}

function messageTime(message: ChatMessageRecord): string {
  return formatTime(message.createdAt).slice(11, 16)
}
</script>

<template>
  <div class="chat-page">
    <p v-if="missing" class="chat-missing" data-testid="chat-missing">会话不存在，即将返回消息列表…</p>

    <template v-else-if="conversation">
      <div data-testid="chat-detail">
        <!-- 吸顶区（2026-09-15 负责人走查：顶部栏与订单状态卡在消息滑动时都不能被带走）：
             两者同处一个 sticky 容器，滚动时整块留在顶部；容器底色不透明，消息从其下方穿行。 -->
        <div class="chat-top">
          <header class="chat-appbar">
            <button class="chat-back" type="button" aria-label="返回" data-testid="back-btn" @click="goBack">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 4.5L7.5 12L15 19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
            <p class="chat-title">{{ storeName }}</p>
          </header>

          <!-- 订单状态卡：状态 / 订单编号 / 商家名（来自订单接口）+ 查看订单 -->
          <section v-if="order" class="chat-order-card" data-testid="chat-order-card">
            <div class="chat-order-info">
              <div class="chat-order-line">
                <span class="chat-order-status">{{ statusText(order.status) }}</span>
                <span class="chat-order-no">订单编号: {{ order.orderId }}</span>
              </div>
              <p class="chat-order-store">{{ storeName }}</p>
            </div>
            <button class="chat-order-btn" type="button" data-testid="goto-order-btn" @click="goOrder">
              查看订单
            </button>
          </section>
        </div>

        <main class="chat-main">
          <!-- 消息时间线（商家侧左、用户侧右；按服务端时间排序） -->
          <section ref="timelineRef" class="chat-timeline">
            <p v-if="conversation.messages.length === 0" class="chat-empty">暂无消息，打个招呼吧</p>
            <div
              v-for="message in conversation.messages"
              :key="message.messageId"
              class="chat-message"
              :class="message.sender === 'USER' ? 'chat-message--mine' : 'chat-message--partner'"
              :data-sender="message.sender"
              data-testid="chat-message"
            >
              <span v-if="message.sender === 'MERCHANT'" class="chat-avatar" aria-hidden="true">
                {{ storeName.slice(0, 1) }}
              </span>
              <div class="chat-message-body">
                <p class="chat-message-meta">
                  <span>{{ message.sender === 'USER' ? '我' : storeName }}</span>
                  <span class="chat-message-time">{{ messageTime(message) }}</span>
                </p>
                <p class="chat-bubble">{{ message.content }}</p>
              </div>
            </div>
          </section>
        </main>
      </div>

      <!-- 底部输入区：快捷回复 + 输入框 + 发送 -->
      <footer class="chat-input-area">
        <div class="chat-quick-replies">
          <button
            v-for="reply in QUICK_REPLIES"
            :key="reply"
            class="chat-quick-reply"
            type="button"
            data-testid="quick-reply"
            @click="pickQuickReply(reply)"
          >
            {{ reply }}
          </button>
        </div>
        <div class="chat-input-row">
          <textarea
            v-model="content"
            class="chat-input"
            data-testid="chat-input"
            :maxlength="MAX_MESSAGE_LENGTH"
            placeholder="输入消息..."
          />
          <button
            class="chat-send"
            :class="{ 'is-disabled': !canSend }"
            type="button"
            data-testid="chat-send"
            :aria-disabled="canSend ? 'false' : 'true'"
            :disabled="sending"
            @click="onSend"
          >
            {{ sending ? '发送中…' : '发送' }}
          </button>
        </div>
        <p v-if="sendError" class="chat-send-error" data-testid="chat-send-error" role="alert">
          {{ sendError }}
        </p>
      </footer>
    </template>

    <p v-else class="chat-missing">会话加载中…</p>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* 设计稿 .sharedComponentTopAp：底色 #f9f9f9 + 底部为固定输入区预留 */
  padding-bottom: 132px;
  background: #f9f9f9;
}

/* 吸顶区（2026-09-15 负责人走查）：顶部栏与订单状态卡同处一个 sticky 容器，
   滚动消息时整块留在顶部、订单块不随之上移。原先顶栏是 position: relative（会被带走），
   把 sticky 上提到本容器后，`.chat-back` 的绝对定位锚点仍在本容器内的 `.chat-appbar` 上，不受影响。
   底色与页面一致且不透明：消息从其下方穿行时不会透出。 */
.chat-top {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #f9f9f9;
}

.chat-appbar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  padding: 16px 16px 8px;
  background: #fcf9f8;
}

.chat-back {
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: none;
  padding: 0;
  color: #1a1c1c;
}

.chat-back svg {
  width: 16px;
  height: 16px;
}

.chat-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  line-height: 26px;
  color: #1a1c1c;
}

.chat-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 订单状态卡（设计稿 .backgroundShadow：浅灰底 8px 圆角） */
.chat-order-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 16px;
  padding: 16px;
  border-radius: 8px;
  background: #f3f3f3;
}

.chat-order-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.chat-order-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 状态标签（设计稿原值：品牌橙底 + 深棕色字） */
.chat-order-status {
  flex-shrink: 0;
  border-radius: 2px;
  background: var(--color-primary);
  padding: 2px 8px;
  font-size: 10px;
  line-height: 16px;
  color: #541400;
}

.chat-order-no {
  font-size: 14px;
  line-height: 20px;
  color: #666666;
}

.chat-order-store {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  line-height: 26px;
  color: #1a1c1c;
}

.chat-order-btn {
  flex-shrink: 0;
  border: none;
  border-radius: 4px;
  background: var(--color-primary);
  padding: 7px 14px;
  font-size: 12px;
  line-height: 18px;
  color: #ffffff;
}

/* 消息时间线 */
.chat-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 16px 16px;
}

.chat-message {
  display: flex;
  gap: 8px;
}

.chat-message--partner {
  justify-content: flex-start;
}

.chat-message--mine {
  justify-content: flex-end;
}

.chat-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #f3f3f3;
  font-size: 15px;
  font-weight: 600;
  color: #666666;
}

.chat-message-body {
  display: flex;
  flex-direction: column;
  max-width: 76%;
}

.chat-message--mine .chat-message-body {
  align-items: flex-end;
}

.chat-message-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 4px;
  font-size: 12px;
  line-height: 18px;
  color: #666666;
}

.chat-message-time {
  color: #999999;
}

/* 商家侧气泡：灰底左上直角；用户侧气泡：品牌橙底白字右上直角 */
.chat-bubble {
  margin: 0;
  padding: 12px;
  font-size: 14px;
  line-height: 21px;
}

.chat-message--partner .chat-bubble {
  border-radius: 0 8px 8px 8px;
  background: #e8e8e8;
  color: #1a1c1c;
}

.chat-message--mine .chat-bubble {
  border-radius: 8px 0 8px 8px;
  background: var(--color-primary);
  color: #ffffff;
}

.chat-empty {
  padding: 32px 12px;
  text-align: center;
  font-size: 13px;
  color: #999999;
}

/* 底部固定输入区（设计稿 .fixedBottomInputArea） */
.chat-input-area {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  padding: 12px 16px;
  background: #f9f9f9;
}

.chat-quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 12px;
}

.chat-quick-reply {
  border: none;
  border-radius: 4px;
  background: #f3f3f3;
  padding: 8px 16px;
  font-size: 12px;
  line-height: 18px;
  color: #1a1c1c;
}

.chat-input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.chat-input {
  flex: 1;
  min-height: 44px;
  max-height: 88px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background: #ffffff;
  padding: 11px 12px;
  font: inherit;
  font-size: 14px;
  line-height: 21px;
  color: #1a1c1c;
  resize: none;
}

.chat-input::placeholder {
  color: #999999;
}

.chat-send {
  flex-shrink: 0;
  border: none;
  border-radius: 4px;
  background: var(--color-primary);
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: #ffffff;
}

/* 空内容时置灰但仍可点击（点击不发送、不发请求） */
.chat-send.is-disabled {
  background: #ffd2c2;
}

.chat-send:disabled {
  opacity: 0.6;
}

.chat-send-error {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--color-error);
}

.chat-missing {
  padding: 40px 12px;
  text-align: center;
  font-size: 14px;
  color: #999999;
}
</style>
