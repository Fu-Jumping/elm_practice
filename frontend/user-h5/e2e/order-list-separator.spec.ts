/**
 * 订单列表分隔回归（2026-09-08，负责人反馈"整体纯白、没有分隔线"）
 *
 * 设计稿真源：订单列表页面画布 #eeeeee（docs/design/exports/用户端/06-订单/01-订单列表
 * 的 .frame），卡片通栏白底、行间 8px 灰缝——分隔靠灰缝而非边框线。
 * 实现缺陷：页面底色写成 #f9f9f9，与白色仅差 6 个色阶（2.4%），灰缝肉眼不可见。
 *
 * 断言从用户视角取"两张卡片之间缝隙处实际看到的颜色"，不断言 CSS 声明字符串。
 * 运行：npm run test:e2e（webServer 复用或拉起 mock dev server）
 */
import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test('订单列表卡片之间的缝隙应显示页面画布底色（与白卡可辨识）', async ({ page }) => {
  await page.goto('/orders')
  // 订单页需登录：用登录页的演示账号一键登录，登录后回到订单列表
  await page.getByTestId('demo-account-btn').click()
  await page.getByTestId('order-card').first().waitFor()

  const metrics = await page.evaluate(() => {
    const cards = Array.from(
      document.querySelectorAll('[data-testid="order-card"]'),
    ) as HTMLElement[]
    if (cards.length < 2) return { cardCount: cards.length, gapColor: null, cardColor: null, gapHeight: 0 }

    /** 缝隙处最上层元素可能背景透明，向上取第一个非透明背景色 */
    function effectiveBg(el: Element | null): string | null {
      let node: Element | null = el
      while (node) {
        const bg = getComputedStyle(node).backgroundColor
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg
        node = node.parentElement
      }
      return null
    }

    const first = cards[0]!.getBoundingClientRect()
    const second = cards[1]!.getBoundingClientRect()
    const gapY = (first.bottom + second.top) / 2
    const gapEl = document.elementFromPoint(window.innerWidth / 2, gapY)
    return {
      cardCount: cards.length,
      gapColor: effectiveBg(gapEl),
      cardColor: effectiveBg(cards[0]),
      gapHeight: +(second.top - first.bottom).toFixed(1),
    }
  })

  expect(metrics.cardCount, '订单列表至少需要两张卡片才能观察到行间缝隙').toBeGreaterThanOrEqual(2)
  expect(metrics.gapHeight, '卡片之间应留出设计稿的 8px 灰缝').toBeGreaterThan(4)
  expect(metrics.cardColor, '订单卡片应为通栏白底').toBe('rgb(255, 255, 255)')
  expect(metrics.gapColor, '缝隙处应显示页面画布底色 #eeeeee（与白卡可辨识）').toBe(
    'rgb(238, 238, 238)',
  )
})
