import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AiUnavailableError, aiApi } from '@/services/api'
import { resetAiMockState, setAiMockUnavailable } from '@/mocks/ai'
import { parseAiReply } from '@/utils/aiReply'

/**
 * AI 对话接口层用例（契约 §10.6 + AI点餐助手前端PRD §4.1/§4.3/§5.1/§6.3）
 *
 * - AA-1~AA-6（2026-09-14）：接口层口径——非流式/流式响应形状、多轮记忆、400 与 503 归一。
 * - AA-7~AA-10（2026-09-15）：**真实模式 SSE 分帧**——换行与空格是本轮修复的缺陷点，
 *   用例帧形状取自线上真实抓包（见 `docs/record/raw/2026-09-15/用户端.md` 14:16 小节）。
 *
 * 口径出处：
 * - 契约 §10.6：`POST /ai/chat`（非流式）与 `POST /ai/stream-chat`（`text/event-stream` 分段）；
 *   请求 `{sessionId?, prompt}`；`/chat` 响应 `{sessionId, reply}`；未配置 key 时 503。
 * - PRD §4.1：Markdown 渲染——`**加粗**`、`- 项` 无序列表、**换行 `\n` 保留**。
 * - PRD §4.3：优先流式，SSE 不可用/失败降级到非流式；流式分片实时回调。
 * - PRD §5.1：`sessionId` 由前端持久化并在后续请求携带（**实现补充**：`/stream-chat` 只返回文本分片、
 *   不回 `sessionId`，故 sessionId 由前端生成后随每次请求传入；契约 §10.6 明确「不传则后端生成」，传即采用）。
 * - PRD §6.3：503（未配 key）单独识别，页面提示「AI 助手暂不可用」。
 * 本组在 feat: 实现前必须红（`services/api/ai.ts` / `mocks/ai.ts` 由 feat: 创建）；
 * AA-7~AA-10 是缺陷修复的回归锁（修复前 4 条全红，红端输出见上述 raw 留痕）。
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
    expect(first.reply).toContain('肯德基宅急送')

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

/**
 * AI 流式 SSE 分帧（真实模式 text/event-stream）
 *
 * 缺陷（2026-09-15 线上抓包定位）：`/ai/stream-chat` 每个 token 发一帧 `data:<token>`，
 * **换行 token 是同一事件内的多条空 `data:` 行**——按 text/event-stream 规范，
 * 一个事件的数据是它内部各 `data:` 行的值以 `\n` 连接后才得到的内容。原实现按行拆、
 * 把每行 `data:` 当独立分片、并直接丢弃空值分片，导致模型回复里的换行全部丢失：
 * 整段回复渲染成一行，`- ` 列表标记也不再成列表（渲染层 `parseAiReply` 本身是正确的）。
 * 帧形状取自线上真实抓包，证据片段见 `docs/record/raw/2026-09-15/用户端.md`。
 */
const frame = (text: string): string => `data:${text}\n\n`
/** 换行 token 的真实帧：一个事件内两条空 data 行 → 事件数据为 "\n" */
const NEWLINE_FRAME = 'data:\ndata:\n\n'
const REAL_WIRE_FRAMES =
  frame('想吃辣的') +
  frame('：') +
  NEWLINE_FRAME +
  frame('- ') +
  frame('**香辣鸡腿堡 ¥19.50**') +
  NEWLINE_FRAME +
  frame('要不要加饮品？') +
  frame('[DONE]')
/** 正确分帧后的回复（两处换行必须保留） */
const EXPECTED_REPLY = '想吃辣的：\n- **香辣鸡腿堡 ¥19.50**\n要不要加饮品？'

describe('AI 流式 SSE 分帧（真实模式）', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  /** 以给定分片喂给 fetch 的响应体，覆盖跨 chunk 续接 */
  function stubSseFetch(pieces: string[]): void {
    const encoder = new TextEncoder()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            for (const piece of pieces) controller.enqueue(encoder.encode(piece))
            controller.close()
          },
        }),
      })),
    )
  }

  async function collectStream(): Promise<{ reply: string; chunks: string[] }> {
    const chunks: string[] = []
    const done = await aiApi.streamChat(
      { sessionId: 'sid-sse', prompt: '推荐点辣的' },
      { onChunk: (chunk) => chunks.push(chunk) },
    )
    return { reply: done.reply, chunks }
  }

  it('AA-7 真实模式下流式回复保留换行：换行事件不得被丢弃', async () => {
    vi.stubEnv('VITE_API_MODE', 'real')
    // 故意从中间断开，覆盖跨 chunk 的行续接
    const cut = REAL_WIRE_FRAMES.indexOf('**香辣')
    stubSseFetch([REAL_WIRE_FRAMES.slice(0, cut), REAL_WIRE_FRAMES.slice(cut)])

    const { reply, chunks } = await collectStream()

    expect(reply).toBe(EXPECTED_REPLY)
    expect(chunks.join('')).toBe(EXPECTED_REPLY)
    expect(chunks.join('')).not.toContain('[DONE]')
  })

  it('AA-8 任意分片边界都不丢换行（逐字符喂入，含 data: 被截断）', async () => {
    vi.stubEnv('VITE_API_MODE', 'real')
    stubSseFetch([...REAL_WIRE_FRAMES])

    const { reply } = await collectStream()

    expect(reply).toBe(EXPECTED_REPLY)
  })

  it('AA-9 保留换行后渲染层能还原段落与列表（用户可见效果）', async () => {
    vi.stubEnv('VITE_API_MODE', 'real')
    stubSseFetch([REAL_WIRE_FRAMES])

    const { reply } = await collectStream()
    const blocks = parseAiReply(reply)

    expect(blocks.map((block) => block.kind)).toEqual(['paragraph', 'list', 'paragraph'])
    expect(blocks[1]?.kind === 'list' && blocks[1].items).toHaveLength(1)
  })

  it('AA-10 空格本身是独立 token：不得被当成 data 字段分隔符吃掉', async () => {
    vi.stubEnv('VITE_API_MODE', 'real')
    // 线上帧形状：`data: `（冒号后一个空格）表示该 token 就是一个空格，
    // 与 `data:`（无空格，空 token）是两回事——后端 SSE writer 不加字段分隔空格
    stubSseFetch([
      frame('香辣鸡腿堡') +
        'data: \n\n' +
        frame('¥19.50') +
        'data: \n\n' +
        frame('·') +
        'data: \n\n' +
        frame('肯德基宅急送'),
    ])

    const { reply } = await collectStream()

    expect(reply).toBe('香辣鸡腿堡 ¥19.50 · 肯德基宅急送')
  })
})
