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
}

/** 店铺列表查询参数（GET /stores） */
export interface StoreListParams {
  keyword?: string
  categoryId?: string
  sort?: '综合' | '销量' | '距离'
}
