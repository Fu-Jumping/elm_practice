/**
 * 保真度巡检（TODO-USER-023）——结构断言 + 多视口断言，一条命令可复跑。
 *
 * 运行：cd frontend/user-h5 && npx playwright test e2e/design-fidelity.spec.ts
 * 产物：test-results/（截图与报告不入库，.gitignore 已覆盖）
 *
 * 历史锚点：docs/record/raw/2026-09-08/组长-1847.md（原脚本 test-results/design-fidelity/verify.cjs
 * 因落 test-results/ 未入库而丢失，本文件为仓库内重建版；原红端 23/23 失败 → 绿端 23/23 通过）
 *
 * ⚠️ 与 2026-09-08 版的口径差异（必须写明，否则会拿旧口径误判新页面）：
 *   旧版对 23 项**一律**要求「满宽 = 壳宽 + border-radius 0 + box-shadow none」。
 *   此后两天页面口径发生两次变化，旧口径对部分区块已不成立：
 *   ① CHG-003（2026-09-11）订单详情页按新真源重写：设计系统明确本页「配送信息 / 订单信息」为
 *      **白底卡片 + 1px 边线 + 8px 圆角**（docs/design/设计系统-用户端.md L203）→ 归 C 类；
 *   ② 我的页沿用导出稿本身的通栏形态与局部圆角/阴影：`border-radius: 0px 0px 24px 24px`
 *      （导出稿 index.module.scss L41）、菜单块 `box-shadow: 0px 1px 2px #0000000d`（L219/243）
 *      → 归 B 类（通栏，但按稿保留局部圆角/阴影）。
 *   故本脚本改为**按区块分层的判定表**：A 类＝原通栏口径；B 类＝通栏 + 按稿圆角/阴影；
 *   C 类＝白底卡片。每项均标「口径出处」。凡本脚本不校验的维度一律写 null 并注明原因，
 *   不做「按当前实现反推期望值」的循环论证。
 *
 * 结构断言判定式（A 类，出处 docs/frontend/UI复刻经验与执行约定.md §2.2）：
 *   「设计稿没有卡片壳就不要加壳」，判定必须看 圆角 + 阴影 + 边框 + 背景色 + 父级 padding 的组合。
 *   本脚本以其可机检的两条核心为准：① 满宽（左右边界与 .app-shell 内容区对齐，±1px）；
 *   ② border-radius = 0px；③ box-shadow = none。
 */
import { expect, test, type Page } from '@playwright/test'

/** 视口分层（断言 B）：约定 §2.12 要求多视口验收必须包含 320px */
const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
]

type Bleed = 'full' | 'inset' | null

interface Target {
  label: string
  route: string
  selector: string
  /** 历史实例数（2026-09-08）与当前最小期望；列表类随种子数据条数变化，只校验下限 */
  minCount: number
  bleed: Bleed
  radius: string | null
  shadow: 'none' | 'any' | null
  /** 口径出处（本脚本期望值的唯一依据） */
  source: string
  /** 进入该页的前置动作：cart = 先在店铺页加购再走结算（确认订单页需要购物车有商品） */
  prime?: 'cart'
  /** 2026-09-08 旧类名（若已改名，此处记录映射；当前类名均沿用） */
  legacy?: string
}

/**
 * 受检区块表（A/B/C 三类分层）
 * 旧类名核对（TODO-USER-023 要求）：8 个类名在当前代码中**全部沿用**（无改名），
 * 因此无需旧→新映射；实例数变化仅来自种子数据与新增区块（见下）。
 */
