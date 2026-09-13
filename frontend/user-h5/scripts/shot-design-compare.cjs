/**
 * 设计稿像素比对 · 截图脚本（TODO-USER-024，§4.2）
 *
 * 用途：把「实现截图」与「设计稿导出」对齐到同一口径，供 tools/design-diff/pixel_diff.py 比对。
 * 本脚本**不是 CI 门禁**，只用于结课汇报的保真度取证（原因见 §4.2 口径 2、3：数据驱动区域天然不同、
 * 仅「画布 393 的精细版」能整图对齐）。
 *
 * 运行：node scripts/shot-design-compare.cjs [url] [outDir]
 *   默认 url = http://localhost:5173（mock 模式 dev server，先 `npm run dev -- --mode mock` 拉起）
 *   默认 outDir = test-results/design-diff（已 gitignore，不入库）
 *
 * 截图口径（§4.2 定稿）：
 *   - 视口 393×852，deviceScaleFactor 2（与设计稿 786×1704 同尺度）
 *   - 关闭 animation / transition，等 document.fonts.ready 后静置 1.5s 再截
 *   - 同时导出各分区（定位栏/搜索区/分类宫格/活动区/筛选标签/商家卡）的实测 y 区间，
 *     供分带比对使用（分带只用于归因，主门禁是几何/色值/结构断言）
 *
 * 环境注意：与 e2e 同一口径——用本机 chrome（channel: 'chrome'），若 Playwright 自带浏览器
 *   版本不匹配可用 CHROME_EXE 指定可执行文件，避免额外下载。
 */
const path = require('path')
const fs = require('fs')
const { chromium } = require('@playwright/test')

const URL = process.argv[2] || 'http://localhost:5173'
const OUT_DIR = path.resolve(__dirname, '..', process.argv[3] || 'test-results/design-diff')

/** 分带定义：selector → 带名（选择器取自 HomeView 的实际结构，2026-09-13 核对） */
const BANDS = [
  ['.location-bar', '定位栏'],
  ['.search-section', '搜索区'],
  ['.cat-grid', '分类宫格'],
  ['.promo-area', '活动区'],
  ['.filter-bar', '筛选标签'],
  ['.merchant-card', '商家卡'],
]

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({
    channel: 'chrome',
    executablePath: process.env.CHROME_EXE || undefined,
    args: ['--no-proxy-server'],
  })
  const page = await browser.newPage({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
  })

  await page.goto(URL, { waitUntil: 'load' })
  // 关动画与过渡，避免截图捕捉到中间态
  await page.addStyleTag({
    content: `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`,
  })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForSelector('.merchant-card, .home-empty', { timeout: 15000 })
  await page.waitForTimeout(1500)

  // 守卫：数据没加载成功时的截图毫无比对价值（会造成「保真度很差」的误判），直接中止并给出处置提示
  const pageText = await page.evaluate(() => document.body.innerText)
  const cards = await page.locator('.merchant-card').count()
  if (cards === 0 || /请求失败|加载失败/.test(pageText)) {
    await page.screenshot({ path: path.join(OUT_DIR, 'abort-screenshot.png') })
    throw new Error(
      '首页没有渲染出商家卡（疑似数据源不是 mock 模式或后端不可达）。\n' +
        '  处置：确认 5173 上的 dev server 是以 `npm run dev -- --mode mock` 启动的（本机常驻的\n' +
        '  .env.development.local 会把模式锁成 real，导致代理到 4000 失败、判定为网络错误）。\n' +
        `  现场截图已存 ${path.join(OUT_DIR, 'abort-screenshot.png')}`,
    )
  }

  const shotPath = path.join(OUT_DIR, 'impl-home.png')
  await page.screenshot({ path: shotPath })

  // 分带实测区间（页面上各分区相对视口顶部的 y 区间，@1x 坐标）
  const bands = await page.evaluate((defs) => {
    const out = []
    for (const [selector, label] of defs) {
      const el = document.querySelector(selector)
      if (!el) {
        out.push({ label, selector, found: false })
        continue
      }
      const r = el.getBoundingClientRect()
      out.push({
        label,
        selector,
        found: true,
        top: +r.top.toFixed(1),
        bottom: +r.bottom.toFixed(1),
        height: +r.height.toFixed(1),
      })
    }
    return out
  }, BANDS)
  const bandsPath = path.join(OUT_DIR, 'bands.json')
  fs.writeFileSync(bandsPath, JSON.stringify({ url: URL, viewport: '393x852@2x', bands }, null, 2))

  console.log(`[截图] ${shotPath}`)
  console.log(`[分带] ${bandsPath}`)
  for (const b of bands) {
    console.log(`  ${b.label}: ${b.found ? `y ${b.top} → ${b.bottom}（高 ${b.height}）` : '未找到（跳过）'}`)
  }
  await browser.close()
}

main().catch((e) => {
  console.error('[截图失败]', e.message)
  process.exit(1)
})
