/**
 * 契约类型层（决策 9.1：类型即契约镜像，集中在 services/api）
 * 与 docs/backend/后端接口契约.md 字段对齐；契约变更时同步修改本文件
 * TODO(9/4 契约定稿后)：按后端确认的字段明细逐条核对
 */

/** 统一响应结构：code=0 业务成功；列表无结果返回空数组不视为错误 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/** 当前用户摘要（GET /me 探活 / 登录返回） */
export interface UserSummary {
  account: string
  nickname: string
  avatar?: string
}

/** 店铺状态枚举（契约：OPEN / CLOSED / TEMPORARILY_CLOSED） */
export type StoreStatus = 'OPEN' | 'CLOSED' | 'TEMPORARILY_CLOSED'

/** 店铺摘要（列表项最小集） */
export interface StoreSummary {
  storeId: string
  name: string
  description?: string
  image?: string
  rating: number
  monthlySales: number
  deliveryMinutes: number
  startPrice: number
  deliveryFee: number
  status: StoreStatus
  /**
   * TODO(契约缺口 2026-09-06)：以下三个为首页商家卡展示字段，契约 §3.2 最小集暂未覆盖，
   * 已提请后端 A 确认是否入契约或另给聚合方案；真实接口未返回时 UI 整块隐藏（PRD 7.16.1 商家卡行）
   */
  /** 距离文案（如 "1.8km"），由列表接口返回、前端不计算 */
  distanceText?: string
  /** 优惠标签文案数组；PRD：优惠标签只有接口明确返回时展示 */
  couponTags?: string[]
  /** 商品预览（名称/图片/价格）；PRD：来自商家商品接口，列表页暂由 mock 内嵌演示 */
  previewProducts?: StorePreviewProduct[]
}

/** 商家卡商品预览项（名称 + 图片 + 价格；价格走 formatMoney 两位小数展示） */
export interface StorePreviewProduct {
  name: string
  image: string
  price: number
}

/** 店铺分类 */
export interface StoreCategory {
  categoryId: string
  name: string
}

/** 商品（列表/详情最小集） */
export interface Product {
  productId: string
  storeId: string
  categoryId: string
  name: string
  description?: string
  price: number
  stock: number
  onSale: boolean
  /**
   * TODO(契约缺口 2026-09-06)：月售/好评率为 PRD 7.16.1 点餐内容区要求展示的字段，
   * 契约 §3.2 Product 暂未覆盖，已提请后端确认；未返回时 UI 隐藏对应文案
   */
  monthlySalesText?: string
  goodRateText?: string
}

/**
 * 购物车行（契约 §3.4：当前用户 + 店铺 + 商品唯一，同商品合并数量）
 * TODO(契约缺口 2026-09-06)：GET /cart 响应行字段示例契约未给出，以下为前端先行口径，待后端 A 确认
 */
export interface CartLine {
  cartLineId: string
  storeId: string
  productId: string
  name: string
  image?: string
  /** 后端重读的商品单价（客户端提交单价仅作一致性提示，不作计价依据） */
  unitPrice: number
  quantity: number
}

/** 店铺列表查询参数（GET /stores） */
export interface StoreListParams {
  keyword?: string
  categoryId?: string
  sort?: '综合' | '销量' | '距离'
}
