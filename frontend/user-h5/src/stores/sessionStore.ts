/**
 * 会话 store（架构约定 §3.4）：当前用户、登录态探活、登录/退出
 * 前端不保存 token、不接收身份 ID；登录态以服务端 Session + GET /me 探活为准，
 * 页面刷新后由守卫调用 checkLogin 自动恢复
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from '@/services/api'
import type { UserSummary } from '@/services/api/types'

export const useSessionStore = defineStore('session', () => {
  const user = ref<UserSummary | null>(null)
  const isLoggedIn = computed(() => user.value !== null)

  /** 探活（401 属预期：未登录），返回当前是否已登录 */
  async function checkLogin(): Promise<boolean> {
    try {
      user.value = await authApi.me()
    } catch {
      user.value = null
    }
    return isLoggedIn.value
  }

  async function login(account: string, password: string): Promise<UserSummary> {
    user.value = await authApi.login(account, password)
    return user.value
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } finally {
      user.value = null
    }
  }

  return { user, isLoggedIn, checkLogin, login, logout }
})
