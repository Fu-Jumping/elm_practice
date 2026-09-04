/**
 * 路由表 + 全局守卫（架构约定 §3.2）
 * - 全路由懒加载；meta 约定：title / tab / auth / priority
 * - 守卫：meta.auth 且未登录 → 跳登录页并带 redirect，登录成功后回原页
 * - 底部导航固定"首页/消息/订单/我的"，由 MainLayout 统一渲染
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/sessionStore'

declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题（document.title） */
    title: string
    /** 是否显示 MainLayout 底部导航 */
    tab?: boolean
    /** 是否需登录；守卫据此拦截 */
    auth?: boolean
    /** P0/P1/P2，与 PRD 页面矩阵对应，验收与演示排期用 */
    priority?: 'P0' | 'P1' | 'P2'
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/user/HomeView.vue'),
          meta: { title: '首页', tab: true, priority: 'P0' },
        },
        {
          path: 'messages',
          name: 'messages',
          component: () => import('@/views/user/PlaceholderView.vue'),
          meta: { title: '消息', tab: true, auth: true, priority: 'P1' },
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/views/user/PlaceholderView.vue'),
          meta: { title: '订单', tab: true, auth: true, priority: 'P0' },
        },
        {
          path: 'mine',
          name: 'mine',
          component: () => import('@/views/user/PlaceholderView.vue'),
          meta: { title: '我的', tab: true, auth: true, priority: 'P0' },
        },
      ],
    },
    {
      path: '/login',
      component: () => import('@/layouts/BlankLayout.vue'),
      children: [
        {
          path: '',
          name: 'login',
          component: () => import('@/views/user/LoginView.vue'),
          meta: { title: '登录', priority: 'P0' },
        },
      ],
    },
    {
      // 显式 404 页，不静默重定向首页
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: '页面不存在' },
    },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} · 轻量外卖`
  }
  // 需登录页：探活（GET /me）确认会话；未登录跳登录页并保留回跳地址
  if (to.meta.auth) {
    const session = useSessionStore()
    if (!session.isLoggedIn) {
      await session.checkLogin()
      if (!session.isLoggedIn) {
        return { name: 'login', query: { redirect: to.fullPath } }
      }
    }
  }
})

export default router
