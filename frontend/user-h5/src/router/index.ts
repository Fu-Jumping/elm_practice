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
  scrollBehavior(_to, _from, savedPosition) {
    // 浏览器返回/前进（popstate）恢复原滚动位置；普通跳转回顶部（T65/T66，2026-09-07 负责人需求）
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
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
          // 商家详情：无底部导航（底部为购物车栏）；未登录可浏览
          path: 'stores/:storeId',
          name: 'store-detail',
          component: () => import('@/views/user/StoreDetailView.vue'),
          meta: { title: '商家详情', priority: 'P0' },
        },
        {
          // 确认订单：query 携带 storeId（PRD 顶部栏行：参数缺失返回商家列表）；页面内做登录校验
          path: 'orders/confirm',
          name: 'order-confirm',
          component: () => import('@/views/user/ConfirmOrderView.vue'),
          meta: { title: '确认订单', priority: 'P0' },
        },
        {
          // 订单详情：参数为订单号；明细含在详情（P0）
          path: 'orders/:orderId',
          name: 'order-detail',
          component: () => import('@/views/user/OrderDetailView.vue'),
          meta: { title: '订单详情', priority: 'P0' },
        },
        {
          // 地址管理：列表（管理场景点击进入编辑；确认订单选择回填待第三批）
          path: 'addresses',
          name: 'address-list',
          component: () => import('@/views/user/AddressListView.vue'),
          meta: { title: '收货地址', priority: 'P0' },
        },
        {
          path: 'addresses/new',
          name: 'address-new',
          component: () => import('@/views/user/AddressEditView.vue'),
          meta: { title: '新增地址', priority: 'P0' },
        },
        {
          path: 'addresses/:addressId/edit',
          name: 'address-edit',
          component: () => import('@/views/user/AddressEditView.vue'),
          meta: { title: '编辑地址', priority: 'P0' },
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
          component: () => import('@/views/user/OrderListView.vue'),
          meta: { title: '订单', tab: true, auth: true, priority: 'P0' },
        },
        {
          // 我的：PRD 862 列"未登录显示去登录"——页面内处理引导，不设路由守卫（2026-09-07 口径）
          path: 'mine',
          name: 'mine',
          component: () => import('@/views/user/MineView.vue'),
          meta: { title: '我的', tab: true, priority: 'P0' },
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
      // 注册页：公开页（不设 auth）；顶部栏返回目标为登录页（PRD 7.16.1 注册页-顶部栏行）
      path: '/register',
      component: () => import('@/layouts/BlankLayout.vue'),
      children: [
        {
          path: '',
          name: 'register',
          component: () => import('@/views/user/RegisterView.vue'),
          meta: { title: '注册', priority: 'P0' },
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
