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

/** 商品规格选项（契约 §3.2/§4.2 定稿命名：`specOptions` 元素含 `priceDelta` 价差） */
export interface ProductSpecOption {
  name: string
  /** 相对基础价的价差，≥ 0；后端 `CartService.unitPrice` 用「基础价 + 价差」计价 */
  priceDelta: number
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
  /**
   * 会员价（契约 §3.2：非会员仍返回该字段，但计价仍按 `price`）。
   * 前端按「接口返回才展示」渲染为会员价高亮行；缺失整块隐藏，不显示 undefined（PRD 检查列）
   */
  memberPrice?: number | null
  /** 商品标签（契约 §3.2；接口返回才展示） */
  tags?: string[]
  /**
   * 规格选项（契约 §3.2/§4.2）：非空表示该商品「有规格」——点加号先打开规格弹层，
   * 由用户选定**一个**规格后加购（后端 `validatedSelection` 强制单选，未选/多选均 400）
   */
  specOptions?: ProductSpecOption[]
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
  /** 后端重读的商品单价（客户端提交单价仅作一致性提示，不作计价依据；含已选规格价差） */
  unitPrice: number
  quantity: number
  /**
   * 该行已选规格（契约 §3.4：购物车行唯一范围为「用户 + 店铺 + 商品 + 规格组合」，
   * 同一商品不同规格是不同行 → 由 `cartLineId` 区分，不得错误合并）
   */
  specOptions?: ProductSpecOption[]
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
  /** 选用的红包（契约 §3.8：下单时选用，后端重新校验门槛/范围/有效期/归属并锁定；一单一红包） */
  couponId?: string
}

/** 创建订单响应（P0 最小集）：订单号 + 后端计价实付金额（商品小计 + 打包费 2.00） */
export interface OrderCreated {
  orderId: string
  /** 后端计价实付金额（TC-ORD-021：实付 = 商品小计 + packagingFee 2.00，演示口径） */
  payableAmount: number
}

/** 订单状态（契约 §3.5：基础 P0 仅 PROCESSING；后端已实现支付扩展状态机；CANCELLED 随批次②取消接入） */
export type OrderStatus = 'PROCESSING' | 'PENDING_PAYMENT' | 'PENDING' | 'COOKING' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED'

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
  status: OrderStatus
  createdAt: string
  itemSubtotal: number
  packagingFee: number
  total: number
  paidAt?: string | null
  address?: OrderAddressRecord
  items?: OrderRecordItem[]
  /** 金额快照扩展（契约 §3.5/§10.4 定稿命名，CHG-004）：配送费与优惠各字段，未发生为 0 或缺省 */
  deliveryFee?: number
  fullReductionAmount?: number
  newCustomerAmount?: number
  memberDiscountAmount?: number
  couponAmount?: number
  deliveryFeeDiscount?: number
  /** 待支付截止时间 = createdAt + 15 分钟（契约 §3.5 待支付倒计时） */
  payDeadline?: string | null
  /** 是否已评价（契约 §3.5 口径补充：用户端「待评价」文案与去评价入口的判定依据，非独立存储状态） */
  reviewed?: boolean
  /** 取消信息（契约 §3.5：取消成功后的订单响应新增字段） */
  cancelReason?: string | null
  cancelledAt?: string | null
  cancelledBy?: string | null
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
  /** 下单时商品图快照（`order_items.image`，契约 §3.5）；缺失时由 `utils/demoImages` 兜底 */
  image?: string
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
  /** 订单状态（契约 §3.5）：视图模型保留联合类型，供 statusText/orderDisplayStatus 直取 */
  status: OrderStatus
  storeId: string
  storeName: string
  amounts: OrderAmounts
  createdAt: string
  /** 待支付截止时间（契约 §3.5）：订单列表对待支付订单展示剩余时间与「已失效」需要 */
  payDeadline?: string | null
  /** 是否已评价（契约 §3.5 口径补充）：已完成未评价时列表展示「待评价」并提供去评价入口 */
  reviewed?: boolean
}

/** 订单详情视图模型（normalizeOrderDetail 输出；明细含在详情中，TC-ORD-016） */
export interface OrderDetail extends OrderSummary {
  remark: string
  items: OrderItemSnapshot[]
  addressSnapshot: AddressSnapshot
  /** 批次⑩（CHG-003/004）扩展：配送费、优惠项与取消信息（normalizers 归一输出，页面不直连契约字段） */
  deliveryFee?: number
  discounts?: OrderDiscountItem[]
  cancelReason?: string
  cancelledAt?: string | null
  /** 待支付截止时间（契约 §3.5：= createdAt + 15 分钟，支付页倒计时数据源；缺失表示不可支付） */
  payDeadline?: string | null
  /** 支付时间（契约 §3.5：支付成功后记录；支付成功页摘要卡展示） */
  paidAt?: string | null
}

