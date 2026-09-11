/**
 * 消息与通知域 mock（契约 §6.1 会话 / §3.9 通知，批次⑩ TODO-USER-004a）
 * - 会话：`GET /conversations`（支持 `orderId` 过滤，供订单详情「联系商家」直取会话，2026-09-11 负责人确认）、
 *   `GET /conversations/:id`（详情 + 消息时间线，未知会话 404）、
 *   `POST /conversations/:id/messages`（内容 trim 后不能为空且 ≤200 字，否则 400，TC-MSG-004；成功追加并更新摘要）、
 *   `PATCH /conversations/:id/read`（用户端未读清零，幂等；不改变商家端未读，TC-MSG-002）
 * - 通知：`GET /me/notifications`（三类倒序）、`PATCH /me/notifications/:id/read`（幂等，未知 404）、
 *   `PATCH /me/notifications/read`（全部已读）、`GET /me/notifications/unread-count`（底部导航角标）
 * 种子时间按「相对当前时刻」生成，便于消息中心的相对时间展示。
 */
import { formatTime } from '@/services/normalizers'
import type { ChatMessageRecord, ConversationRecord, NotificationRecord } from '@/services/api/types'
import type { MockHandler } from './index'
import { fail, ok } from './index'

/** 消息内容长度上限（课程口径，与聊天详情页 maxlength 同值） */
const MAX_MESSAGE_LENGTH = 200

function minutesAgo(minutes: number): string {
  return formatTime(new Date(Date.now() - minutes * 60 * 1000))
}

/** 会话种子（与订单种子对应：o0002 有未读、o0001 无未读） */
export const CONVERSATION_SEED: ConversationRecord[] = [
  {
    conversationId: 'cv2001',
    orderId: 'o0002',
    storeId: 'm003',
    lastMessage: '您的汉堡已准备好',
    lastMessageAt: minutesAgo(2),
    unread: 1,
  },
  {
    conversationId: 'cv2002',
    orderId: 'o0001',
    storeId: 'm002',
    lastMessage: '好的，已按要求加酱',
    lastMessageAt: minutesAgo(15),
    unread: 0,
  },
]

/** 会话消息种子（用户 / 商家两侧气泡） */
const MESSAGE_SEED: ChatMessageRecord[] = [
  {
    messageId: 'msg3001',
    conversationId: 'cv2001',
    sender: 'USER',
    content: '麻烦帮我多放点番茄酱',
    createdAt: minutesAgo(6),
  },
  {
    messageId: 'msg3002',
    conversationId: 'cv2001',
    sender: 'MERCHANT',
    content: '您的汉堡已准备好',
    createdAt: minutesAgo(2),
  },
  {
    messageId: 'msg3003',
    conversationId: 'cv2002',
    sender: 'USER',
    content: '不要葱，谢谢',
    createdAt: minutesAgo(20),
  },
  {
    messageId: 'msg3004',
    conversationId: 'cv2002',
    sender: 'MERCHANT',
    content: '好的，已按要求加酱',
    createdAt: minutesAgo(15),
  },
]

/** 通知种子（契约 §3.9 三类：订单 / 红包 / 会员） */
export const NOTIFICATION_SEED: NotificationRecord[] = [
  {
    notificationId: 'nt4001',
    type: 'ORDER',
    title: '订单状态更新',
    content: '您的订单正在配送中',
    relatedId: 'o0002',
    read: false,
    createdAt: minutesAgo(1),
  },
  {
    notificationId: 'nt4002',
    type: 'COUPON',
    title: '红包到账',
    content: '您收到一张 5 元红包',
    relatedId: 'cp5001',
    read: false,
    createdAt: minutesAgo(60),
  },
  {
    notificationId: 'nt4003',
    type: 'MEMBER',
    title: '会员权益提醒',
    content: '会员权益已激活',
    relatedId: 'u001',
    read: true,
    createdAt: minutesAgo(150),
  },
]

export const conversationMockState: ConversationRecord[] = CONVERSATION_SEED.map((item) => ({ ...item }))
export const notificationMockState: NotificationRecord[] = NOTIFICATION_SEED.map((item) => ({ ...item }))
export const messageMockState: ChatMessageRecord[] = MESSAGE_SEED.map((item) => ({ ...item }))

function conversationCopy(record: ConversationRecord): ConversationRecord {
  return { ...record }
}

export const messageMocks: Record<string, MockHandler> = {
  'GET /conversations': ({ params }) => {
    const orderId = typeof params?.orderId === 'string' ? params.orderId : ''
    const list = conversationMockState
      .filter((item) => (orderId ? item.orderId === orderId : true))
      .sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt))
    return ok(list.map(conversationCopy))
  },

  'GET /conversations/:conversationId': ({ params }) => {
    const conversation = conversationMockState.find(
      (item) => item.conversationId === params?.conversationId,
    )
    if (!conversation) return fail(404, 40400, '会话不存在')
    const messages = messageMockState
      .filter((item) => item.conversationId === conversation.conversationId)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    return ok({ ...conversationCopy(conversation), messages: messages.map((item) => ({ ...item })) })
  },

  'POST /conversations/:conversationId/messages': ({ params, data }) => {
    const conversation = conversationMockState.find(
      (item) => item.conversationId === params?.conversationId,
    )
    if (!conversation) return fail(404, 40400, '会话不存在')
    // 空白与超长消息一律 400 且不落库（TC-MSG-004）；内容首尾空白由服务端裁剪
    const content = String((data as { content?: string } | undefined)?.content ?? '').trim()
    if (content.length < 1) return fail(400, 40000, '消息内容不能为空')
    if (content.length > MAX_MESSAGE_LENGTH) return fail(400, 40000, '消息内容过长')
    const message: ChatMessageRecord = {
      messageId: `msg${3000 + messageMockState.length + 1}`,
      conversationId: conversation.conversationId,
      sender: 'USER',
      content,
      createdAt: formatTime(new Date()),
    }
    messageMockState.push(message)
    conversation.lastMessage = content
    conversation.lastMessageAt = message.createdAt
    return ok({ ...message })
  },

  'PATCH /conversations/:conversationId/read': ({ params }) => {
    const conversation = conversationMockState.find(
      (item) => item.conversationId === params?.conversationId,
    )
    if (!conversation) return fail(404, 40400, '会话不存在')
    // 只清当前角色（用户端）未读；商家端 merchantUnread 不受影响（TC-MSG-002）
    conversation.unread = 0
    return ok(null)
  },

  'GET /me/notifications': () => {
    const list = [...notificationMockState].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    )
    return ok(list.map((item) => ({ ...item })))
  },

  'PATCH /me/notifications/read': () => {
    notificationMockState.forEach((item) => {
      item.read = true
    })
    return ok(null)
  },

  'GET /me/notifications/unread-count': () => {
    return ok(notificationMockState.filter((item) => !item.read).length)
  },

  'PATCH /me/notifications/:notificationId/read': ({ params }) => {
    const notification = notificationMockState.find(
      (item) => item.notificationId === params?.notificationId,
    )
    if (!notification) return fail(404, 40400, '通知不存在')
    notification.read = true
    return ok(null)
  },
}
