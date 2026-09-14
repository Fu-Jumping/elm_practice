<script setup lang="ts">
/**
 * 消息中心页 —— 批次⑩ TODO-USER-004a（2026-09-11）
 * 设计真源：`docs/design/exports/用户端/09-消息与客服/01-消息中心/`（通知区在上、商家会话区在下）
 * 口径出处：PRD 7.8（通知三类：订单状态更新/红包到账/会员权益提醒；聊天列表以订单维度组织；双端未读）
 * + PRD 7.16.1 消息列表页三行（顶部栏未读总数来自消息接口；通知与会话来自消息接口、按时间倒序）
 * + 契约 §3.9（通知四接口）+ §6.1（会话四接口）
 * 关键口径：
 * - 会话商家名经店铺列表按 storeId 映射（后端会话记录不返回 storeName，与订单列表同一约定）
 * - 相对时间由 createdAt 本地换算（契约无该字段）
 * - 「全部已读」与单条已读均调契约接口，幂等
 * - 底部导航未读角标另计（只算通知未读，见 TabBar）；会话未读在本页会话行展示
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { messageApi } from '@/services/api'
import { formatRelativeTime, normalizeConversation } from '@/services/normalizers'
import type { ConversationCard } from '@/services/normalizers'
import { useCatalogStore } from '@/stores/catalogStore'
import { toast } from '@/utils/toast'
import type { NotificationRecord } from '@/services/api/types'

const router = useRouter()
const catalogStore = useCatalogStore()

const notifications = ref<NotificationRecord[]>([])
const conversations = ref<ConversationCard[]>([])
const loading = ref(false)
/** 数据源独立失败标记（BUG-20260914-004）：任一源失败不得拖垮另一个 */
const notificationsFailed = ref(false)
const conversationsFailed = ref(false)

const storeNameMap = computed(() => new Map(catalogStore.stores.map((s) => [s.storeId, s.name])))
const isEmpty = computed(
  () =>
    !loading.value &&
    !notificationsFailed.value &&
    !conversationsFailed.value &&
    notifications.value.length === 0 &&
    conversations.value.length === 0,
)

function storeName(storeId: string): string {
  const mapped = storeNameMap.value.get(storeId)
  if (mapped) return mapped
  // 缺 storeId（线上返回 merchantId）时退回该 id；两者都缺给占位文案，禁止 undefined 上屏
  return storeId !== '' ? storeId : '未知商家'
}

/** 会话头像取店名首字（storeName 恒返回字符串，缺失也不抛错——BUG-20260914-005） */
function avatarText(storeId: string): string {
  return storeName(storeId).trim().slice(0, 1) || '店'
}

/** 通知列表（独立失败标记 + 局部重试，BUG-20260914-004） */
async function loadNotifications(): Promise<void> {
  try {
    notifications.value = await messageApi.listNotifications()
    notificationsFailed.value = false
  } catch {
    // 失败提示由 http 层统一 toast；页面在通知区给局部失败态与重试入口
    notificationsFailed.value = true
  }
}

/** 会话列表（独立失败标记 + 本地归一化降级，BUG-20260914-004/005） */
async function loadConversations(): Promise<void> {
  try {
    const list = await messageApi.listConversations()
    conversations.value = list.map(normalizeConversation)
    conversationsFailed.value = false
  } catch {
    conversationsFailed.value = true
  }
}

/**
 * 加载两个数据源：**不得用 Promise.all 合并**（BUG-20260914-004）——
 * 线上通知接口未实现返回 404 时，会连带把正常返回的会话列表一起丢弃。
 */
async function loadAll(): Promise<void> {
  loading.value = true
  await Promise.allSettled([loadNotifications(), loadConversations()])
  loading.value = false
}

onMounted(async () => {
  // 店名映射（失败不阻塞消息渲染，降级显示 storeId）
  void catalogStore.fetchStores().catch(() => undefined)
  await loadAll()
})

/** 「全部已读」（契约 §3.9 PATCH /me/notifications/read） */
async function onMarkAllRead(): Promise<void> {
  try {
    await messageApi.markAllNotificationsRead()
    notifications.value = notifications.value.map((item) => ({ ...item, read: true }))
    toast('已全部标记为已读')
  } catch {
    /* 失败提示由 http 层统一处理 */
  }
}

/** 点单条通知：未读时标记已读（幂等） */
async function onOpenNotification(item: NotificationRecord): Promise<void> {
  if (item.read) return
  try {
    await messageApi.markNotificationRead(item.notificationId)
    item.read = true
  } catch {
    /* 失败保持未读态 */
  }
}

/** 进入商家会话（聊天详情页） */
function onOpenConversation(item: ConversationCard): void {
  void router.push({ name: 'chat-detail', params: { conversationId: item.conversationId } })
}
</script>

