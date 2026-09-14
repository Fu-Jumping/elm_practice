/**
 * 复刻对照截图 · 截图脚本（2026-09-14，补齐「复刻对照截图待补」）
 *
 * 用途：在 mock 模式下把用户端各页面截成图，供 `tools/design-diff/` 与人工对照设计稿导出；
 * 输出到 `docs/prd-assets/user/replica-compare-<日期>/`（入库，供交叉验收与答辩材料引用）。
 *
 * 运行：先起 mock dev server（`npm run dev -- --mode mock`），再
 *   node scripts/shot-replica-compare.cjs
 *
 * 口径与 `shot-design-compare.cjs` 一致：视口 393×852、deviceScaleFactor 2、关动画、
 * 等字体就绪后静置再截。
 *
 * 会话注意（沿用 e2e/design-fidelity.spec.ts 的结论）：会话只在 SPA 内存里，
 * **整页刷新会丢会话**，因此每个目标统一走 `/login?redirect=<目标>` → 点演示账号 → 由 LoginView
 * 客户端跳转，保证到达目标页时会话与 mock 内存态都还在；需要多步的流程（加购→确认→支付→弹层）
 * 在同一个 SPA 会话内串起来。
 */
const path = require('path')
const fs = require('fs')
const { chromium } = require('@playwright/test')

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const OUT = path.resolve(__dirname, '../../../docs/prd-assets/user/replica-compare-2026-09-14')

async function freeze(page) {
  await page.addStyleTag({
    content: `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`,
  })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(900)
}

async function shot(page, name, waitForSelector) {
  if (waitForSelector) await page.waitForSelector(waitForSelector, { timeout: 20000 })
  await freeze(page)
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file })
  console.log(`[截图] ${name}.png`)
}

/** 登录并客户端跳到目标路由（整页刷新会丢会话，故必须走这条路径） */
async function loginAndGoto(page, target, waitForSelector) {
  await page.goto(`${BASE}/login?redirect=${encodeURIComponent(target)}`)
  await page.getByTestId('demo-account-btn').click()
  const targetPath = target.split('?')[0]
  await page.waitForURL((url) => url.pathname === targetPath, { timeout: 20000 })
  if (waitForSelector) await page.waitForSelector(waitForSelector, { timeout: 20000 })
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    channel: 'chrome',
    executablePath: process.env.CHROME_EXE || undefined,
    args: ['--no-proxy-server'],
  })
  const page = await browser.newPage({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
  })

  // ① 首页（TODO-USER-030 红包入口所在的分类宫格）
  await loginAndGoto(page, '/', '.merchant-card')
  await shot(page, '01-首页')

  // ② 搜索结果页（TODO-USER-005）
  await loginAndGoto(page, '/search?keyword=肯德基', '[data-testid="search-merchant-card"]')
  await shot(page, '02-搜索结果页')

  // ③ 分类商家列表页（TODO-USER-107②，本次新增）
  await loginAndGoto(page, '/category/c101?name=%E4%B8%BB%E9%A3%9F', '[data-testid="category-store-card"]')
  await shot(page, '03-分类商家列表页')

  // ④ 加购 → 确认订单页（TODO-USER-006 红包选择区）
  await loginAndGoto(page, '/stores/m002', '[data-testid^="add-btn-"]')
  const addBtn = page.locator('[data-testid^="add-btn-"]').first()
  const total = page.getByTestId('cart-bar-total')
  const baseline = (await total.textContent()) ?? ''
  await addBtn.click()
  await page.waitForFunction(
    (b) => document.querySelector('[data-testid="cart-bar-total"]')?.textContent !== b,
    baseline,
    { timeout: 20000 },
  )
  const afterFirst = (await total.textContent()) ?? ''
  await addBtn.click()
  await page.waitForFunction(
    (b) => document.querySelector('[data-testid="cart-bar-total"]')?.textContent !== b,
    afterFirst,
    { timeout: 20000 },
  )
  await page.getByTestId('checkout-btn').click()
  await page.waitForURL((url) => url.pathname === '/orders/confirm', { timeout: 20000 })
  await shot(page, '04-确认订单页', '[data-testid="amount-detail"]')

  // ⑤ 确认订单页 · 红包选择弹层
  await page.getByTestId('coupon-select').click()
  await shot(page, '05-确认订单页-红包选择', '[data-testid="coupon-sheet"]')
  await page.getByTestId('coupon-none-btn').click()
  await page.waitForTimeout(400)

  // ⑥ 提交订单 → 支付页（TODO-USER-008 倒计时 / TODO-USER-105）
  await page.getByTestId('submit-order-btn').click()
  await page.waitForURL((url) => url.pathname.endsWith('/pay'), { timeout: 20000 })
  await shot(page, '06-支付页', '[data-testid="amount-line"]')

  // ⑦ 取消确认弹层（TODO-USER-002）
  await page.getByTestId('pay-cancel-entry').click()
  await shot(page, '07-取消确认弹层', '[data-testid="cancel-sheet"]')
  await page.getByTestId('cancel-sheet-close').click()
  await page.waitForTimeout(400)

  // ⑧ 订单列表（TODO-USER-008 再来一单入口所在页）
  await loginAndGoto(page, '/orders', '[data-testid="order-card"]')
  await shot(page, '08-订单列表')

  // ⑨ 订单详情页（TODO-USER-104：状态头 + 五节点时间线 + 金额明细）
  await loginAndGoto(page, '/orders/o0001', '[data-testid="amount-line"]')
  await shot(page, '09-订单详情页')

  // ⑩ 收藏页与会员权益页（TODO-USER-006）
  await loginAndGoto(page, '/favorites', '[data-testid="favorite-card"], [data-testid="favorite-empty"]')
  await shot(page, '10-收藏页')
  await loginAndGoto(page, '/member', '[data-testid="member-hero"]')
  await shot(page, '11-会员权益页')

  // ⑪ 红包页与爆红包浮层（TODO-USER-028 / 029）
  await loginAndGoto(page, '/coupons', '[data-testid="blast-card"]')
  await shot(page, '12-红包页')
  await page.getByTestId('blast-free-btn').click()
  await shot(page, '13-爆红包浮层', '[data-testid="blast-overlay"]')

  await browser.close()
  console.log(`\n共 13 张，输出目录：${OUT}`)
  console.log('未覆盖：评价提交页与评价图片上传（TODO-USER-003/007）——mock 种子只有 PROCESSING 订单，'
    + '需真实后端在 9/16 交叉验收时补，或在发布后 real 模式补。')
}

main().catch((e) => {
  console.error('[截图失败]', e.message)
  process.exit(1)
})
