/**
 * 商家详情页购物车抽屉贴底回归（2026-09-08）
 *
 * 缺陷：展开态抽屉底边悬在视口底上方 72px，而底部购物车栏只有 64px，
 * 两者之间留出 8px 透视缝；缝隙里露出遮罩之下的商品列表，且购物车栏被遮罩压住。
 * px→vw 换算（vite.config.ts，viewportWidth 390）下缝隙随视口变宽放大到 26px+。
 *
 * 期望行为：抽屉贴视口底端（底边与视口底边对齐），且完全盖住购物车栏。
 * 断言只测几何结果，不测 CSS 声明，避免退化成实现细节的复述。
 *
 * 运行：npm run test:e2e（webServer 会自动拉起 mock 模式 dev server）
 */
import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test('展开购物车抽屉应贴到视口底端并完全盖住购物车栏', async ({ page }) => {
  await page.goto('/stores/m002')
  await page.getByTestId('cart-bar').waitFor()
  await page.getByTestId('cart-bar').click()
  await expect(page.getByTestId('cart-popup')).toBeVisible()

  const metrics = await page.evaluate(() => {
    const popup = document.querySelector('[data-testid="cart-popup"]') as HTMLElement
    const bar = document.querySelector('[data-testid="cart-bar"]') as HTMLElement
    const popupRect = popup.getBoundingClientRect()
    const barRect = bar.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const bottomHit = document.elementFromPoint(
      window.innerWidth / 2,
      viewportHeight - 1,
    ) as HTMLElement | null
    return {
      gapToViewportBottom: +(viewportHeight - popupRect.bottom).toFixed(2),
      popupHeight: +popupRect.height.toFixed(2),
      barHeight: +barRect.height.toFixed(2),
      bottomPixelInsidePopup:
        bottomHit?.closest('[data-testid="cart-popup"]') !== null,
    }
  })

  expect(metrics.gapToViewportBottom, '抽屉底边必须贴住视口底端').toBeLessThanOrEqual(1)
  expect(metrics.popupHeight, '抽屉高度必须不小于购物车栏高度，才能完全盖住底栏').toBeGreaterThanOrEqual(
    metrics.barHeight,
  )
  expect(metrics.bottomPixelInsidePopup, '视口最底一像素应属于抽屉本体，而非遮罩或购物车栏').toBe(true)
})
