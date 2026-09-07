import { describe, expect, it } from 'vitest'
import router from '@/router'

/**
 * 路由滚动行为测试 T65–T66（2026-09-07 负责人需求：从商家详情返回商家列表时保持原浏览位置）
 * T65 浏览器返回/前进（popstate，savedPosition 存在）→ 恢复原滚动位置
 * T66 普通跳转（push，无 savedPosition）→ 回到页面顶部
 * 断言形态：直接调用 router.options.scrollBehavior 断言返回值（jsdom 无真实布局，行为级锁定）
 */
describe('scrollBehavior 路由滚动行为', () => {
  const scrollBehavior = router.options.scrollBehavior!
  const to = { path: '/', name: 'home' }
  const from = { path: '/stores/m002', name: 'store-detail' }

  it('T65 返回/前进（savedPosition 存在）→ 恢复原滚动位置', () => {
    const saved = { left: 0, top: 420 }
    expect(scrollBehavior(to as never, from as never, saved)).toEqual(saved)
  })

  it('T66 普通跳转（无 savedPosition）→ 回到顶部', () => {
    expect(scrollBehavior(to as never, from as never, null)).toEqual({ top: 0 })
  })
})