const TARGETS: Target[] = [
  // ---- A 类：通栏无壳（2026-09-08 回改口径，仍为这些页面的设计真源）----
  {
    label: '确认订单页 · 收货地址区',
    route: '/orders/confirm',
    selector: '.co-address',
    minCount: 1,
    bleed: 'full',
    radius: '0px',
    shadow: 'none',
    source: 'UI复刻约定 §2.2；06-订单/04-确认订单 导出稿（2026-09-08 通栏回改）',
    prime: 'cart',
  },
  {
    label: '确认订单页 · 送达时间',
    route: '/orders/confirm',
    selector: '.co-delivery',
    minCount: 1,
    bleed: 'full',
    radius: '0px',
    shadow: 'none',
    source: '同上',
    prime: 'cart',
  },
  {
    label: '确认订单页 · 商品明细',
    route: '/orders/confirm',
    selector: '.co-goods',
    minCount: 1,
    bleed: 'full',
    radius: '0px',
    shadow: 'none',
    source: '同上',
    prime: 'cart',
  },
  {
    label: '确认订单页 · 备注输入',
    route: '/orders/confirm',
    selector: '.co-remark',
    minCount: 1,
    bleed: 'full',
    radius: '0px',
    shadow: 'none',
    source: '同上',
    prime: 'cart',
  },
  {
    label: '确认订单页 · 红包选择区（2026-09-12 新增，无导出稿）',
    route: '/orders/confirm',
    selector: '.co-coupon',
    minCount: 1,
    bleed: 'full',
    radius: '0px',
    shadow: 'none',
    source: 'CHG-001 + 设计系统-用户端（该区块导出稿不存在，按设计系统「通栏白底分段」新建）',
    prime: 'cart',
  },
  {
    label: '订单列表页 · 订单卡（历史 10 实例，随种子订单数）',
    route: '/orders',
    selector: '.ol-card',
    minCount: 1,
    bleed: 'full',
    radius: '0px',
    shadow: 'none',
    source: 'UI复刻约定 §2.2；06-订单/01-订单列表 导出稿（2026-09-08 通栏回改）',
  },
  {
    label: '地址列表页 · 地址行（历史 2 实例，随地址种子条数）',
    route: '/addresses',
    selector: '.al-card',
    minCount: 1,
    bleed: 'full',
    radius: '0px',
    shadow: 'none',
    source: 'UI复刻约定 §2.2；10-个人中心/05-收货地址 导出稿（2026-09-08 去卡片壳）',
  },
  {
    label: '新增地址页 · 表单区',
    route: '/addresses/new',
    selector: '.ae-card',
    minCount: 1,
    bleed: 'full',
    radius: '0px',
    shadow: 'none',
    source: 'UI复刻约定 §2.2；10-个人中心/06-新增收货地址 导出稿（2026-09-08 改行式表单）',
  },
  {
    label: '商家详情页 · 点餐/评价 Tab（须与横幅同底通栏）',
    route: '/stores/m002',
    selector: '.store-tabs',
    minCount: 1,
    bleed: 'full',
    radius: '0px',
    shadow: 'none',
    source: 'UI复刻约定 §2.2；PRD 7.3（2026-09-08 去 8px 灰缝、补 border-top）',
  },

  // ---- B 类：通栏 + 按导出稿保留局部圆角/阴影 ----
  {
    label: '我的页 · 个人信息橙块（底部 24px 圆角，按稿）',
    route: '/mine',
    selector: '.mn-profile',
    minCount: 1,
    bleed: 'full',
    radius: '0px 0px 24px 24px',
    shadow: 'none',
    source: '10-个人中心/01-个人中心 导出稿 index.module.scss L41（2026-09-08 通栏回改并保留底部圆角）',
  },
  {
    label: '我的页 · 菜单块（按稿保留 1px 软阴影）',
    route: '/mine',
    selector: '.mn-menu',
    minCount: 1,
    bleed: 'full',
    radius: '0px',
    shadow: null, // 导出稿 L219/243 明示 box-shadow，故本脚本不校验阴影
    source: '10-个人中心/01-个人中心 导出稿 index.module.scss L219/243（阴影属设计本身，不判为偏差）',
  },

  // ---- C 类：白底卡片（CHG-003 新真源）----
  {
    label: '订单详情页 · 白底卡片（CHG-003 起为 8px 圆角卡片）',
    route: '/orders/o0001',
    selector: '.od-card',
    minCount: 3,
    bleed: null, // 卡片形态本身允许内缩，内缩量由设计稿决定，本脚本不校验
    radius: '8px',
    shadow: 'none', // 实现以 1px 边线表达层次（设计系统未要求阴影）
    source: '设计系统-用户端 L203（CHG-003：白底卡片 + 1px 边线 + 8px 圆角，取代 2026-09-08 的通栏口径）',
  },
]

