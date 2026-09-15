import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PX_PER_VW_AT_MAX_VIEWPORT,
  VW_MAX_VIEWPORT,
  capVwValue,
  vwScaleCapPlugin,
} from '../vwScaleCap'

/**
 * px→vw 缩放上限用例 CE-1~CE-9（TODO-USER-112，2026-09-15）
 *
 * 被测对象是**构建期 PostCSS 插件**（frontend/user-h5/src/utils/vwScaleCap.ts，经 vite.config.ts 接入）。
 * 断言口径不看「字符串长什么样」，而是把收口后的 `min(Nvw, Cpx)` **按视口宽求值**，校验两件事：
 *   ① 视口 ≤430px（移动端真机验收口径 320–430）时，求值结果逐像素等于收口前的 `Nvw`；
 *   ② 视口 >430px 时冻结在「430px 视口」的缩放上，不再随窗口放大。
 * 上游换算关系（`P px → P/390*100 vw`）按 postcss-px-to-viewport-8-plugin@1.2.5 的
 * `createPxReplace`/`toFixed` 在本文件内复刻，避免把期望值写成「按当前实现反推」。
 */

/** 上游 viewportWidth（vite.config.ts 的 pxToViewport.viewportWidth，PRD 主要设计宽 390） */
const DESIGN_WIDTH = 390

/** 复刻上游 toFixed(number, 3) + ${parsedVal}vw（负号由上游正则之外的 - 保留，故本函数只收正值） */
function designPxToVw(pixels: number): string {
  const multiplier = 10 ** 4
  const wholeNumber = Math.floor((pixels / DESIGN_WIDTH) * 100 * multiplier)
  const fixed = (Math.round(wholeNumber / 10) * 10) / multiplier
  return fixed === 0 ? '0' : `${fixed}vw`
}

/** 拆出收口写法：`min(Nvw, Cpx)` / 负值 `calc(-1 * min(Nvw, Cpx))` */
function parseCapped(capped: string): { negative: boolean; vw: number; cap: number } {
  const negative = capped.startsWith('calc(-1 * ')
  const inner = negative ? capped.slice('calc(-1 * '.length, -1) : capped
  const matched = /^min\((\d*\.?\d+)vw, (\d*\.?\d+)px\)$/.exec(inner)
  if (!matched) throw new Error(`不是预期的收口写法：${capped}`)
  return {
    negative,
    vw: Number.parseFloat(matched[1] ?? 'NaN'),
    cap: Number.parseFloat(matched[2] ?? 'NaN'),
  }
}

/** 把收口结果按视口宽求值：`min(Nvw, Cpx)`，负值形式取负 */
function resolveAt(capped: string, viewportWidth: number): number {
  const { negative, vw, cap } = parseCapped(capped)
  const value = Math.min((vw * viewportWidth) / 100, cap)
  return negative ? -value : value
}

/** 收口后的 px 上限 */
function capOf(capped: string): number {
  return parseCapped(capped).cap
}

/** 移动端验收视口（与 e2e/design-fidelity.spec.ts 的 VIEWPORTS 同档） */
const MOBILE_VIEWPORTS = [320, 360, 375, 390, 430]
/** 桌面预览视口（1163 为缺陷实测窗口宽，1280 为保真巡检口径） */
const DESKTOP_VIEWPORTS = [431, 768, 1163, 1280, 1920]

describe('vw 缩放上限 · 上游换算关系自检（CE-1）', () => {
  it('CE-1 设计 390px → 100vw、430px → 110.256vw、71px → 18.205vw（390 基准与换算来源）', () => {
    expect(designPxToVw(390)).toBe('100vw')
    expect(designPxToVw(430)).toBe('110.256vw')
    expect(designPxToVw(71)).toBe('18.205vw')
    expect(VW_MAX_VIEWPORT).toBe(430)
    expect(PX_PER_VW_AT_MAX_VIEWPORT).toBe(4.3)
  })
})

describe('vw 缩放上限 · 并入构建管线（CE-2）', () => {
  it('CE-2 vite.config.ts 已按「先换算、后收口」的顺序接入收口插件', () => {
    // 不执行配置工厂：vite.config.ts 里 `new URL('./src', import.meta.url)` 依赖 file:// 协议，
    // 在 vitest 的模块环境下会抛「The URL must be of scheme file」，故改为对配置源做装配检查。
    const config = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8')
    expect(config).toContain("import { vwScaleCapPlugin } from './src/utils/vwScaleCap'")
    const convertAt = config.indexOf('pxToViewport({')
    const capAt = config.indexOf('vwScaleCapPlugin,')
    expect(convertAt).toBeGreaterThan(-1)
    expect(capAt).toBeGreaterThan(convertAt)
  })
})

