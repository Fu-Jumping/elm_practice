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
 * 2026-09-13 修正前置：本用例自 2026-09-07「加购需登录」口径（详见 StoreDetailView.spec T45）之后
 * 一直失效——不登录时 `.cart-bar` 根本不渲染，`waitFor` 必然超时（实测 30s 超时）。
 * 现改为经 `/login?redirect=` 登录后在同一 SPA 会话内加购（mock 的 GET /me 恒 401，
 * 整页刷新会丢会话，故不能用 goto 直接跳转目标页）。
 *
 * 运行：npm run test:e2e（webServer 会自动拉起 mock 模式 dev server）
 */
import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test('展开购物车抽屉应贴到视口底端并完全盖住购物车栏', async ({ page }) => {
  await page.goto('/login?redirect=%2Fstores%2Fm002')
  await page.getByTestId('demo-account-btn').click()
  await page.waitForURL((url) => url.pathname === '/stores/m002', { timeout: 15_000 })
  const addButton = page.locator('[data-testid^="add-btn-"]').first()
  await addButton.waitFor({ timeout: 15_000 })
  await addButton.click()
  await page.getByTestId('cart-bar').waitFor({ timeout: 15_000 })
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
