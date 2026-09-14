/**
 * AI 点餐助手接口层（契约 §10.6 + AI点餐助手前端PRD §4.3/§5.1/§6.3）
 *
 * - 非流式：`POST /ai/chat` → `{sessionId, reply}`（走 http 层统一拆包与错误归一）
 * - 流式：`POST /ai/stream-chat` → `text/event-stream` 文本分片，逐段 `onChunk` 回调（PRD §4.3 逐字显示）
 *   流式**不返回** sessionId，故 sessionId 由调用方（页面，经 utils/aiChatSession）持有并随请求传入
 * - 错误归一：未配 key 的 503（契约 §10.6）→ `AiUnavailableError`；超时（PRD §6.3 的 30s）→ `AiTimeoutError`；
 *   其余错误原样抛出，由页面按 §6.3 异常表分流（网络失败 / 400-500 / 降级非流式）
 * - mock 模式：非流式走工程内替身（`mocks/ai.ts`），流式由替身回复按分片节流吐出，页面代码双模式无感知
 */
import { request } from '@/services/http'
import { endpoints } from './endpoints'
import type { AiChatPayload, AiChatResult } from './types'

/** 单次回复超时（PRD §6.3：接口超时 >30s 由页面提示「回复超时，请重试」） */
export const AI_TIMEOUT_MS = 30_000

/** 流式分片间隔（仅 mock 模式用；真实模式分片由后端 SSE 节奏决定） */
const MOCK_CHUNK_DELAY_MS = 6
const MOCK_CHUNK_SIZE = 6

/** 未配置 DEEPSEEK_API_KEY（契约 §10.6 的 503）：页面提示「AI 助手暂不可用，请稍后再试」 */
export class AiUnavailableError extends Error {
  constructor() {
    super('AI 助手暂不可用，请稍后再试')
    this.name = 'AiUnavailableError'
  }
}

/** 回复超时（PRD §6.3）：页面在气泡内提示「回复超时，请重试」并提供重发 */
export class AiTimeoutError extends Error {
  constructor() {
    super('回复超时，请重试')
    this.name = 'AiTimeoutError'
  }
}

export interface AiStreamOptions {
  onChunk: (chunk: string) => void
  signal?: AbortSignal
}

function toAiError(err: unknown): unknown {
  const candidate = err as { status?: number; code?: number } | undefined
  if (candidate && (candidate.status === 503 || candidate.code === 50301)) {
    return new AiUnavailableError()
  }
  return err
}

/** 非流式对话（同时是流式失败时的降级通道，PRD §4.3） */
export async function chat(payload: AiChatPayload): Promise<AiChatResult> {
  try {
    return await request<AiChatResult>({
      method: 'POST',
      url: endpoints.ai.chat,
      data: payload,
      timeout: AI_TIMEOUT_MS,
    })
  } catch (err) {
    throw toAiError(err)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 把整段回复切成小块，模拟 SSE 分段（mock 模式） */
function splitChunks(text: string): string[] {
  if (text.length <= MOCK_CHUNK_SIZE) return [text]
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += MOCK_CHUNK_SIZE) {
    chunks.push(text.slice(i, i + MOCK_CHUNK_SIZE))
  }
  return chunks
}

async function mockStreamChat(
  payload: AiChatPayload,
  options: AiStreamOptions,
): Promise<AiChatResult> {
  // 替身先产出完整回复（含 400/503 等错误归一），再按分片节流吐出
  const result = await chat(payload)
  for (const chunk of splitChunks(result.reply)) {
    if (options.signal?.aborted) throw new DOMException('已取消', 'AbortError')
    options.onChunk(chunk)
    await sleep(MOCK_CHUNK_DELAY_MS)
  }
  return result
}

async function realStreamChat(
  payload: AiChatPayload,
  options: AiStreamOptions,
): Promise<AiChatResult> {
  const controller = new AbortController()
  const onAbort = (): void => controller.abort()
  options.signal?.addEventListener('abort', onAbort)
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, AI_TIMEOUT_MS)

  try {
    const base = import.meta.env.VITE_API_BASE_URL ?? ''
    const response = await fetch(`${base}${endpoints.ai.streamChat}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (response.status === 503) throw new AiUnavailableError()
    if (!response.ok) {
      const detail = (await response.json().catch(() => undefined)) as
        | { message?: string }
        | undefined
      throw new Error(detail?.message ?? `请求失败（HTTP ${response.status}）`)
    }
    if (!response.body) throw new Error('当前环境不支持流式响应')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let reply = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, '')
        if (!line.startsWith('data:')) continue
        const piece = line.slice(5).replace(/^ /, '')
        if (piece === '' || piece === '[DONE]') continue
        reply += piece
        options.onChunk(piece)
      }
    }
    return { sessionId: payload.sessionId, reply }
  } catch (err) {
    if (timedOut) throw new AiTimeoutError()
    throw toAiError(err)
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', onAbort)
  }
}

/** 流式对话（PRD §4.3 优先使用；失败由页面降级到 `chat`） */
export function streamChat(
  payload: AiChatPayload,
  options: AiStreamOptions,
): Promise<AiChatResult> {
  if (import.meta.env.VITE_API_MODE === 'mock') return mockStreamChat(payload, options)
  return realStreamChat(payload, options)
}
