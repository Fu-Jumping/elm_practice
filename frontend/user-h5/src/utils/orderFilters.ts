/**
 * 用户端订单列表筛选取值（PRD 7.6「用户端列表筛选取值：全部/待支付/进行中/已完成/待评价/已取消」
 * ＋ 契约 §3.5「订单列表支持 `status` 查询参数……用户端列表筛选取值由后端按状态与评价情况计算」）
 *
 * 契约冲突的落地口径（前端收窄，不改后端）：
 * 契约 §3.5 的 `status` 查询参数**只接受单个状态值**（`listByUser` 为 `status = ?` 等值条件），
 * 而「进行中」（`PENDING`/`COOKING`/`DELIVERING`，含 P0 历史状态 `PROCESSING`）与「待评价」
 * （`COMPLETED` + `reviewed=false`）都跨状态/跨字段，无法用单值参数表达。因此：
 * - 能一一对应的筛选（待支付/已完成/已取消）→ 下传 `status` 参数，由后端收窄；
 * - 跨状态的筛选（进行中/待评价）→ 下传可最大收敛的 `status`（进行中不传、待评价传 `COMPLETED`），
 *   再由前端按同一口径收窄。真实后端与替身都不需要为此新增能力。
 * - 「已完成」与「待评价」互斥：`reviewed=false` 的已完成订单在用户端展示为「待评价」（PRD 7.6 表），
 *   故「已完成」只保留 `reviewed !== false` 的已完成订单；`reviewed` 缺失（真实后端暂未返回）时
 *   按既有口径视为「未知」，归入「已完成」而不误判成「待评价」（TV-13 同款处理）。
 */

/** 筛选标签（渲染顺序即 PRD 7.6 列举顺序） */
export const ORDER_FILTERS = ['全部', '待支付', '进行中', '已完成', '待评价', '已取消'] as const

export type OrderFilter = (typeof ORDER_FILTERS)[number]

/** 「进行中」覆盖的状态：待接单 / 制作中 / 配送中，以及 P0 历史状态 PROCESSING（契约 §3.5 表） */
export const ACTIVE_ORDER_STATUSES = ['PENDING', 'COOKING', 'DELIVERING', 'PROCESSING'] as const

/** 筛选 → 接口 `status` 查询参数；返回 undefined 表示不带该参数（全部 / 需前端收窄的跨状态筛选） */
export function statusParamOf(filter: OrderFilter): string | undefined {
  switch (filter) {
    case '待支付':
      return 'PENDING_PAYMENT'
    case '待评价':
      // 最大收敛：待评价只能是已完成订单，先把列表收窄到 COMPLETED
      return 'COMPLETED'
    case '已取消':
      return 'CANCELLED'
    default:
      return undefined
  }
}

/** 前端收窄判定：入参为订单摘要视图模型的状态与评价标记 */
export function matchesOrderFilter(
  order: { status: string; reviewed?: boolean },
  filter: OrderFilter,
): boolean {
  switch (filter) {
    case '全部':
      return true
    case '待支付':
      return order.status === 'PENDING_PAYMENT'
    case '进行中':
      return (ACTIVE_ORDER_STATUSES as readonly string[]).includes(order.status)
    case '已完成':
      // reviewed=true 或缺失（未知，按 TV-13 口径不误判为待评价）都算已完成
      return order.status === 'COMPLETED' && order.reviewed !== false
    case '待评价':
      return order.status === 'COMPLETED' && order.reviewed === false
    case '已取消':
      return order.status === 'CANCELLED'
  }
}

/** 空态文案：按当前筛选取值给出对应空态（PRD 列表页异常列「空结果显示对应空态」） */
export function emptyTextOf(filter: OrderFilter): string {
  return filter === '全部' ? '暂无订单' : `暂无${filter}订单`
}
