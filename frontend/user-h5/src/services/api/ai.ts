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

/**
 * SSE（text/event-stream）分帧解析
 *
 * 口径（W3C EventSource）：**事件以空行结束**，一个事件的数据 = 它内部各 `data:` 行的值
 * 用 `\n` 连接后的结果。后端 `/ai/stream-chat` 每个 token 发一帧 `data:<token>`，
 * **换行 token 会落成同一事件内的多条空 `data:` 行**，因此必须按事件取值而不是按行取值：
 * 按行取值会同时丢掉空数据行与行间换行，表现就是模型回复整段挤成一行、`- ` 列表不再成列表
 * （2026-09-15 线上抓包定位，回归锁见 aiApi.spec.ts 的 AA-7~AA-9）。
 */
interface SseParserState {
  /** 尚未凑成完整一行的残留文本：跨 chunk 续接，`data:` 本身也可能被网络从中间切开 */
  buffer: string
  /** 当前事件已收到的 data 行 */
  dataLines: string[]
}

function createSseParser(): SseParserState {
  return { buffer: '', dataLines: [] }
}

/** 喂入一段原文，返回本次凑齐的事件数据（可能 0 个或多个） */
function feedSse(state: SseParserState, chunk: string): string[] {
  state.buffer += chunk
  const events: string[] = []
  for (;;) {
    const breakAt = state.buffer.indexOf('\n')
    if (breakAt === -1) break
    const line = state.buffer.slice(0, breakAt).replace(/\r$/, '')
    state.buffer = state.buffer.slice(breakAt + 1)
    if (line === '') {
      // 空行 = 事件结束：事件内 data 行按规范以 \n 连接（换行 token 正是在这里还原）
      if (state.dataLines.length > 0) events.push(state.dataLines.join('\n'))
      state.dataLines = []
      continue
    }
    if (line.startsWith(':')) continue // 注释行 / 心跳，忽略
    if (!line.startsWith('data:')) continue // 其余字段（event/id/retry）本接口不使用
    // 冒号后的空格**属于 token 本身**，不能当 data 字段的分隔符去掉：后端 SSE writer 不加分隔空格，
    // 线上实证 `data: `（冒号后一个空格）表示一个空格 token，模型回复里 `¥19.50 · 店名` 的空格全靠它，
    // 去掉会让空格全部消失、`- ` 列表标记也不再成立（AA-10）。
    state.dataLines.push(line.slice(5))
  }
  return events
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
    const sse = createSseParser()
    let reply = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      for (const piece of feedSse(sse, decoder.decode(value, { stream: true }))) {
        // 单条空 data 行的事件没有内容；`[DONE]` 是部分实现的流结束标记（本后端以关闭连接结束），
        // 两者都不上屏
        if (piece === '' || piece.trim() === '[DONE]') continue
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