/** 优惠明细项（CHG-004：金额非 0 才生成行；label 为用户端文案，key 供页面/测试挂钩） */
export interface OrderDiscountItem {
  key:
    | 'full-reduction'
    | 'coupon'
    | 'new-customer'
    | 'member-discount'
    | 'delivery-fee-discount'
  label: string
  amount: number
}

/** 金额明细行（CHG-004 定稿口径）：基础四行恒显示，优惠项按实际发生，顺序固定 */
export interface OrderAmountLine {
  key: string
  label: string
  /** 已格式化金额文本（如 '¥3.00' / '−¥5.00'） */
  text: string
  kind: 'base' | 'discount' | 'payable'
}

/** 评价记录（契约 §6.2：响应含 tags/images/reply/repliedAt/userNickname，昵称由后端脱敏） */
export interface ReviewRecord {
  reviewId: string
  orderId: string
  storeId: string
  rating: number
  content: string
  tags: string[]
  images: string[]
  /** 脱敏昵称（如「张**」） */
  userNickname: string
  createdAt: string
  reply?: string | null
  repliedAt?: string | null
}

/** 评价汇总（契约 §6.2 Wave3：平均分+总数，不随筛选变化） */
export interface ReviewSummary {
  averageRating: number
  totalCount: number
}

/** 评价列表响应（契约 §6.2 Wave3：summary + 按筛选收窄的 list） */
export interface ReviewPage {
  summary: ReviewSummary
  list: ReviewRecord[]
}

export type ReviewFilter = '全部' | '有图' | '最新' | '好评' | '差评'

/** 提交评价请求体（契约 §6.2：rating 1–5 必填；content/tags/images 为评价内容与可选字段） */
export interface ReviewSubmitPayload {
  rating: number
  content: string
  tags?: string[]
  images?: string[]
}

/** 会话（契约 §6.1：必须关联订单、用户与商家；未读按角色分离） */
export interface ConversationRecord {
  conversationId: string
  orderId: string
  storeId: string
  /** 最后一条消息摘要与时间（列表展示与按时间倒序的依据） */
  lastMessage: string
  lastMessageAt: string
  /** 用户端未读数（商家端为 merchantUnread，按角色分离） */
  unread: number
}

/** 聊天消息（契约 §6.1） */
export interface ChatMessageRecord {
  messageId: string
  conversationId: string
  /** 发送方：用户 / 商家 */
  sender: 'USER' | 'MERCHANT'
  content: string
  createdAt: string
}

/** 会话详情（契约 §6.1 GET /conversations/{conversationId}：详情 + 消息时间线） */
export interface ConversationDetailRecord extends ConversationRecord {
  /** 后端会话视图直出的店铺名（BUG-20260914-005 修复后提供）；缺省时页面回退店铺列表映射 */
  storeName?: string
  messages: ChatMessageRecord[]
}

/** 通知（契约 §3.9：订单/红包/会员三类；read 为已读标记） */
export interface NotificationRecord {
  notificationId: string
  type: 'ORDER' | 'COUPON' | 'MEMBER'
  title: string
  content: string
  relatedId: string
  read: boolean
  createdAt: string
}

/** 收藏商家（契约 §3.7：列表按收藏时间倒序；(userId, storeId) 唯一，重复收藏幂等） */
export interface FavoriteItem {
  favoriteId: string
  storeId: string
  storeName: string
  image?: string
  rating: number
  monthlySales: number
  deliveryFee: number
  /** 商家关闭后收藏项保留并展示最新状态（契约 §3.7：关闭时用户端不可下单） */
  storeStatus: StoreStatus
  createdAt: string
  /**
   * 契约缺口（2026-09-12 登记，提请后端 A 确认）：PRD 7.16.1「我的收藏页-收藏商家列表」行要求
   * 卡片展示**促销标签、配送时长、距离**，而契约 §3.7 收藏对象最小集未含这三个字段。
   * 前端按「接口返回才展示、缺失即隐藏」实现（不使用演示值补齐）；后端补字段后本节需按 R7 同步。
   */
  deliveryMinutes?: number
  distanceText?: string
  couponTags?: string[]
}

