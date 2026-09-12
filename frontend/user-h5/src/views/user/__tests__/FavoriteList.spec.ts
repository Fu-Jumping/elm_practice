import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import FavoriteListView from '../FavoriteListView.vue'
import StoreDetailView from '../StoreDetailView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { onToast } from '@/utils/toast'
import { FAVORITE_SEED, favoriteMockState } from '@/mocks/favorite'
import { clearMockCart } from '@/mocks/cart'

/**
 * 收藏链路 FA 组（批次⑥ TODO-USER-006，2026-09-12）
 * 出处：PRD 7.16.1「我的收藏页」三行（顶部栏/收藏商家列表/底部导航）、PRD 6.11 商家收藏（688 行
 * 商家详情收藏/取消 icon 状态切换）、契约 §3.7、TC-FAV-001/002/006。
 * 视觉真源：docs/design/exports/用户端/10-个人中心/02-我的收藏/。
 * FA-1 收藏列表：商家卡字段来自收藏接口，按收藏时间倒序
 * FA-2 空收藏 → 空态提示 + 去逛逛入口（TC-FAV-006）
 * FA-3 取消收藏：先二次确认再调接口，成功后卡片移除；取消确认则不发请求
 * FA-4 未登录进入 → 跳登录并带 redirect（PRD：未登录跳转登录）
 * FA-5 商家详情收藏入口：已收藏高亮、点击切换并调接口（TC-FAV-001）；未登录点收藏先引导登录
 * 口径：接口字段缺失只隐藏对应字段（促销标签/配送时长/距离为 PRD 873 展示要求，
 * 契约 §3.7 收藏对象尚未含这三个字段，已按「返回才展示」实现并登记契约缺口）
 */
describe('收藏链路（批次⑥ TODO-USER-006）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  beforeEach(() => {
    messages.length = 0
    offToast = onToast((message) => messages.push(message))
    favoriteMockState.splice(0, favoriteMockState.length, ...FAVORITE_SEED.map((item) => ({ ...item })))
    clearMockCart('m002')
  })

  afterEach(() => {
    offToast?.()
    vi.restoreAllMocks()
  })

  function buildRouter() {
    return createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/login', name: 'login', component: { template: '<div />' } },
        { path: '/favorites', name: 'favorites', component: FavoriteListView },
        { path: '/stores/:storeId', name: 'store-detail', component: StoreDetailView },
      ],
    })
  }

  async function mountFavorite(
    pinia: ReturnType<typeof createPinia> | undefined = undefined,
    path = '/favorites',
  ) {
    const p = pinia ?? createPinia()
    setActivePinia(p)
    const router = buildRouter()
    await router.push(path)
    await router.isReady()
    const wrapper = mount(FavoriteListView, { global: { plugins: [p, router] } })
    return { wrapper, router }
  }

  function login() {
    const pinia = createPinia()
    setActivePinia(pinia)
    useSessionStore().user = { account: '13800000001', nickname: '张同学' }
    return pinia
  }

  it('FA-1 收藏列表按收藏时间倒序渲染商家卡（名称/评分/月售/时长与距离/促销标签）', async () => {
    const pinia = login()
    const { wrapper } = await mountFavorite(pinia)
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="favorite-card"]').length).toBe(2),
      { timeout: 2000 },
    )
    const cards = wrapper.findAll('[data-testid="favorite-card"]')
    // 最新收藏在前（m002 肯德基宅急送 2026-09-10 > m001 老王小店 2026-09-09）
    expect(cards[0]!.text()).toContain('肯德基宅急送')
    expect(cards[0]!.text()).toContain('4.8')
    expect(cards[0]!.text()).toContain('月售3500+')
    expect(cards[0]!.text()).toContain('25分钟')
    expect(cards[0]!.text()).toContain('2.4km')
    expect(cards[0]!.text()).toContain('满50减10')
    expect(cards[1]!.text()).toContain('老王小店')
    // 顶部栏标题固定
    expect(wrapper.find('[data-testid="favorite-header"]').text()).toContain('我的收藏')
  })

  it('FA-2 无收藏 → 空态提示与去逛逛入口（TC-FAV-006）', async () => {
    const pinia = login()
    favoriteMockState.splice(0, favoriteMockState.length)
    const { wrapper, router } = await mountFavorite(pinia)
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="favorite-empty"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="favorite-empty"]').text()).toContain('暂无收藏')
    await wrapper.find('[data-testid="favorite-empty-go"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('FA-3 取消收藏先二次确认；确认后调接口并从列表移除，取消确认则不发请求', async () => {
    const pinia = login()
    const { wrapper } = await mountFavorite(pinia)
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="favorite-card"]').length).toBe(2),
      { timeout: 2000 },
    )
    // 二次确认选「取消」→ 不发请求、列表不变
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await wrapper.findAll('[data-testid="unfavorite-btn"]')[0]!.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="favorite-card"]')).toHaveLength(2)
    // 二次确认选「确定」→ 调用取消接口，成功后卡片从列表移除
    confirmSpy.mockReturnValue(true)
    await wrapper.findAll('[data-testid="unfavorite-btn"]')[0]!.trigger('click')
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="favorite-card"]').length).toBe(1),
      { timeout: 2000 },
    )
    expect(favoriteMockState.some((item) => item.storeId === 'm002')).toBe(false)
    expect(messages).toContain('已取消收藏')
  })

  it('FA-4 未登录进入收藏页 → 跳登录并带 redirect', async () => {
    const { router } = await mountFavorite(undefined)
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'), { timeout: 2000 })
    expect(String(router.currentRoute.value.query.redirect)).toContain('/favorites')
  })

  it('FA-5 商家详情收藏入口：已收藏高亮，点击取消收藏并调接口（TC-FAV-001）', async () => {
    const pinia = login()
    const router = buildRouter()
    await router.push('/stores/m002')
    await router.isReady()
    const wrapper = mount(StoreDetailView, { global: { plugins: [pinia, router] } })
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="favorite-toggle"]').exists()).toBe(true),
      { timeout: 10000 },
    )
    // m002 已在收藏种子内 → 初始为已收藏态
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="favorite-toggle"]').attributes('aria-pressed')).toBe('true'),
      { timeout: 2000 },
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await wrapper.find('[data-testid="favorite-toggle"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="favorite-toggle"]').attributes('aria-pressed')).toBe('false'),
      { timeout: 2000 },
    )
    expect(favoriteMockState.some((item) => item.storeId === 'm002')).toBe(false)
  })

  it('FA-6 未登录点收藏 → 引导登录并带 redirect，不静默失败', async () => {
    const router = buildRouter()
    await router.push('/stores/m002')
    await router.isReady()
    const wrapper = mount(StoreDetailView, { global: { plugins: [createPinia(), router] } })
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="favorite-toggle"]').exists()).toBe(true),
      { timeout: 10000 },
    )
    await wrapper.find('[data-testid="favorite-toggle"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'), { timeout: 2000 })
    expect(String(router.currentRoute.value.query.redirect)).toContain('/stores/m002')
  })
})
