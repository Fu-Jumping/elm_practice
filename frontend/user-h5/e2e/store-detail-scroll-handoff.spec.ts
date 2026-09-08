/**
 * 商家详情页滚动交接回归（2026-09-08，负责人真机反馈）
 *
 * 缺陷：鼠标悬停在右侧商品列表上滚动时，滚轮被内层 .product-list 直接捕获——
 * 外层整页不动、内层直接滚，与项目规则 §5「先滚外层到点餐/评价 Tab 吸顶线，
 * 再滚左右两栏」不符；连带观感是吸顶中的分区标题条"跟着滚、与 Tab 之间有空隙"。
 *
 * 期望行为（本用例锁定）：
 * 1. 外层未滚到 Tab 吸顶线时：滚轮只滚外层，商品列表与左分类栏都不滚；
 * 2. 外层到吸顶线后：滚轮只滚商品列表，外层不再滚；
 * 3. 吸顶后商品列表容器位置稳定，当前分区标题贴住列表容器顶部（紧贴 Tab 下沿）。
 *
 * 断言只测滚动量与几何，不测 CSS 声明（jsdom 无布局，布局类断言只能落 E2E）。
 * 注意：必须用 mouse.move 定位指针，不能用 locator.hover()——Playwright 的 hover
 * 会把元素滚进视口，等于把页面直接滚到吸顶状态，测不到"未吸顶"阶段（2026-09-08 取证）。
 *
 * 运行：npm run test:e2e（webServer 复用或拉起 mock dev server）
 */
import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

/** 把指针移到商品列表中心（不触发滚动，见文件头注释） */
async function pointAtProductList(page: Page): Promise<void> {
  const box = await page.getByTestId('product-list').boundingBox()
  if (!box) throw new Error('商品列表未渲染，无法定位指针')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
}

async function readMetrics(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector('.app-main') as HTMLElement
    const list = document.querySelector('[data-testid="product-list"]') as HTMLElement
    const rail = document.querySelector('.cat-rail') as HTMLElement
    const tabs = document.querySelector('.store-tabs') as HTMLElement
    const header = document.querySelector('.detail-header') as HTMLElement
    const titles = Array.from(
      document.querySelectorAll('[data-testid^="product-section-"]'),
    ) as HTMLElement[]
    const listRect = list.getBoundingClientRect()
    // 当前可见的分区标题：第一个顶边已越过列表容器顶边的标题
    const pinned = titles.find((t) => t.getBoundingClientRect().top >= listRect.top - 1)
    return {
      mainScrollTop: main.scrollTop,
      mainMaxScroll: main.scrollHeight - main.clientHeight,
      listScrollTop: list.scrollTop,
      railScrollTop: rail.scrollTop,
      tabsTop: +tabs.getBoundingClientRect().top.toFixed(2),
      headerHeight: header.offsetHeight,
      listTop: +listRect.top.toFixed(2),
      pinnedTitleTop: pinned ? +pinned.getBoundingClientRect().top.toFixed(2) : null,
    }
  })
}

test('滚轮应先滚外层到 Tab 吸顶线再滚商品列表，吸顶后标题条贴住列表顶部', async ({ page }) => {
  await page.goto('/stores/m002')
  await page.getByTestId('product-list').waitFor()
  await pointAtProductList(page)

  // 阶段一：小步滚轮（不足以吸顶）——外层应滚、内层应不动
  await page.mouse.wheel(0, 100)
  await page.waitForTimeout(400)
  const s1 = await readMetrics(page)
  expect(s1.mainScrollTop, '未吸顶时滚轮应先滚外层整页').toBeGreaterThan(50)
  expect(s1.listScrollTop, '未吸顶时商品列表不应滚动').toBe(0)
  expect(s1.railScrollTop, '未吸顶时左分类栏不应滚动').toBe(0)

  // 阶段二：继续滚到吸顶（Tab 贴到顶部栏下沿）
  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(500)
  const s2 = await readMetrics(page)
  expect(s2.tabsTop, '外层应能滚到 Tab 吸顶线').toBeLessThanOrEqual(s2.headerHeight + 1)

  // 阶段三：吸顶后把内层归零再滚轮——只滚商品列表，外层不再滚，标题条贴住列表容器顶部
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="product-list"]') as HTMLElement
    el.scrollTop = 0
  })
  await page.waitForTimeout(200)
  const before = await readMetrics(page)
  await pointAtProductList(page)
  await page.mouse.wheel(0, 200)
  await page.waitForTimeout(500)
  const s3 = await readMetrics(page)
  expect(s3.listScrollTop, '吸顶后滚轮应滚商品列表').toBeGreaterThan(0)
  expect(s3.mainScrollTop, '吸顶后外层不应再滚').toBeLessThanOrEqual(before.mainScrollTop + 1)
  expect(
    s3.pinnedTitleTop ?? Number.POSITIVE_INFINITY,
    '吸顶后当前分区标题应贴住列表容器顶部',
  ).toBeLessThanOrEqual(s3.listTop + 1)
})
