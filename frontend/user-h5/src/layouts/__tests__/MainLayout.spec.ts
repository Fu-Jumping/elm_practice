import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import MainLayout from '../MainLayout.vue'
import HomeView from '@/views/user/HomeView.vue'
import { useCatalogStore } from '@/stores/catalogStore'
import { resolveNavKind } from '@/router/navHistory'

/**
 * 布局滚动与首页缓存测试 S1–S3（2026-09-08 负责人需求：返回首页停留原浏览位置）
 * 背景：app-main 为独立滚动容器（壳 100dvh overflow hidden），vue-router scrollBehavior
 * 只滚 window 从未生效（T65/T66 仅单测函数返回值）；MainLayout 旧 watch 每次路由变化
 * 强制置顶，返回也中招（真浏览器取证：进店前 scrollTop=800 → 返回后 0）。
 * S1 导航类型判定矩阵（resolveNavKind：back/forward/push/replace 按 history 条目号）
 * S2 首页 KeepAlive：返回不重挂载（组件实例复用）+ onActivated 重新拉数（PRD 通用规则 6 返回重读）
 * S3 滚动管线：push/replace → 内容区置顶；back/forward → 恢复该路由停留位置
 */
describe('MainLayout 内容区滚动管线与首页缓存', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('S1 resolveNavKind 按 history 条目号判定 back/forward/push/replace', () => {
    // prev=导航前停留条目，maxSeen=会话内到过的最大条目，next=导航后条目
    expect(resolveNavKind(5, 6, 3)).toBe('back') // 回退到旧条目
    expect(resolveNavKind(3, 6, 5)).toBe('forward') // 前进复用旧条目（≤ maxSeen）
    expect(resolveNavKind(5, 6, 7)).toBe('push') // 越过最大条目 → 新推送
    expect(resolveNavKind(5, 6, 5)).toBe('replace') // 条目不变 → 替换
  })

  it('S2 首页 KeepAlive：返回不重挂载（实例复用）且 onActivated 重新拉数', async () => {
    const catalogStore = useCatalogStore()
    const spy = vi.spyOn(catalogStore, 'fetchStores')
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: MainLayout,
          children: [
            { path: '', name: 'home', component: HomeView },
            {
              path: 'stores/:storeId',
              name: 'store-detail',
              component: { template: '<div class="fake-detail" />' },
            },
          ],
        },
      ],
    })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(MainLayout, { global: { plugins: [router] } })
    await flushPromises()
    const first = wrapper.findComponent(HomeView)
    expect(first.exists()).toBe(true)
    expect(spy).toHaveBeenCalledTimes(1)

    // 进店再返回（KeepAlive：实例复用不重挂载；activated 重读列表）
    await router.push('/stores/m002')
    await flushPromises()
    await router.push('/')
    await flushPromises()
    const second = wrapper.findComponent(HomeView)
    expect(second.exists()).toBe(true)
    // KeepAlive 实例复用：内部组件实例为同一引用（.vm 代理每次访问会重建，不能比代理）
    expect(second.vm.$).toBe(first.vm.$)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('S3 滚动管线：push 置顶；back 恢复原停留位置', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: MainLayout,
          children: [
            { path: '', name: 'home', component: { template: '<div class="fake-home" />' } },
            {
              path: 'stores/:storeId',
              name: 'store-detail',
              component: { template: '<div class="fake-detail" />' },
            },
          ],
        },
      ],
    })
    // 模拟 vue-router web history 写入的条目号（memory history 不驱动 window.history，由测试代管）
    window.history.replaceState({ position: 1 }, '')
    await router.push('/')
    await router.isReady()
    const wrapper = mount(MainLayout, { global: { plugins: [router] } })
    const main = wrapper.find('main.app-main')
    expect(main.exists()).toBe(true)

    // 首页滚到 800 并记录
    main.element.scrollTop = 800
    await main.trigger('scroll')

    // push 进店 → 内容区置顶
    window.history.replaceState({ position: 2 }, '')
    await router.push('/stores/m002')
    await flushPromises()
    expect(main.element.scrollTop).toBe(0)

    // 返回首页 → 恢复 800
    window.history.replaceState({ position: 1 }, '')
    await router.back()
    await flushPromises()
    expect(main.element.scrollTop).toBe(800)
  })
})