/** 圆角数值比较（带容差）：px→vw 换算会让 8px 实测成 7.9989px / 24px 实测成 24.0006px，不能做字符串相等 */
function radiusMatches(actual: number[], expected: string, tolerance = 0.5): boolean {
  const parsed = expected.split(/\s+/).map((v) => Number.parseFloat(v))
  if (parsed.some((v) => Number.isNaN(v))) return false
  // 单值写法（如 `8px`）等价于四角同值；四值写法顺序为 左上 / 右上 / 右下 / 左下
  const want = parsed.length === 1 ? [parsed[0], parsed[0], parsed[0], parsed[0]] : parsed
  if (want.length !== 4 || actual.length !== 4) return false
  return want.every((value, index) => Math.abs(value - actual[index]) <= tolerance)
}

/**
 * 登录并客户端跳转到目标路由。
 *
 * 为什么不用「goto(目标) 等守卫弹登录」：/mine、/orders、/addresses 等页**没有** meta.auth，
 * 未登录时页面自己渲染未登录态（实测登录页根本不出现，`.mn-profile` 等区块不存在）；
 * 而 mock 的 `GET /me` 恒返回 401，任何整页刷新都会丢会话（会话只在 SPA 内存里）。
 * 因此统一走 `/login?redirect=<目标>`：登录成功后由 LoginView 客户端 `router.replace(redirect)`，
 * 同一次 SPA 会话内到达目标页，会话与 mock 内存态都不丢。
 */
async function loginThenGoto(page: Page, target: string): Promise<void> {
  const targetPath = target.split('?')[0]
  await page.goto(`/login?redirect=${encodeURIComponent(target)}`)
  await page.getByTestId('demo-account-btn').click()
  await page.waitForURL((url) => url.pathname === targetPath, { timeout: 15_000 })
}

/**
 * 确认订单页需要购物车有商品且**满足起送价**（m002 起送 ¥20，单份 ¥19.50 会被拦截）。
 * 同一商品连点两次（mock 合并数量）——第二次必须等首次请求落盘后再点，否则会被吞掉；
 * 判定用「购物车金额文本发生变化」而不是写死价格，避免绑定种子数值。
 */
async function primeCart(page: Page): Promise<void> {
  await loginThenGoto(page, '/stores/m002')
  const addButton = page.locator('[data-testid^="add-btn-"]').first()
  const total = page.getByTestId('cart-bar-total')
  await addButton.waitFor({ timeout: 15_000 })
  // 每次点击后必须等到金额真的变化再点下一次——连续快点会被防重点击吞掉（实测第二次无效）
  const baseline = (await total.textContent()) ?? ''
  await addButton.click()
  await expect(total).not.toHaveText(baseline, { timeout: 15_000 })
  const afterFirst = (await total.textContent()) ?? ''
  await addButton.click()
  await expect(total).not.toHaveText(afterFirst, { timeout: 15_000 })
  await page.getByTestId('checkout-btn').click()
  await page.waitForURL((url) => url.pathname === '/orders/confirm', { timeout: 15_000 })
}

