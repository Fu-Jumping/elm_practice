/**
 * 消息与通知域接口（契约 §6.1 / §3.9，批次⑩ TODO-USER-004a）
 * 会话：列表（支持 orderId 过滤）/ 详情（含消息时间线）/ 发消息 / 标记已读
 * 通知：列表 / 单条已读 / 全部已读 / 未读数（未读数用途即底部导航角标）
 */
import { request } from '@/services/http'
import type { ChatMessageRecord, ConversationDetailRecord, ConversationRecord, NotificationRecord } from './types'
import { endpoints } from './endpoints'

export function listConversations(params?: { orderId?: string }): Promise<ConversationRecord[]> {
  return request<ConversationRecord[]>({
    method: 'GET',
    url: endpoints.conversation.list,
    params: params?.orderId ? { orderId: params.orderId } : undefined,
  })
}

export function getConversation(conversationId: string): Promise<ConversationDetailRecord> {
  return request<ConversationDetailRecord>({
    method: 'GET',
    url: endpoints.conversation.detail(conversationId),
  })
}

export function sendMessage(conversationId: string, content: string): Promise<ChatMessageRecord> {
  return request<ChatMessageRecord>({
    method: 'POST',
    url: endpoints.conversation.messages(conversationId),
    data: { content },
  })
}

export function markConversationRead(conversationId: string): Promise<null> {
  return request<null>({ method: 'PATCH', url: endpoints.conversation.read(conversationId) })
}

export function listNotifications(): Promise<NotificationRecord[]> {
  return request<NotificationRecord[]>({ method: 'GET', url: endpoints.notification.list })
}

export function markNotificationRead(notificationId: string): Promise<null> {
  return request<null>({ method: 'PATCH', url: endpoints.notification.read(notificationId) })
}

export function markAllNotificationsRead(): Promise<null> {
  return request<null>({ method: 'PATCH', url: endpoints.notification.readAll })
}

export function getNotificationUnreadCount(): Promise<number> {
  return request<number>({ method: 'GET', url: endpoints.notification.unreadCount })
}
