/**
 * 消息与通知域 mock —— 骨架（批次⑩ TODO-USER-004a 的测试脚手架，先于失败测试入库）
 * 本文件暂只提供空种子与空处理器映射，使 TW 组用例以断言失败方式变红；
 * 真实现随后的 feat: 提交按契约 §6.1（会话：列表/详情/发消息/标记已读）与 §3.9
 * （通知：列表/单条已读/全部已读/未读数）补齐处理器与种子数据。
 */
import type { ConversationRecord, NotificationRecord } from '@/services/api/types'
import type { MockHandler } from './index'

export const CONVERSATION_SEED: ConversationRecord[] = []
export const NOTIFICATION_SEED: NotificationRecord[] = []

export const conversationMockState: ConversationRecord[] = []
export const notificationMockState: NotificationRecord[] = []

export const messageMocks: Record<string, MockHandler> = {}
