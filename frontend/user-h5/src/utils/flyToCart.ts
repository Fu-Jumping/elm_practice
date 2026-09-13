/**
 * 加购抛物线抛球（TODO-USER-016，PRD 7.3 加购交互）：
 * 从商品「加号」位置向购物车栏抛一个球，做抛物线过渡。
 *
 * 设计约束：
 * - 元素挂在 `document.body` 下并用**内联样式**定位（页面为 scoped CSS，挂 body 的元素拿不到页面样式）
 * - 只依赖 Web Animations API；环境不支持（jsdom 等）时**静默跳过**，不抛错、不残留元素
 * - 无论动画是否被打断，都在 `duration + 100ms` 兜底清理，避免脏节点
 * - 位移与弧高由传入坐标推导，无副作用、可单测（不读全局状态）
 */

export interface FlyPoint {
  x: number
  y: number
}

export interface FlyToCartOptions {
  /** 动画时长（毫秒），设计口径约 600ms，可跳过区间见 PRD 7.3 */
  duration?: number
  /** 小球直径（px） */
  size?: number
  /** 弧高下限（px）：保证横向位移很小时也有明显抛物线 */
  minArc?: number
}

const DEFAULT_DURATION = 600
const DEFAULT_SIZE = 12
const DEFAULT_MIN_ARC = 60

/** 单例标记：同一次加购只保留一个小球（避免连点堆叠） */
const BALL_SELECTOR = '[data-testid="fly-ball"]'

/**
 * 从 `from` 抛到 `to`。
 * @returns 被创建的小球元素；环境不支持动画时返回 null（元素不残留）
 */
export function flyToCart(from: FlyPoint, to: FlyPoint, options: FlyToCartOptions = {}): HTMLElement | null {
  if (typeof document === 'undefined' || !document.body) return null
  const duration = options.duration ?? DEFAULT_DURATION
  const size = options.size ?? DEFAULT_SIZE
  const minArc = options.minArc ?? DEFAULT_MIN_ARC

  // 同一次加购只保留一个小球
  document.querySelectorAll(BALL_SELECTOR).forEach((node) => node.remove())

  const ball = document.createElement('div')
  ball.setAttribute('data-testid', 'fly-ball')
  ball.setAttribute('aria-hidden', 'true')
  const styleText: Record<string, string> = {
    position: 'fixed',
    left: `${from.x - size / 2}px`,
    top: `${from.y - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: 'var(--color-primary, #ff5a1f)',
    'pointer-events': 'none',
    'z-index': '9999',
  }
  for (const [key, value] of Object.entries(styleText)) ball.style.setProperty(key, value)
  document.body.appendChild(ball)

  const dx = to.x - from.x
  const dy = to.y - from.y
  const arc = Math.max(minArc, Math.abs(dx) * 0.4, Math.abs(dy) * 0.2)

  // 环境无 Web Animations API（jsdom）：不播放动画，也不残留节点
  if (typeof ball.animate !== 'function') {
    ball.remove()
    return null
  }

  const animation = ball.animate(
    [
      { transform: 'translate(0, 0) scale(1)' },
      { transform: `translate(${dx / 2}px, ${dy / 2 - arc}px) scale(1.15)` },
      { transform: `translate(${dx}px, ${dy}px) scale(0.5)` },
    ],
    { duration, easing: 'linear', fill: 'forwards' },
  )
  const cleanup = (): void => ball.remove()
  animation.addEventListener?.('finish', cleanup)
  animation.addEventListener?.('cancel', cleanup)
  window.setTimeout(cleanup, duration + 100)
  return ball
}