<template>
  <div class="msg-page">
    <header class="msg-appbar">
      <span class="msg-appbar-slot" />
      <p class="msg-title">消息</p>
      <button class="msg-read-all" type="button" data-testid="mark-all-read" @click="onMarkAllRead">
        全部已读
      </button>
    </header>

    <main class="msg-main" data-testid="message-center">
      <p v-if="loading" class="msg-loading">消息加载中…</p>
      <p v-else-if="isEmpty" class="msg-empty" data-testid="message-empty">暂无消息</p>

      <template v-else>
        <!-- 通知加载失败（BUG-20260914-004）：局部失败态 + 重试，**不影响下方会话区渲染** -->
        <div v-if="notificationsFailed" class="msg-error" data-testid="notification-error">
          <span class="msg-error-text">通知加载失败，请稍后重试</span>
          <button
            class="msg-error-retry"
            type="button"
            data-testid="notification-retry"
            @click="loadNotifications"
          >
            重试
          </button>
        </div>

        <!-- 通知区（契约 §3.9 三类，按时间倒序） -->
        <section v-if="notifications.length > 0" class="msg-card">
          <div
            v-for="item in notifications"
            :key="item.notificationId"
            class="msg-notification"
            data-testid="notification-item"
            @click="onOpenNotification(item)"
          >
            <span class="msg-notification-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  v-if="item.type === 'ORDER'"
                  d="M6 4h12v16l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linejoin="round"
                />
                <path
                  v-else-if="item.type === 'COUPON'"
                  d="M4 9.5a2 2 0 0 1 0 5V17h16v-2.5a2 2 0 0 1 0-5V7H4Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linejoin="round"
                />
                <path
                  v-else
                  d="M12 3.8a5.4 5.4 0 0 1 5.4 5.4v4l1.6 2.6H5l1.6-2.6v-4A5.4 5.4 0 0 1 12 3.8Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <div class="msg-notification-body">
              <div class="msg-notification-head">
                <p class="msg-notification-title">{{ item.title }}</p>
                <p class="msg-time">{{ formatRelativeTime(item.createdAt) }}</p>
              </div>
              <p class="msg-notification-content">{{ item.content }}</p>
            </div>
            <span
              v-if="!item.read"
              class="msg-unread-dot"
              data-testid="notification-unread"
              aria-label="未读"
            />
          </div>
        </section>

        <!-- 会话加载失败（BUG-20260914-004）：局部失败态 + 重试 -->
        <div v-if="conversationsFailed" class="msg-error" data-testid="conversation-error">
          <span class="msg-error-text">会话加载失败，请稍后重试</span>
          <button
            class="msg-error-retry"
            type="button"
            data-testid="conversation-retry"
            @click="loadConversations"
          >
            重试
          </button>
        </div>

        <!-- 商家会话区（契约 §6.1：以订单维度组织） -->
        <section v-if="conversations.length > 0" class="msg-conversations">
          <p class="msg-section-title">商家会话</p>
          <div class="msg-card">
            <div
              v-for="item in conversations"
              :key="item.conversationId"
              class="msg-conversation"
              data-testid="conversation-item"
              @click="onOpenConversation(item)"
            >
              <span class="msg-conversation-logo" aria-hidden="true">
                {{ avatarText(item.storeId) }}
              </span>
              <div class="msg-conversation-body">
                <div class="msg-conversation-head">
                  <p class="msg-conversation-name">{{ storeName(item.storeId) }}</p>
                  <p class="msg-time">{{ formatRelativeTime(item.lastMessageAt) }}</p>
                </div>
                <p class="msg-conversation-last">{{ item.lastMessage }}</p>
              </div>
              <span
                v-if="item.unread > 0"
                class="msg-conversation-unread"
                data-testid="conversation-unread"
              >
                {{ item.unread }}
              </span>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.msg-page {
  min-height: 100vh;
  background: #f9f9f9;
}

.msg-appbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid var(--color-border-light);
  background: #f9f9f9;
}

.msg-appbar-slot {
  width: 48px;
}

.msg-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  color: var(--color-primary);
}

.msg-read-all {
  border: none;
  background: none;
  padding: 0;
  width: 48px;
  text-align: right;
  font-size: 13px;
  line-height: 20px;
  color: #666666;
}

.msg-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.msg-card {
  overflow: hidden;
  border-radius: 8px;
  background: #ffffff;
}

.msg-notification {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px 11px;
  border-bottom: 1px solid var(--color-border-light);
}

.msg-notification:last-child {
  border-bottom: none;
}

.msg-notification-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #ff5a1f1a;
  color: var(--color-primary);
}

.msg-notification-icon svg {
  width: 22px;
  height: 22px;
}

.msg-notification-body {
  flex: 1;
  min-width: 0;
}

.msg-notification-head,
.msg-conversation-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.msg-notification-title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 22px;
  color: #1a1c1c;
}

.msg-time {
  flex-shrink: 0;
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: #999999;
}

.msg-notification-content {
  margin: 2px 0 0;
  font-size: 13px;
  line-height: 20px;
  color: #666666;
}

.msg-unread-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 8px;
  border-radius: 50%;
  /* 未读角标语义红（设计稿原值 #ff1414） */
  background: #ff1414;
}

.msg-conversations {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.msg-section-title {
  margin: 0;
  padding-left: 4px;
  font-size: 14px;
  line-height: 20px;
  color: #666666;
}

.msg-conversation {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-light);
}

.msg-conversation:last-child {
  border-bottom: none;
}

.msg-conversation-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #f6f7f9;
  font-size: 16px;
  font-weight: 600;
  color: #666666;
}

.msg-conversation-body {
  flex: 1;
  min-width: 0;
}

.msg-conversation-name {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 21px;
  color: #1a1c1c;
}

.msg-conversation-last {
  margin: 2px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 20px;
  color: #666666;
}

.msg-conversation-unread {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9999px;
  background: #ff1414;
  font-size: 12px;
  line-height: 18px;
  color: #ffffff;
}

.msg-loading,
.msg-empty {
  padding: 40px 12px;
  text-align: center;
  font-size: 14px;
  color: #999999;
}

/* 局部失败态（BUG-20260914-004）：单个数据源失败时给出提示与重试，不拖垮另一个数据源 */
.msg-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff7f5;
}

.msg-error-text {
  color: #d4380d;
  font-size: 13px;
}

.msg-error-retry {
  padding: 4px 12px;
  border: 1px solid var(--color-primary);
  border-radius: 14px;
  background: none;
  color: var(--color-primary);
  font-size: 13px;
}
</style>
