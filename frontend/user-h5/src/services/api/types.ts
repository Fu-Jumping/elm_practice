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
  /** 商品图片（后端返回；空串/缺失时前端显示占位图，PRD） */
  image?: string
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

/**
 * 收货地址（契约 §3.3：addressId/contactName/contactSex/contactPhone/region/detail/label/isDefault）
 * 查询只返回当前用户地址；删除默认地址由后端自动改派默认
 */
export interface Address {
  addressId: string
  contactName: string
  contactSex: '男' | '女'
  contactPhone: string
  region: string
  detail: string
  label?: string
  isDefault: boolean
}

/** 创建订单请求（契约 §3.5）：expectedTotal 仅作一致性提示，金额以后端计价为准 */
export interface CreateOrderPayload {
  storeId: string
  addressId: string
  remark?: string
  expectedTotal?: number
}

/** 创建订单响应（P0 最小集）：订单号 + 后端计价实付金额（商品小计 + 打包费 2.00） */
export interface OrderCreated {
  orderId: string
  /** 后端计价实付金额（TC-ORD-021：实付 = 商品小计 + packagingFee 2.00，演示口径） */
  payableAmount: number
}

/** 订单状态（契约 §3.5：基础 P0 仅 PROCESSING；后端已实现支付扩展状态机，见 PENDING_PAYMENT） */
export type OrderStatus = 'PROCESSING' | 'PENDING_PAYMENT'

/**
 * 订单记录（后端 GET /orders 实际形状，2026-09-07 联调对齐）
 * 后端为扁平金额字段且无 storeName：前端经 normalizers（normalizeOrderSummary/Detail）
 * 归一为视图模型 OrderSummary/OrderDetail，页面不直接消费本类型
 */
export interface OrderRecordItem {
  productId: string
  name: string
  image?: string
  unitPrice: number
  quantity: number
  subtotal: number
}

export interface OrderAddressRecord {
  addressId: string
  contactName: string
  contactSex: string
  contactPhone: string
  region: string
  detail: string
  label?: string
  isDefault: boolean
  updatedAt?: string
}

export interface OrderRecord {
  orderId: string
  userId?: string
  storeId: string
  addressId?: string
  remark: string
  status: string
  createdAt: string
  itemSubtotal: number
  packagingFee: number
  total: number
  paidAt?: string | null
  address?: OrderAddressRecord
  items?: OrderRecordItem[]
}

/** 金额快照三件套（TC-ORD-022：实付 = 商品小计 + packagingFee，视图模型） */
export interface OrderAmounts {
  itemsTotal: number
  packagingFee: number
  payableAmount: number
}

/** 商品明细快照（TC-ORD-002：下单时快照，不跟随商品改价；视图模型） */
export interface OrderItemSnapshot {
  productId: string
  name: string
  unitPrice: number
  quantity: number
}

/** 地址快照（TC-ORD-002：收货信息来自下单时地址快照；视图模型） */
export interface AddressSnapshot {
  contactName: string
  contactPhone: string
  region: string
  detail: string
}

/** 订单摘要视图模型（normalizeOrderSummary 输出；店名由页面按 storeId 映射） */
export interface OrderSummary {
  orderId: string
  status: string
  storeId: string
  storeName: string
  amounts: OrderAmounts
  createdAt: string
}

/** 订单详情视图模型（normalizeOrderDetail 输出；明细含在详情中，TC-ORD-016） */
export interface OrderDetail extends OrderSummary {
  remark: string
  items: OrderItemSnapshot[]
  addressSnapshot: AddressSnapshot
}