/** 会员信息（契约 §3.8：`memberOpened` 标识与权益说明；**开通与续费接口本期不提供**） */
export interface MemberInfo {
  memberOpened: boolean
  /** 演示折扣率 0.95；与商品 `memberPrice` 不叠加（契约 §3.2/§3.5） */
  discountRate: number
  discountDesc: string
  /** 开通时间由种子数据或后台标记，无开通接口；契约未定义有效期字段 */
  activatedAt?: string | null
}

/**
 * 红包（契约 §3.8 + CHG-001 §3.10）：`status` 只表达有效期窗口，`used` 独立回显
 * （已用未过期的券仍在 available 列表里带 `used=true`，但不进 /available 选用查询）。
 * `source`：SEED 种子 / PACK 购买所得 / BLAST_OUT 爆出来的；`canBlast` 为 0 表示不可再爆（终态）。
 * 前端一律按接口返回值展示，金额与门槛不自行计算（PRD 875 行检查列）。
 */
export interface CouponRecord {
  couponId: string
  name: string
  amount: number
  threshold: number
  /** ALL 全场 / STORE 指定商家（本期不做品类范围；品类券为占位展示券，接口不返回） */
  scope: 'ALL' | 'STORE'
  storeId?: string | null
  validFrom: string
  validTo: string
  status: 'available' | 'expired'
  used: boolean
  source: 'SEED' | 'PACK' | 'BLAST_OUT'
  canBlast: boolean
}

/** 买红包套餐（CHG-001 §3.10）：pack49 = 4 张（面额 ¥20）、pack99 = 8 张（面额 ¥45） */
export type CouponPackKey = 'pack49' | 'pack99'

/** 购买套餐响应：新生成的券列表与购买批次号（前端模拟付费，不落支付记录） */
export interface CouponPackPurchase {
  packId: string
  packKey: CouponPackKey
  coupons: CouponRecord[]
}

/** 爆一次响应（CHG-001 §3.10）：结果券 + 命中的档位序号 + 本次是否为免费爆 */
export interface CouponBlastResult {
  coupon: CouponRecord
  /** 命中的档位序号（1–10，档位池见契约 §10.5） */
  tierIndex: number
  free: boolean
}

/**
 * 契约 §3.10 爆一次的**真实响应形状（扁平）**：券字段直接铺在响应上，另加 `tierIndex` 与 `freeBlast`。
 * 2026-09-14 线上实测确认（`POST /me/coupons/blast` 传 `couponId` → 200，data 为扁平券对象 + 两个控制字段）；
 * 由 `normalizeBlastResult` 统一适配为 `CouponBlastResult` 供页面使用，页面不直接消费本形状。
 */
export interface CouponBlastRecord extends CouponRecord {
  /** 命中的档位序号（1–10）；后端返回 */
  tierIndex?: number
  /** 本次是否为免费爆（后端字段名，对应前端 `free`） */
  freeBlast?: boolean
}

/** 搜索排序取值（契约 §3.6 定稿：综合 / 销量 / 距离，默认综合） */
export type SearchSort = '综合' | '销量' | '距离'

/** 排序选项顺序（搜索头部与筛选栏共用，契约 §3.6） */
export const SEARCH_SORT_OPTIONS: SearchSort[] = ['综合', '销量', '距离']

/**
 * 分页列表对象（契约 §1.3 的列表约定唯一例外）：
 * 请求与响应统一 `page`/`size`，默认 `page=1&size=10`，字段为 list/page/size/total。
 */
export interface PagedList<T> {
  list: T[]
  page: number
  size: number
  total: number
}

/**
 * 搜索结果（契约 §3.6）：同时返回商家与商品汇总。
 * 排序口径（2026-09-09 定稿）：综合 = 销量优先、评分次之；销量 = monthlySales 倒序；
 * 距离 = 种子固定字段 distanceKm 升序（不引入地图与定位服务）。
 */
export interface SearchResult {
  merchants: PagedList<StoreSummary>
  products: PagedList<Product>
}

/**
 * AI 点餐助手（契约 §10.6 / AI点餐助手前端PRD §5.1）：
 * - 请求：`sessionId` 由前端生成并持久化后随每次请求携带（契约允许传入；不传则后端基于 HttpSession 生成）
 * - 非流式响应 `{sessionId, reply}`；流式 `/stream-chat` 只返回文本分片，sessionId 由请求方持有
 */
export interface AiChatPayload {
  sessionId: string
  prompt: string
}

export interface AiChatResult {
  sessionId: string
  reply: string
}

/** 本机消息记录（PRD §5.2，localStorage 承载；status 为展示态、不持久化） */
export interface AiChatMessage {
  id: string
  role: 'user' | 'ai'
  text: string
  createdAt: number
}
