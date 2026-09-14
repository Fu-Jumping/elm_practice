/**
 * AI 对话的本机状态（AI点餐助手前端PRD §5）
 *
 * 口径出处与实现说明：
 * - §5.1 会话标识：`sessionId` 由前端持有并持久化（localStorage `ai_session_id`），后续请求携带实现多轮记忆。
 *   **与 PRD 字面口径的差异**：PRD 写「首次进入调用 /chat 不传 sessionId、由后端返回」；实测契约 §10.6 的
 *   `/stream-chat` 只回文本分片、**不回 sessionId**，若按字面实现则首次回复无法走流式（违反 §4.3 与 AI-FE-06）。
 *   故实现改为**前端生成 sessionId**（契约 §10.6 明确「不传则基于 HttpSession 生成」，传即采用），
 *   每次请求都带上 → 全部回复均可流式。该差异需 R7 裁定后回写 PRD（已登记于用户端台账）。
 * - §5.2 消息记录：`ai_messages_{sessionId}`，最多 50 条，进入页面从本地恢复，不依赖后端查历史。
 * - §5.3 清空：清消息 + 换会话（后端按 sessionId 隔离，新 id 即新会话）。
 * - 容错：隐私模式/存储不可用/内容损坏一律静默降级，不阻塞对话（与 utils/searchHistory 同口径）。
 */
export const AI_SESSION_KEY = 'ai_session_id'
export const AI_MESSAGES_KEY_PREFIX = 'ai_messages_'
export const AI_MESSAGE_MAX = 50

export interface StoredAiMessage {
  id: string
  role: 'user' | 'ai'
  text: string
  createdAt: number
}

/** 取 localStorage（不可用时返回 null：SSR/隐私模式/被禁用） */
function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** 生成新会话 id（优先 crypto.randomUUID，jsdom/旧环境回退时间戳+随机） */
export function createAiSessionId(): string {
  try {
    const uuid = globalThis.crypto?.randomUUID?.()
    if (uuid) return uuid
  } catch {
    // 忽略：回退到下方实现
  }
  return `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** 读取会话 id；本地没有则生成并持久化 */
export function readAiSessionId(): string {
  const store = storage()
  try {
    const existing = store?.getItem(AI_SESSION_KEY)
    if (existing && existing.trim() !== '') return existing
  } catch {
    // 读取失败按无会话处理
  }
  const created = createAiSessionId()
  try {
    store?.setItem(AI_SESSION_KEY, created)
  } catch {
    // 隐私模式：本次可用，刷新后另起新会话
  }
  return created
}

/**
 * 以后端返回的会话 id 覆盖本地值（会话以服务端为准）：
 * `/ai/chat` 会回显采用的 sessionId（契约 §10.6：传入即采用、不传则后端生成）——
 * 后端生成了新会话时，前端必须切到该 id，否则本地展示与数据库里的会话记录会分叉。
 * 空值不覆盖（后端未返回时保持本地会话）。
 */
export function writeAiSessionId(sessionId: string): void {
  if (!sessionId || sessionId.trim() === '') return
  try {
    storage()?.setItem(AI_SESSION_KEY, sessionId)
  } catch {
    // 隐私模式：静默降级，本次会话仍可用
  }
}

export function aiMessagesKey(sessionId: string): string {
  return `${AI_MESSAGES_KEY_PREFIX}${sessionId}`
}

function isStoredMessage(value: unknown): value is StoredAiMessage {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    (item.role === 'user' || item.role === 'ai') &&
    typeof item.text === 'string' &&
    typeof item.createdAt === 'number' &&
    Number.isFinite(item.createdAt)
  )
}

/** 读会话消息（时间正序）；内容损坏或非数组时视为空 */
export function readAiMessages(sessionId: string): StoredAiMessage[] {
  const store = storage()
  if (!store) return []
  try {
    const raw = store.getItem(aiMessagesKey(sessionId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isStoredMessage)
  } catch {
    return []
  }
}

/** 写入会话消息：只保留最近 `AI_MESSAGE_MAX` 条（超出丢最旧） */
export function saveAiMessages(sessionId: string, messages: StoredAiMessage[]): void {
  try {
    const kept = messages.slice(-AI_MESSAGE_MAX)
    storage()?.setItem(aiMessagesKey(sessionId), JSON.stringify(kept))
  } catch {
    // 配额或隐私模式：静默降级，不影响对话
  }
}

/** 清空对话：清会话 id 与所有会话消息（下次进入生成新会话） */
export function clearAiChat(): void {
  const store = storage()
  if (!store) return
  try {
    store.removeItem(AI_SESSION_KEY)
    const sessionKeys: string[] = []
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i)
      if (key?.startsWith(AI_MESSAGES_KEY_PREFIX)) sessionKeys.push(key)
    }
    sessionKeys.forEach((key) => store.removeItem(key))
  } catch {
    // 静默降级
  }
}
