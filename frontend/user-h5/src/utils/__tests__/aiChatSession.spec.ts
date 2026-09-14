import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AI_MESSAGE_MAX,
  AI_MESSAGES_KEY_PREFIX,
  AI_SESSION_KEY,
  aiMessagesKey,
  clearAiChat,
  createAiSessionId,
  readAiMessages,
  readAiSessionId,
  saveAiMessages,
  writeAiSessionId,
  type StoredAiMessage,
} from '../aiChatSession'

/**
 * AI 咨询会话状态用例 AS-1~AS-6（AI 点餐助手前端 PRD §5，2026-09-14）
 *
 * 口径出处：`docs/frontend/AI点餐助手前端PRD.md` §5.1（sessionId 存 localStorage，key `ai_session_id`）、
 * §5.2（消息记录 key `ai_messages_{sessionId}`，最多 50 条，不依赖后端查历史）、§5.3（清空 = 清消息 + 换会话）。
 * 本组在 feat: 实现前必须红（`utils/aiChatSession.ts` 由 feat: 创建）。
 */
function makeMessage(index: number, role: 'user' | 'ai' = 'user'): StoredAiMessage {
  return { id: `m${index}`, role, text: `第${index}条`, createdAt: 1_700_000_000_000 + index }
}

describe('AI 会话状态（AI点餐助手前端PRD §5）', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('AS-1 首次读取生成并持久化 sessionId，再次读取返回同一个', () => {
    const first = readAiSessionId()
    expect(first).toBeTruthy()
    expect(localStorage.getItem(AI_SESSION_KEY)).toBe(first)
    expect(readAiSessionId()).toBe(first)
  })

  it('AS-2 本地已有 sessionId 时直接复用，不再生成新的', () => {
    localStorage.setItem(AI_SESSION_KEY, 'sid-from-previous-visit')
    expect(readAiSessionId()).toBe('sid-from-previous-visit')
  })

  it('AS-3 生成的两个会话 id 不同，且 key 前缀按会话隔离', () => {
    const a = createAiSessionId()
    const b = createAiSessionId()
    expect(a).not.toBe(b)
    expect(aiMessagesKey(a)).toBe(`${AI_MESSAGES_KEY_PREFIX}${a}`)
    expect(aiMessagesKey(a)).not.toBe(aiMessagesKey(b))
  })

  it('AS-4 消息按会话隔离，且最多保留最近 50 条', () => {
    const sid = 'sid-1'
    saveAiMessages(sid, [makeMessage(1), makeMessage(2)])
    expect(readAiMessages(sid).map((item) => item.text)).toEqual(['第1条', '第2条'])
    // 另一会话不受影响
    expect(readAiMessages('sid-2')).toEqual([])

    const many = Array.from({ length: AI_MESSAGE_MAX + 8 }, (_, i) => makeMessage(i + 1))
    saveAiMessages(sid, many)
    const kept = readAiMessages(sid)
    expect(kept).toHaveLength(AI_MESSAGE_MAX)
    // 丢最旧、留最新
    expect(kept[0]!.text).toBe('第9条')
    expect(kept[kept.length - 1]!.text).toBe(`第${AI_MESSAGE_MAX + 8}条`)
  })

  it('AS-5 内容损坏时读回空数组且不抛错（非法 JSON / 非数组 / 脏条目）', () => {
    const sid = 'sid-bad'
    localStorage.setItem(aiMessagesKey(sid), '{not-json')
    expect(readAiMessages(sid)).toEqual([])

    localStorage.setItem(aiMessagesKey(sid), JSON.stringify({ a: 1 }))
    expect(readAiMessages(sid)).toEqual([])

    localStorage.setItem(
      aiMessagesKey(sid),
      JSON.stringify([makeMessage(1), null, { text: '' }, { id: 'x', role: 'nope', text: 't' }]),
    )
    const cleaned = readAiMessages(sid)
    expect(cleaned.map((item) => item.id)).toEqual(['m1'])
  })

  it('AS-7 writeAiSessionId 以后端返回的会话 id 覆盖本地值（会话以服务端为准）', () => {
    const local = readAiSessionId()
    writeAiSessionId('sid-from-server')
    expect(readAiSessionId()).toBe('sid-from-server')
    expect(localStorage.getItem(AI_SESSION_KEY)).toBe('sid-from-server')
    // 空值不得覆盖（后端未返回时保持本地会话）
    writeAiSessionId('')
    expect(readAiSessionId()).toBe('sid-from-server')
  })

  it('AS-6 clearAiChat 清掉会话与消息；存储不可用时读写静默降级', () => {
    const sid = readAiSessionId()
    saveAiMessages(sid, [makeMessage(1)])
    clearAiChat()
    expect(localStorage.getItem(AI_SESSION_KEY)).toBeNull()
    expect(localStorage.getItem(aiMessagesKey(sid))).toBeNull()
    // 清空后再读取 → 新会话（与原会话不同）
    expect(readAiSessionId()).not.toBe(sid)

    // 隐私模式：setItem 抛错不得影响调用方
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => readAiSessionId()).not.toThrow()
    expect(() => saveAiMessages('sid-x', [makeMessage(1)])).not.toThrow()
    expect(() => clearAiChat()).not.toThrow()
  })
})
