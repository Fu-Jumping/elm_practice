/**
 * px→vw 换算的**缩放上限**（`TODO-USER-112`；SHOW-QA-002 的残留面）。
 *
 * 背景：`vite.config.ts` 用 `postcss-px-to-viewport-8-plugin` 把设计稿 px 按
 * `viewportWidth: 390` 全部换成 `vw`。而 `vw` 只跟**视口**走、不跟元素走——`.app-shell`
 * 的 `max-width: 430px` 只锁住了壳的宽度、锁不住缩放：视口 1163px 时整页被放大约 3 倍
 * （实测底部购物车栏 317px、盖住半屏并遮挡加购按钮；430px 视口下正常为 71px）。
 *
 * 收口方式：紧随换算追加一遍改写，把每个 `N vw` 收敛为 `min(Nvw, N×4.3px)`。
 *   - `4.3 = 430 / 100`，即 `1vw` 在 430px 视口下的渲染值。换算关系是
 *     `P px → (P × 100 / 390) vw`，故 `N vw` 恰好对应「`N × 4.3` px」在 430px 视口下的渲染值。
 *   - 视口 ≤ 430px 时 `Nvw ≤ N×4.3px` 恒成立（px 上限再向上取整到 3 位小数，保证严格 ≥），
 *     `min()` 永远取 `vw` 原值 → **移动端口径逐像素不变**（320/360/375/390/430 五档一致）。
 *   - 视口 > 430px 时取 px 上限 → 整页冻结在「430px 视口」的缩放上，与 `.app-shell` 的
 *     `max-width: 430px` 语义对齐，桌面预览不再随窗口继续放大。
 *
 * 为什么不用容器查询单位（`cqw` + `container-type`）：`container-type: inline-size` 附带
 * `contain: layout`，会让 `.app-shell` 成为 `position: fixed` 后代的包含块——仓库内 20+ 处
 * 固定底栏/抽屉/弹层（`.cart-bar`、`.cart-popup`、`CancelOrderSheet`、`ToastHost`、
 * `BlastOverlay` 等）的定位基准会被整体改写，回归面远大于本方案。本方案不改变任何布局
 * 模型，只改变一个长度的解析结果，且 ≤430px 时解析结果与现状完全一致。
 *
 * 为什么不用 CSS 变量（`:root { --vw: min(1vw, 4.3px) }` + `calc(var(--vw) * N)`）：变量一旦
 * 未定义（样式被单独引用、被作用域覆盖），整条 `calc()` 失效、声明被静默丢弃（页面塌陷）；
 * `min()` 内联写法没有这个失败模式。
 */

/** 缩放上限视口（px）：与 `.app-shell`/`.cart-bar` 等 5 处 `max-width: 430px` 同值。 */
export const VW_MAX_VIEWPORT = 430

/** `1vw` 在 430px 视口下的渲染值（px）：`430 / 100 = 4.3`。 */
export const PX_PER_VW_AT_MAX_VIEWPORT = VW_MAX_VIEWPORT / 100

/** px 上限的小数位：与 `pxToViewport.unitPrecision`（3）保持一致。 */
export const VW_CAP_PRECISION = 3

/**
/**
 * 与上游 `getUnitRegexp` 同形——先吃掉引号、`url(...)` 与**已收口的 `min(…vw, …px)`**，
 * 避免误伤字符串里的 `vw`，并保证本函数**幂等**（同一值重复处理不会层层包裹 `min()`）；
 * 额外捕获负号（上游正则不含 `-`，`-10px` 会产出 `-2.564vw`，符号留在原处）。
 */
const VW_REGEXP = /min\(\s*-?\d*\.?\d+vw\s*,\s*\d*\.?\d+px\s*\)|"[^"]+"|'[^']+'|url\([^)]+\)|(-?)(\d*\.?\d+)vw/g

/**
 * `N vw` → `min(Nvw, N×4.3px)`；负值 → `calc(-1 * min(…))`（CSS 文法不允许 `-min(…)`，
 * 且负值不能直接用 `min()`——`min` 会取更负的一侧，方向正好相反）。
 */
export function capVwValue(value: string): string {
  return value.replace(
    VW_REGEXP,
    (matched: string, sign: string | undefined, digits: string | undefined): string => {
      if (!digits) return matched // 命中的是引号 / url() 分支，原样保留
      const multiplier = 10 ** VW_CAP_PRECISION
      // 向上取整 + 浮点余量：保证 cap ≥ N × 4.3 恒成立，视口 ≤430px 时 min() 必取 vw 原值
      const scaled = Number.parseFloat(digits) * PX_PER_VW_AT_MAX_VIEWPORT
      const cap = Math.ceil(scaled * multiplier + 1e-6) / multiplier
      const capped = `min(${digits}vw, ${cap}px)`
      return sign === '-' ? `calc(-1 * ${capped})` : capped
    },
  )
}

/**
 * 收口插件，放在 `css.postcss.plugins` 里 `pxToViewport` 之后。
 * 上游把全部换算写在 `Once`（树遍历之前执行），本插件同样用 `Once` 且在数组中排在它之后，
 * 因此拿到的是**换算后的** `vw` 值；**顺序有意义**，本插件不能排到 `pxToViewport` 前面。
 */
export const vwScaleCapPlugin = {
  postcssPlugin: 'cap-vw-at-max-viewport',
  /**
   * 用 Once + walkDecls 而不是 Declaration 访问器：PostCSS 8 在访问器里改写 decl.value 会把节点标记为脏
   * 并**再次触发该访问器**，于是 min() 被层层包裹、构建卡死（本次实测 vite build 数十分钟不收敛）。
   * 普通遍历不触发 visitor，天然幂等。上游 pxToViewport 也把换算写在 Once，注册顺序保证先换算后收口。
   */
  Once(root: { walkDecls: (cb: (decl: { value: string }) => void) => void }): void {
    root.walkDecls((decl) => {
      if (!decl.value || decl.value.indexOf('vw') === -1) return
      decl.value = capVwValue(decl.value)
    })
  },
}
