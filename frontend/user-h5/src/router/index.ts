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
    // 注意：本工程滚动发生在 MainLayout 的 .app-main 独立容器上，window 级滚动不生效——
    // 真实现见 MainLayout 滚动管线（2026-09-08，返回恢复浏览位置）
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
          // 支付页（待支付收银台）：批次⑩ CHG-003，设计真源 12-订单与支付/02-支付页（PRD 7.5/7.16.1）
          path: 'orders/:orderId/pay',
          name: 'order-pay',
          component: () => import('@/views/user/OrderPayView.vue'),
          meta: { title: '支付', auth: true, priority: 'P1' },
        },
        {
          // 聊天详情（批次⑩ TODO-USER-004b）：会话头部 + 订单状态卡 + 消息时间线 + 底部输入区
          path: 'messages/:conversationId',
          name: 'chat-detail',
          component: () => import('@/views/user/ChatDetailView.vue'),
          meta: { title: '聊天详情', auth: true, priority: 'P1' },
        },
        {
          // 评价订单页：批次⑩ TODO-USER-003（PRD 7.7/7.16.1，设计真源 08-评价/01-评价订单）
          path: 'orders/:orderId/review',
          name: 'order-review',
          component: () => import('@/views/user/ReviewOrderView.vue'),
          meta: { title: '评价订单', auth: true, priority: 'P1' },
        },
        {
          // 支付成功页：批次⑩ 105b 实现设计真稿（07-支付/03-支付成功）；105a 先提供可跳转骨架
          path: 'orders/:orderId/pay-success',
          name: 'pay-success',
          component: () => import('@/views/user/PaySuccessView.vue'),
          meta: { title: '支付成功', auth: true, priority: 'P1' },
        },
        {
          // 支付失败页：批次⑩ 105b 实现设计真稿（07-支付/04-支付失败）；105a 先提供可跳转骨架
          path: 'orders/:orderId/pay-fail',
          name: 'pay-fail',
          component: () => import('@/views/user/PayFailView.vue'),
          meta: { title: '支付失败', auth: true, priority: 'P1' },
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
          // 消息中心（批次⑩ TODO-USER-004a）：通知三类 + 商家会话（契约 §3.9/§6.1）
          path: 'messages',
          name: 'messages',
          component: () => import('@/views/user/MessageCenterView.vue'),
          meta: { title: '消息', tab: true, auth: true, priority: 'P1' },
        },
        {
          // 搜索页（输入页，TODO-USER-107）：关键词输入 + 最近搜索 + 热门搜索（PRD 7.16.1 首页-搜索框行）
          path: 'search-entry',
          name: 'search-entry',
          component: () => import('@/views/user/SearchEntryView.vue'),
          meta: { title: '搜索', priority: 'P1' },
        },
        {
          // 搜索结果页（批次⑤ TODO-USER-005）：关键词/分类条件 + 排序（综合·销量·距离）+ 分页（契约 §3.6）
          path: 'search',
          name: 'search',
          component: () => import('@/views/user/SearchResultView.vue'),
          meta: { title: '搜索', priority: 'P1' },
        },
        {
          // 分类商家列表页（TODO-USER-107 ②）：分类来自店铺自身 categories，`GET /stores?categoryId=&sort=`（契约 §3.2）
          path: 'category/:categoryId',
          name: 'category-store-list',
          component: () => import('@/views/user/CategoryStoreListView.vue'),
          meta: { title: '分类商家', priority: 'P1' },
        },
        {
          // AI 点餐助手对话页（AI点餐助手前端PRD §2.1：首页悬浮球/搜索框/我的三处入口进入；
          // 无底部导航、页面内自带返回；未登录可用，与「未登录可浏览」口径一致）
          path: 'ai-chat',
          name: 'ai-chat',
          component: () => import('@/views/user/AiChatView.vue'),
          meta: { title: 'AI 点餐助手', priority: 'P2' },
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
        {
          // 我的收藏（批次⑥ TODO-USER-006）：收藏商家列表，可取消收藏（契约 §3.7）
          path: 'favorites',
          name: 'favorites',
          component: () => import('@/views/user/FavoriteListView.vue'),
          meta: { title: '我的收藏', tab: true, auth: true, priority: 'P1' },
        },
        {
          // 红包页（批次⑥/CHG-001 TODO-USER-028）：天天红包 = 加量通栏 + 天天必爆活动卡 + 可用红包列表
          path: 'coupons',
          name: 'coupons',
          component: () => import('@/views/user/CouponView.vue'),
          meta: { title: '天天红包', tab: true, auth: true, priority: 'P1' },
        },
        {
          // 会员权益（批次⑥ TODO-USER-006）：会员标识与权益说明；本期不提供开通/续费（契约 §3.8）
          path: 'member',
          name: 'member',
          component: () => import('@/views/user/MemberView.vue'),
          meta: { title: '会员权益', auth: true, priority: 'P1' },
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
