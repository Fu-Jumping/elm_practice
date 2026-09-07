/**
 * 请求层（架构约定 §3.3 / §7.6）：
 * - axios 单实例：baseURL 读环境变量、withCredentials（Session Cookie）、timeout 10s
 * - mock/real 切换收敛在本层一处，api 层只写业务请求，页面代码对双模式无感知
 * - 业务归一：code=0 → 直接 return data；code!==0 → toast + reject（BizError）
 * - HTTP 错误：401 → 静默处理探活（/me）/其余跳登录带 redirect；其余状态码统一 toast 契约 message
 */
import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { toast } from '@/utils/toast'
import router from '@/router'
import { mockDispatch, type MockResponse } from '@/mocks'
import type { ApiResponse } from '@/services/api/types'

/** 业务错误：业务层 catch 后可读 message / code */
export class BizError extends Error {
  code: number
  status: number

  constructor(message: string, code: number, status: number) {
    super(message)
    this.name = 'BizError'
    this.code = code
    this.status = status
  }
}

const isMockMode = (): boolean => import.meta.env.VITE_API_MODE === 'mock'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 10_000,
})

/** 请求拦截器：同 method+url+参数 的进行中请求用 AbortController 取消旧的（防重复提交） */
const pending = new Map<string, AbortController>()

function requestKey(config: AxiosRequestConfig): string {
  return [
    config.method ?? 'get',
    config.url ?? '',
    JSON.stringify(config.params ?? {}),
    JSON.stringify(config.data ?? {}),
  ].join('|')
}

http.interceptors.request.use((config) => {
  const key = requestKey(config)
  pending.get(key)?.abort()
  const controller = new AbortController()
  pending.set(key, controller)
  config.signal = controller.signal
  return config
})

/** HTTP 层错误：toast 契约 message；401 未登录 → 受保护页跳登录带 redirect */
function handleHttpError(status: number, payload: ApiResponse | undefined, url?: string): never {
  const message = payload?.message ?? `请求失败（HTTP ${status}）`
  if (status === 401) {
    if (url?.endsWith('/auth/login')) {
      // 登录接口自身的 401 是业务失败（账号或密码错误，A6 口径）：提示但不跳转
      toast(message)
    } else if (router.currentRoute.value.meta.auth === true) {
      // XA-06 联调修正（2026-09-07）：公开页面（如商家详情购物车栏 /cart）未登录 401 属预期，
      // 静默降级，不再全局跳登录（PRD：未登录可浏览）；仅受保护页面由 401 引导登录
      if (!url?.endsWith('/me')) {
        toast(message)
      }
      void router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    }
  } else {
    toast(message)
  }
  throw new BizError(message, payload?.code ?? -1, status)
}

/** 业务层归一：code=0 直接返回 data；code!==0 → toast + reject */
function settle<T>(payload: ApiResponse<T>): T {
  if (payload.code !== 0) {
    toast(payload.message)
    throw new BizError(payload.message, payload.code, 200)
  }
  return payload.data
}

/** 统一请求入口：mock/real 双模式分发，调用方拿到的都是干净业务数据 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  if (isMockMode()) {
    // mock 返回 unknown 载荷，由调用方的泛型 T 收口（契约字段以 types.ts 为准）
    const res = (await mockDispatch(config)) as MockResponse<T>
    if (res.status >= 400) {
      handleHttpError(res.status, res.payload, config.url)
    }
    return settle<T>(res.payload)
  }

  try {
    const resp = await http.request(config)
    return settle<T>(resp.data as ApiResponse<T>)
  } catch (err) {
    // 被新请求主动取消：静默
    const code = (err as { code?: string })?.code
    if (axios.isCancel(err) || code === 'ERR_CANCELED') {
      throw err
    }
    const axiosErr = err as AxiosError<ApiResponse>
    return handleHttpError(
      axiosErr.response?.status ?? 0,
      axiosErr.response?.data,
      config.url,
    )
  }
}