/** 逐区块读取几何与视觉结果（只测渲染结果，不读 CSS 声明字符串） */
async function measure(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const shell = document.querySelector('.app-shell') as HTMLElement | null
    if (!shell) return { shellMissing: true, nodes: [] as unknown[] }
    const shellRect = shell.getBoundingClientRect()
    const nodes = Array.from(document.querySelectorAll(sel)) as HTMLElement[]
    return {
      shellMissing: false,
      shellWidth: +shellRect.width.toFixed(2),
      nodes: nodes.map((el) => {
        const rect = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        return {
          leftInset: +(rect.left - shellRect.left).toFixed(2),
          rightInset: +(shellRect.right - rect.right).toFixed(2),
          width: +rect.width.toFixed(2),
          // 四角圆角分别取值（设计稿中存在「只有底角圆角」的通栏块，如我的页橙块）
          radii: [
            Number.parseFloat(style.borderTopLeftRadius),
            Number.parseFloat(style.borderTopRightRadius),
            Number.parseFloat(style.borderBottomRightRadius),
            Number.parseFloat(style.borderBottomLeftRadius),
          ],
          radiusText: `${style.borderTopLeftRadius} ${style.borderTopRightRadius} ${style.borderBottomRightRadius} ${style.borderBottomLeftRadius}`,
          shadow: style.boxShadow,
        }
      }),
    }
  }, selector)
}

test.describe('保真度巡检 · 结构断言（通栏无壳 / 按稿圆角 / 白底卡片）', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  for (const target of TARGETS) {
    test(`结构 · ${target.label}`, async ({ page }) => {
      if (target.prime === 'cart') {
        await primeCart(page)
      } else {
        await loginThenGoto(page, target.route)
      }
      await page.waitForSelector(target.selector, { timeout: 15_000 })

      const result = await measure(page, target.selector)
      expect(result.shellMissing, '页面壳 .app-shell 必须存在').toBe(false)
      expect(
        result.nodes.length,
        `${target.selector} 实例数不足（期望 ≥ ${target.minCount}；出处：${target.source}）`,
      ).toBeGreaterThanOrEqual(target.minCount)

      const failures: string[] = []
      for (const [index, node] of result.nodes.entries()) {
        const n = node as {
          leftInset: number
          rightInset: number
          radii: number[]
          radiusText: string
          shadow: string
        }
        if (target.bleed === 'full') {
          if (Math.abs(n.leftInset) > 1 || Math.abs(n.rightInset) > 1) {
            failures.push(
              `#${index + 1} 未满宽：左内缩 ${n.leftInset}px、右内缩 ${n.rightInset}px（应为 0）`,
            )
          }
        } else if (target.bleed === 'inset') {
          if (n.leftInset <= 0 || Math.abs(n.leftInset - n.rightInset) > 1) {
            failures.push(
              `#${index + 1} 内缩不对称：左 ${n.leftInset}px、右 ${n.rightInset}px`,
            )
          }
        }
        if (target.radius !== null && !radiusMatches(n.radii, target.radius)) {
          failures.push(`#${index + 1} 圆角不符：实测 ${n.radiusText}，期望 ${target.radius}`)
        }
        if (target.shadow === 'none' && n.shadow !== 'none') {
          failures.push(`#${index + 1} 出现阴影：${n.shadow}`)
        }
      }

      // 结果口径：打印「通过 N / 受检 N」，失败时给出选择器与实测值
      const passed = result.nodes.length - new Set(failures.map((f) => f.split(' ')[0])).size
      console.log(
        `[保真度] ${target.label}：通过 ${passed} / 受检 ${result.nodes.length}` +
          (failures.length ? `\n  失败明细：${failures.join(' | ')}` : ''),
      )
      expect(failures, `结构断言失败（出处：${target.source}）`).toEqual([])
    })
  }
})

