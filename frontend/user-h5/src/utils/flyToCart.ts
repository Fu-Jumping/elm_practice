/**
 * 加购抛物线抛球（TODO-USER-016）——骨架：先只声明类型与函数签名（返回 null、不产生任何 DOM），
 * 真实实现（内联定位 + Web Animations 三关键帧 + 兜底清理）由紧随其后的 `feat:` 提交落地（TDD：先红后绿）。
 */
export interface FlyPoint {
  x: number
  y: number
}

export interface FlyToCartOptions {
  duration?: number
  size?: number
  minArc?: number
}

export function flyToCart(
  _from: FlyPoint,
  _to: FlyPoint,
  _options: FlyToCartOptions = {},
): HTMLElement | null {
  return null
}
