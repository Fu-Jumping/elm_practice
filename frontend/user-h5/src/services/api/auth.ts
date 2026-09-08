/**
 * 认证域接口（契约 §3.1）
 * 会话为服务端 Session Cookie：前端不保存 token、不接收身份 ID，登录态靠 GET /me 探活
 */
import { request } from '@/services/http'
import type { UserSummary } from './types'
import { endpoints } from './endpoints'

export function login(account: string, password: string): Promise<UserSummary> {
  return request<UserSummary>({
    method: 'POST',
    url: endpoints.auth.login,
    data: { account, password, role: 'user' },
  })
}

export function logout(): Promise<null> {
  return request<null>({ method: 'POST', url: endpoints.auth.logout })
}

/** 探活：401 即未登录（由 http 层静默处理，守卫据此跳登录页） */
export function me(): Promise<UserSummary> {
  return request<UserSummary>({ method: 'GET', url: endpoints.auth.me })
}

/** 注册：创建账号并返回用户摘要（契约 §3.1）；成功响应不含密码 */
export function register(form: { account: string; password: string; nickname: string }): Promise<UserSummary> {
  return request<UserSummary>({
    method: 'POST',
    url: endpoints.user.register,
    data: form,
  })
}