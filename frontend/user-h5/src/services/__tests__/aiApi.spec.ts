import { beforeEach, describe, expect, it } from 'vitest'
import { AiUnavailableError, aiApi } from '@/services/api'
import { resetAiMockState, setAiMockUnavailable } from '@/mocks/ai'

/**
 * AI 对话接口层用例 AA-1~AA-6（契约 §10.6 + AI点餐助手前端PRD §4.3/§5.1/§6.3，2026-09-14）
 *
 * 口径出处：
 * - 契约 §10.6：`POST /ai/chat`（非流式）与 `POST /ai/stream-chat`（`text/event-stream` 分段）；
 *   请求 `{sessionId?, prompt}`；`/chat` 响应 `{sessionId, reply}`；未配置 key 时 503。
 * - PRD §4.3：优先流式，SSE 不可用/失败降级到非流式；流式分片实时回调。
 * - PRD §5.1：`sessionId` 由前端持久化并在后续请求携带（**实现补充**：`/stream-chat` 只返回文本分片、
 *   不回 `sessionId`，故 sessionId 由前端生成后随每次请求传入；契约 §10.6 明确「不传则后端生成」，传即采用）。
 * - PRD §6.3：503（未配 key）单独识别，页面提示「AI 助手暂不可用」。
 * 本组在 feat: 实现前必须红（`services/api/ai.ts` / `mocks/ai.ts` 由 feat: 创建）。
 */
describe('AI 对话接口层（契约 §10.6）', () => {
  beforeEach(() => {
    resetAiMockState()
  })

  it('AA-1 chat() 返回 {sessionId, reply} 且 sessionId 为传入值', async () => {
    const res = await aiApi.chat({ sessionId: 'sid-api', prompt: '我想吃辣的' })
    expect(res.sessionId).toBe('sid-api')
    expect(res.reply.trim().length).toBeGreaterThan(0)
  })

  it('AA-2 streamChat() 分片回调多次（逐段渲染的基础），拼接结果等于整段回复', async () => {
    const chunks: string[] = []
    const done = await aiApi.streamChat(
      { sessionId: 'sid-stream', prompt: '肯德基有什么' },
      { onChunk: (chunk) => chunks.push(chunk) },
    )
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.join('')).toBe(done.reply)
    expect(done.sessionId).toBe('sid-stream')
  })

  it('AA-3 同一 sessionId 的多轮：第二问带上第一问的上下文（替身与真实后端同口径）', async () => {
    const first = await aiApi.streamChat(
      { sessionId: 'sid-multi', prompt: '我想吃辣的' },
      { onChunk: () => undefined },
    )
    expect(first.reply).toContain('[m002]')

    const second = await aiApi.streamChat(
      { sessionId: 'sid-multi', prompt: '还有什么喝的' },
      { onChunk: () => undefined },
    )
    expect(second.reply).toContain('九珍果汁')
  })

  it('AA-4 空 prompt 被拒绝（400 经 http 层归一为业务错误）', async () => {
    await expect(aiApi.chat({ sessionId: 'sid-bad', prompt: '   ' })).rejects.toThrow()
  })

  it('AA-5 未配置 key 的 503 归一为 AiUnavailableError（非流式）', async () => {
    setAiMockUnavailable(true)
    await expect(aiApi.chat({ sessionId: 'sid-503', prompt: '我想吃辣的' })).rejects.toBeInstanceOf(
      AiUnavailableError,
    )
  })

  it('AA-6 未配置 key 的 503 归一为 AiUnavailableError（流式同样识别）', async () => {
    setAiMockUnavailable(true)
    await expect(
      aiApi.streamChat({ sessionId: 'sid-503s', prompt: '我想吃辣的' }, { onChunk: () => undefined }),
    ).rejects.toBeInstanceOf(AiUnavailableError)
  })
})
