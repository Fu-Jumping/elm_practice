/**
 * mock 路由器（架构约定 §3.3 / §7.6）：mock/real 切换收敛在 http 层，
 * 本模块负责"给定 method+url 返回 {status, payload}"，模拟 200–500ms 网络延迟
 * 各域以"纯数据映射"注册（authMocks/storeMocks），避免模块顶层执行期互相调用（ESM 循环依赖陷阱）
 */
import type { ApiResponse } from '@/services/api/types'
import { authMocks } from './auth'
import { storeMocks } from './store'
import { cartMocks } from './cart'
import { addressMocks } from './address'
import { orderMocks } from './order'
import { reviewMocks } from './review'

export interface MockResponse<T = unknown> {
  status: number
  payload: ApiResponse<T>
}

export interface MockContext {
  method: string
  url: string
  params?: Record<string, unknown>
  data?: unknown
}

export type MockHandler = (ctx: MockContext) => MockResponse | Promise<MockResponse>

/** key 格式：`METHOD path`（path 不含 /api/v1 前缀，与 endpoints.ts 保持一致）；
 *  支持 `:param` 动态路径段（如 'GET /orders/:orderId'），精确匹配优先 */
const handlers = new Map<string, MockHandler>([
  ...Object.entries(authMocks),
  ...Object.entries(storeMocks),
  ...Object.entries(cartMocks),
  ...Object.entries(addressMocks),
  ...Object.entries(orderMocks),
  ...Object.entries(reviewMocks),
])

/** 动态路径注册表：含 `:param` 段的 key 在加载期拆解为分段模板，请求期逐段比对 */
const dynamicHandlers = [...handlers.keys()]
  .filter((key) => key.includes(':'))
  .map((key) => {
    const [method, ...segments] = key.split(' ')
    return { method, segments: segments[0]!.split('/').filter(Boolean), key }
  })

function findHandler(method: string, path: string): MockHandler | undefined {
  const exact = handlers.get(`${method} ${path}`)
  if (exact) return exact
  const pathSegments = path.split('/').filter(Boolean)
  for (const dyn of dynamicHandlers) {
    if (dyn.method !== method || dyn.segments.length !== pathSegments.length) continue
    const pathParams: Record<string, string> = {}
    let matched = true
    dyn.segments.forEach((seg, i) => {
      if (seg.startsWith(':')) pathParams[seg.slice(1)] = decodeURIComponent(pathSegments[i]!)
      else if (seg !== pathSegments[i]) matched = false
    })
    if (!matched) continue
    // 路径参数并入 ctx.params（与查询参数同通道，键名不冲突）
    const handler = handlers.get(dyn.key)!
    return (ctx) => handler({ ...ctx, params: { ...pathParams, ...ctx.params } })
  }
  return undefined
}

/** HTTP 层成功/失败包装（与契约响应结构一致） */
export function ok<T>(data: T): MockResponse<T> {
  return { status: 200, payload: { code: 0, message: 'success', data } }
}

export function fail(status: number, code: number, message: string): MockResponse<null> {
  return { status, payload: { code, message, data: null } }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function mockDispatch(config: {
  method?: string
  url?: string
  params?: Record<string, unknown>
  data?: unknown
}): Promise<MockResponse> {
  const method = (config.method ?? 'get').toUpperCase()
  const path = config.url ?? ''
  const handler = findHandler(method, path)

  // 模拟网络延迟 200–500ms（mock 离线可跑，不依赖外部服务）
  await delay(200 + Math.random() * 300)

  if (!handler) {
    return fail(404, 40400, `mock 未定义：${method} ${path}（联调/新增接口时补注册）`)
  }
  return handler({ method, url: path, params: config.params, data: config.data })
}