describe('vw 缩放上限 · 视口 ≤430px（移动端真机口径）求值不变（CE-3/CE-4）', () => {
  it('CE-3 仓库实际用到的设计值在 320/360/375/390/430 五档都取 vw 原值', () => {
    // 8px 圆角 / 12px 页面边距 / 48px 顶部栏 / 71px 购物车栏高 / 317px 缺陷实测购物车栏高 / 430px 壳宽 / 844px 画布高
    for (const pixels of [8, 12, 48, 71, 317, 430, 844]) {
      const vw = designPxToVw(pixels)
      const capped = capVwValue(vw)
      const magnitude = Number.parseFloat(vw)
      for (const viewportWidth of MOBILE_VIEWPORTS) {
        expect(resolveAt(capped, viewportWidth), `${vw} @ ${viewportWidth}px`).toBeCloseTo(
          (magnitude * viewportWidth) / 100,
          9,
        )
      }
    }
  })

  it('CE-4 全量扫描：设计 2–2000px 的每个换算结果，其 px 上限恒 ≥ 430px 视口下的 vw 值', () => {
    let checked = 0
    for (let pixels = 2; pixels <= 2000; pixels += 1) {
      const vw = designPxToVw(pixels)
      if (vw === '0') continue
      const magnitude = Number.parseFloat(vw)
      const capped = capVwValue(vw)
      const cap = capOf(capped)
      const atMaxViewport = (magnitude * VW_MAX_VIEWPORT) / 100
      // 不变量：cap ≥「430px 视口下的 vw 渲染值」→ min() 在 ≤430px 时永远取 vw 原值
      expect(cap, `${vw} 的上限`).toBeGreaterThanOrEqual(atMaxViewport)
      // 且不多留：量化误差不超过 3 位小数（与上游 unitPrecision 同精度，含浮点余量）
      expect(cap - atMaxViewport).toBeLessThan(0.0015)
      // 430px（上限触发边界）必须与收口前完全一致
      expect(resolveAt(capped, VW_MAX_VIEWPORT)).toBeCloseTo(atMaxViewport, 9)
      checked += 1
    }
    expect(checked).toBe(1999)
  })
})

describe('vw 缩放上限 · 视口 >430px 冻结在 430px 口径（CE-5/CE-6）', () => {
  it('CE-5 1163px（缺陷实测窗口）购物车栏由 211.7px 档回落到 78.282px 档（= 430px 下的 71px 档）', () => {
    const cartBarHeight = designPxToVw(71)
    const capped = capVwValue(cartBarHeight)
    // 收口前：18.205vw 在 1163px 视口下渲染为 211.7px（317px 是含内边距的整栏实测高度，约 3 倍）
    expect((Number.parseFloat(cartBarHeight) * 1163) / 100).toBeCloseTo(211.7, 1)
    // 收口后：冻结在 430px 口径 = 71 × 430 / 390
    expect(resolveAt(capped, 1163)).toBeCloseTo((71 * 430) / 390, 3)
    expect(resolveAt(capped, 1163)).toBeLessThan(80)
  })

  it('CE-6 431/768/1163/1280/1920 五个视口取值完全相同（恒等于上限）', () => {
    for (const pixels of [4, 8, 12, 48, 71, 317, 430]) {
      const vw = designPxToVw(pixels)
      const capped = capVwValue(vw)
      const cap = capOf(capped)
      for (const viewportWidth of DESKTOP_VIEWPORTS) {
        expect(resolveAt(capped, viewportWidth), `${vw} @ ${viewportWidth}px`).toBe(cap)
      }
      // 上限与「430px 视口下的设计值」等价（误差仅来自 3 位小数量化）
      expect(Math.abs(cap - (pixels * 430) / 390)).toBeLessThan(0.004)
    }
  })
})

describe('vw 缩放上限 · 负值 / 边界 / 不误伤（CE-7/CE-8/CE-9）', () => {
  it('CE-7 负值产出 calc(-1 * min(…))，且同样冻结（-6px 徽标偏移）', () => {
    const capped = capVwValue(`-${designPxToVw(6)}`)
    expect(capped).toMatch(/^calc\(-1 \* min\(\d+\.\d+vw, \d+\.\d+px\)\)$/)
    // 收口前 -1.538vw 在 1163px 下是 -17.887px（同样被放大）
    expect((-1.538 * 1163) / 100).toBeCloseTo(-17.887, 3)
    expect(resolveAt(capped, 1163)).toBeCloseTo((-6 * 430) / 390, 2)
    expect(resolveAt(capped, 320)).toBeCloseTo((-1.538 * 320) / 100, 9)
  })

  it('CE-8 不含 vw 的值原样返回（1px 细边框不参与换算、0、纯 px）；多个 vw 逐个收口', () => {
    expect(capVwValue('1px')).toBe('1px')
    expect(capVwValue('0')).toBe('0')
    expect(capVwValue('none')).toBe('none')
    expect(capVwValue('8px 12px')).toBe('8px 12px')
    expect(capVwValue('2.051vw 3.077vw')).toBe('min(2.051vw, 8.82px) min(3.077vw, 13.232px)')
  })

  it('CE-9 引号与 url() 内的 vw 不参与收口；Once 遍历行为与插件名固定', () => {
    expect(vwScaleCapPlugin.postcssPlugin).toBe('cap-vw-at-max-viewport')
    expect(capVwValue('"12vw"')).toBe('"12vw"')
    expect(capVwValue("url('/a-12vw.png')")).toBe("url('/a-12vw.png')")
    expect(capVwValue('url(/b-12vw.png) 2.051vw')).toBe('url(/b-12vw.png) min(2.051vw, 8.82px)')
    // 插件走 Once + walkDecls（不是 Declaration 访问器）：PostCSS 8 在访问器里改写 decl.value 会再次触发
    // 该访问器、把 min() 层层包裹导致 vite build 卡死，改用普通遍历后天然幂等——这里同时锁住幂等性。
    const untouched = { value: '1px solid #e5e5e5' }
    const converted = { value: '2.051vw' }
    const decls = [untouched, converted]
    vwScaleCapPlugin.Once({ walkDecls: (cb: (decl: { value: string }) => void) => decls.forEach(cb) })
    expect(untouched.value).toBe('1px solid #e5e5e5')
    expect(converted.value).toBe('min(2.051vw, 8.82px)')
    vwScaleCapPlugin.Once({ walkDecls: (cb: (decl: { value: string }) => void) => decls.forEach(cb) })
    expect(converted.value).toBe('min(2.051vw, 8.82px)')
  })
})