test.describe('保真度巡检 · 桌面预览壳宽（SHOW-QA-002）', () => {
  // SHOW-QA-002（问题记录 docs/testing/问题记录/2026-09-08-用户端页面壳430px居中失效.md）：
  // `.app-shell` 的 `max-width: 430px` 被 postcss-px-to-viewport（viewportWidth 390）换算成 110.256vw，
  // 宽度上限随视口放大失效（390 视口 429.998px、1280 视口 1411px），桌面预览的 430px 居中约束形同虚设。
  // 期望：桌面视口（>430）下壳宽恒为 430px 且水平居中；移动端 320–430 不受影响（上限大于视口，不会触发）。
  test('桌面 1280 视口 · 壳宽应为 430px 且水平居中（当前实现随视口放大而失效）', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    await page.waitForSelector('.merchant-card, .home-empty', { timeout: 15_000 })

    const metrics = await page.evaluate(() => {
      const shell = document.querySelector('.app-shell') as HTMLElement
      const rect = shell.getBoundingClientRect()
      return {
        shellWidth: +rect.width.toFixed(2),
        shellLeft: +rect.left.toFixed(2),
        viewportWidth: window.innerWidth,
      }
    })

    expect(metrics.shellWidth, '桌面预览壳宽应为 430px（而非随视口放大）').toBeCloseTo(430, 1)
    const expectedLeft = (metrics.viewportWidth - 430) / 2
    expect(
      Math.abs(metrics.shellLeft - expectedLeft),
      '壳应水平居中（左缘 = (视口宽 - 430) / 2）',
    ).toBeLessThanOrEqual(1)
  })
})

test.describe('保真度巡检 · 多视口断言（320 / 360 / 375 / 390 / 430）', () => {
  for (const viewport of VIEWPORTS) {
    test(`视口 ${viewport.width}×${viewport.height} · 无横向溢出 / 壳宽 / 底栏贴底 / 文字不裁切`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await page.waitForSelector('.merchant-card, .home-empty', { timeout: 15_000 })

      const metrics = await page.evaluate((vw) => {
        const shell = document.querySelector('.app-shell') as HTMLElement
        const shellRect = shell.getBoundingClientRect()
        const tabBar = document.querySelector('.tab-bar') as HTMLElement | null
        const tabRect = tabBar?.getBoundingClientRect() ?? null
        const bottomHit = document.elementFromPoint(
          window.innerWidth / 2,
          window.innerHeight - 1,
        ) as HTMLElement | null

        // 溢出元素：右侧超出视口 +1px 且未被 clip 的直接定位元素（装饰性元素单列白名单，见注释）
        const overflowers = Array.from(document.querySelectorAll('body *'))
          .filter((el) => {
            const r = (el as HTMLElement).getBoundingClientRect()
            return r.width > 0 && r.right > vw + 1
          })
          .slice(0, 5)
          .map((el) => `${el.tagName.toLowerCase()}.${(el as HTMLElement).className}`)

        // 文字不裁切：抽样关键词元素；声明了 text-overflow: ellipsis 的元素属设计内截断，跳过
        const textSelectors = ['.merchant-name', '.product-price-int', '.tab-label']
        const clipped: string[] = []
        for (const sel of textSelectors) {
          for (const el of Array.from(document.querySelectorAll(sel)) as HTMLElement[]) {
            const style = getComputedStyle(el)
            if (style.textOverflow === 'ellipsis') continue
            if (el.scrollWidth > el.clientWidth + 1) {
              clipped.push(`${sel}「${el.textContent?.trim().slice(0, 8)}」`)
            }
          }
        }

        return {
          docScrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          shellWidth: +shellRect.width.toFixed(2),
          shellLeft: +shellRect.left.toFixed(2),
          tabBarBottom: tabRect ? +(window.innerHeight - tabRect.bottom).toFixed(2) : null,
          bottomPixelInTabBar: bottomHit?.closest('.tab-bar') !== null,
          overflowers,
          clipped,
        }
      }, viewport.width)

      expect(metrics.docScrollWidth, '文档不得横向溢出视口').toBeLessThanOrEqual(
        metrics.innerWidth,
      )
      expect(metrics.overflowers, '不应存在右侧超出视口的元素').toEqual([])
      expect(metrics.shellWidth, '页面壳宽度 = 视口宽').toBeCloseTo(viewport.width, 0)
      expect(metrics.shellLeft, '页面壳左边界贴视口左缘').toBeLessThanOrEqual(1)
      expect(metrics.tabBarBottom, '底部导航贴视口底端').toBeLessThanOrEqual(1)
      expect(metrics.bottomPixelInTabBar, '视口最底一像素应属于底部导航').toBe(true)
      expect(metrics.clipped, '抽样关键词文字不得被裁切').toEqual([])
    })
  }
})
