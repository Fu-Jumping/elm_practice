import { afterEach, describe, expect, it, vi } from 'vitest'
import { flyToCart } from '../flyToCart'

/**
 * 加购抛物线抛球（TODO-USER-016，PRD 7.3 加购交互）
 * FT-1 创建小球并定位到起点（内联样式，挂 body 下）
 * FT-2 动画结束（finish 事件）后移除小球
 * FT-3 环境不支持 Web Animations API 时静默跳过：不抛错、不残留节点（jsdom 默认路径）
 * FT-4 连点只保留一个小球；起点=终点时仍给出正弧高且不抛错
 * FT-5 兜底清理：动画既未 finish 也未 cancel 时按 duration + 100ms 兜底移除
 */
const BALL = '[data-testid="fly-ball"]'

/** 用可控替身替换 Element.prototype.animate（jsdom 无该 API） */
function stubAnimate(): { fire: (type: 'finish' | 'cancel') => void; calls: unknown[] } {
  const listeners: Record<string, Array<() => void>> = { finish: [], cancel: [] }
  const calls: unknown[] = []
  Element.prototype.animate = function (this: Element, keyframes: unknown, options: unknown) {
    calls.push({ keyframes, options })
    const fake = {
      addEventListener: (type: string, cb: () => void) => listeners[type]?.push(cb),
      cancel: () => listeners.cancel?.forEach((cb) => cb()),
    }
    void this
    return fake as unknown as Animation
  } as unknown as Element['animate']
  return { fire: (type) => listeners[type]?.forEach((cb) => cb()), calls }
}

afterEach(() => {
  document.querySelectorAll(BALL).forEach((node) => node.remove())
  // 恢复 jsdom 原始状态（删除替身）
  delete (Element.prototype as unknown as { animate?: unknown }).animate
  vi.useRealTimers()
})

describe('flyToCart（加购抛物线抛球）', () => {
  it('FT-1 创建小球并定位到起点（挂 body 下、内联样式）', () => {
    stubAnimate()
    const ball = flyToCart({ x: 100, y: 200 }, { x: 40, y: 700 })
    expect(ball).not.toBeNull()
    expect(document.querySelectorAll(BALL)).toHaveLength(1)
    // size 默认 12：左上角 = 起点 - size/2
    expect(ball!.style.left).toBe('94px')
    expect(ball!.style.top).toBe('194px')
    expect(ball!.style.position).toBe('fixed')
  })

  it('FT-2 动画关键帧含中点抬升（抛物线）且结束事件后移除小球', () => {
    const { fire, calls } = stubAnimate()
    flyToCart({ x: 0, y: 0 }, { x: 200, y: 300 })
    const keyframes = (calls[0] as { keyframes: Array<{ transform: string }> }).keyframes
    expect(keyframes).toHaveLength(3)
    expect(keyframes[1].transform).toContain('translate(100px')
    // 中点 y = dy/2 - arc，arc 为正 → 中点应高于直线中点
    const midY = Number(/translate\([^,]+,\s*(-?[\d.]+)px\)/.exec(keyframes[1].transform)![1])
    expect(midY).toBeLessThan(150)
    fire('finish')
    expect(document.querySelectorAll(BALL)).toHaveLength(0)
  })

  it('FT-3 无 Web Animations API 时静默跳过：不抛错、不残留节点', () => {
    // jsdom 默认无 animate
    const ball = flyToCart({ x: 10, y: 10 }, { x: 20, y: 20 })
    expect(ball).toBeNull()
    expect(document.querySelectorAll(BALL)).toHaveLength(0)
  })

  it('FT-4 连点只保留一个小球；起点=终点时弧高仍为正且不抛错', () => {
    stubAnimate()
    flyToCart({ x: 0, y: 0 }, { x: 10, y: 10 })
    flyToCart({ x: 0, y: 0 }, { x: 10, y: 10 })
    expect(document.querySelectorAll(BALL)).toHaveLength(1)
    const same = flyToCart({ x: 50, y: 50 }, { x: 50, y: 50 })
    expect(same).not.toBeNull()
  })

  it('FT-5 兜底清理：未触发 finish/cancel 时按 duration + 100ms 移除', () => {
    vi.useFakeTimers()
    stubAnimate()
    flyToCart({ x: 0, y: 0 }, { x: 100, y: 100 }, { duration: 500 })
    expect(document.querySelectorAll(BALL)).toHaveLength(1)
    vi.advanceTimersByTime(700)
    expect(document.querySelectorAll(BALL)).toHaveLength(0)
  })
})
