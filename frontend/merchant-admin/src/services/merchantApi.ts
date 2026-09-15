export type StoreStatus = 'OPEN' | 'CLOSED' | 'TEMPORARILY_CLOSED'

export interface Merchant {
  merchantId: string
  account: string
  name?: string
}

export interface Store {
  storeId: string
  name: string
  description?: string
  contactPhone?: string
  startPrice?: number
  deliveryFee?: number
  status: StoreStatus
}

export interface Category {
  categoryId: string
  name: string
  sortOrder?: number
}

export interface Product {
  productId: string
  categoryId: string
  name: string
  description?: string
  price: number
  stock: number
  onSale: boolean
  image?: string
  memberPrice?: number
  tags?: string[]
  specOptions?: SpecOption[]
}

export interface SpecOption {
  name: string
  priceDelta: number
}

export interface OrderItem {
  productId?: string
  name: string
  quantity: number
  price: number
  subtotal?: number
}

export interface Order {
  orderId: string
  customerName?: string
  contactName?: string
  contactPhone?: string
  address?: string
  /** 订单备注（契约订单视图 remark；PRD 6.13/7.11 详情 P0 字段） */
  remark?: string
  status: string
  createdAt?: string
  productTotal: number
  packagingFee: number
  deliveryFee: number
  fullReductionAmount?: number
  newCustomerAmount?: number
  memberDiscountAmount?: number
  couponAmount?: number
  deliveryFeeDiscount?: number
  cancelReason?: string
  cancelledAt?: string
  cancelledBy?: string
  totalAmount: number
  items?: OrderItem[]
}

export interface MerchantSession {
  merchant: Merchant
  store: Store
}

export interface StoreDraft {
  name: string
  description?: string
  contactPhone?: string
  startPrice?: number
  deliveryFee?: number
}

export interface CategoryDraft {
  name: string
  sortOrder?: number
}

export interface ProductDraft {
  categoryId: string
  name: string
  description?: string
  price: number
  stock: number
  onSale: boolean
  image?: string
  memberPrice?: number
  tags?: string[]
  specOptions?: SpecOption[]
}

export interface PromotionTier { threshold: number; amount: number; sortOrder?: number }
export interface PromotionConfig {
  enabled: boolean
  fullReductions: PromotionTier[]
  newCustomerEnabled: boolean
  newCustomerAmount: number
  freeDeliveryEnabled: boolean
  freeDeliveryThreshold: number
  memberDiscountEnabled: boolean
  memberDiscountRate: number
}

export interface Review {
  reviewId: string
  orderId?: string
  userNickname: string
  rating: number
  content: string
  images: string[]
  tags: string[]
  reply?: string
  repliedAt?: string
  createdAt?: string
}

export interface ChatMessage {
  messageId: string
  senderId?: string
  senderRole: string
  content: string
  createdAt?: string
}

export interface Conversation {
  conversationId: string
  orderId?: string
  userNickname: string
  merchantRead: boolean
  unreadCount: number
  messages: ChatMessage[]
  lastMessage?: string
  updatedAt?: string
}

export interface Overview {
  todaySalesAmount: number
  validOrderCount: number
  expectedIncome: number
  pendingOrderCount: number
  unrepliedReviewCount: number
  unreadMessageCount: number
}

export interface TrendPoint { date: string; salesAmount: number; orderCount: number }
export interface DistributionItem { name: string; value: number }
export interface Analytics {
  range: 'today' | '7d' | '30d'
  salesAmount: number
  orderCount: number
  avgOrderAmount: number
  trend: TrendPoint[]
  channelDistribution: DistributionItem[]
  statusDistribution: DistributionItem[]
}

export interface UploadedImage { url: string; fileName: string; size: number; contentType: string }

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const env = import.meta.env as Record<string, string | undefined>
const apiMode = env.VITE_API_MODE === 'real' ? 'real' : 'mock'
const apiBaseUrl = (env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '')

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function asNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function normalizeStore(value: unknown): Store {
  const record = (value ?? {}) as Record<string, unknown>
  return {
    storeId: String(record.storeId ?? record.id ?? ''),
    name: String(record.name ?? record.storeName ?? ''),
    description: record.description ? String(record.description) : undefined,
    contactPhone: record.contactPhone ? String(record.contactPhone) : undefined,
    startPrice: record.startPrice === undefined ? undefined : asNumber(record.startPrice),
    deliveryFee: record.deliveryFee === undefined ? undefined : asNumber(record.deliveryFee),
    status: (record.status ?? 'CLOSED') as StoreStatus,
  }
}

function normalizeProduct(value: unknown): Product {
  const record = (value ?? {}) as Record<string, unknown>
  return {
    productId: String(record.productId ?? record.id ?? ''),
    categoryId: String(record.categoryId ?? ''),
    name: String(record.name ?? ''),
    description: record.description ? String(record.description) : undefined,
    price: asNumber(record.price),
    stock: asNumber(record.stock),
    onSale: Boolean(record.onSale ?? record.available),
    image: record.image ? String(record.image) : undefined,
    memberPrice: record.memberPrice === undefined || record.memberPrice === null ? undefined : asNumber(record.memberPrice),
    tags: asArray<unknown>(record.tags).map(String),
    specOptions: asArray<Record<string, unknown>>(record.specOptions).map((option) => ({
      name: String(option.name ?? ''),
      priceDelta: asNumber(option.priceDelta),
    })),
  }
}

function normalizeCategory(value: unknown): Category {
  const record = (value ?? {}) as Record<string, unknown>
  return {
    categoryId: String(record.categoryId ?? record.id ?? ''),
    name: String(record.name ?? ''),
    sortOrder: record.sortOrder === undefined ? undefined : asNumber(record.sortOrder),
  }
}

export function normalizeOrder(value: unknown): Order {
  const record = (value ?? {}) as Record<string, unknown>
  const items = asArray<Record<string, unknown>>(record.items).map((item) => ({
    productId: item.productId ? String(item.productId) : undefined,
    name: String(item.name ?? item.productName ?? ''),
    quantity: asNumber(item.quantity),
    price: asNumber(item.price ?? item.unitPrice),
    subtotal: item.subtotal === undefined ? undefined : asNumber(item.subtotal),
  }))
  const addressRaw = record.address
  const addressInfo = (addressRaw && typeof addressRaw === 'object' ? addressRaw : {}) as Record<string, unknown>
  const addressText = addressRaw === undefined || addressRaw === null
    ? undefined
    : typeof addressRaw === 'object'
      ? [addressInfo.region, addressInfo.detail].filter(Boolean).map(String).join(' ')
      : String(addressRaw)
  return {
    orderId: String(record.orderId ?? record.id ?? ''),
    customerName: record.customerName || addressInfo.contactName ? String(record.customerName || addressInfo.contactName) : undefined,
    contactName: record.contactName || addressInfo.contactName ? String(record.contactName || addressInfo.contactName) : undefined,
    contactPhone: record.contactPhone || addressInfo.contactPhone ? String(record.contactPhone || addressInfo.contactPhone) : undefined,
    address: addressText,
    remark: record.remark === undefined || record.remark === null ? undefined : String(record.remark),
    status: String(record.status ?? 'PROCESSING'),
    createdAt: record.createdAt ? String(record.createdAt) : undefined,
    productTotal: asNumber(record.productTotal ?? record.itemSubtotal ?? record.goodsAmount ?? record.subtotal),
    packagingFee: asNumber(record.packagingFee, 2),
    deliveryFee: asNumber(record.deliveryFee),
    fullReductionAmount: asNumber(record.fullReductionAmount),
    newCustomerAmount: asNumber(record.newCustomerAmount),
    memberDiscountAmount: asNumber(record.memberDiscountAmount),
    couponAmount: asNumber(record.couponAmount),
    deliveryFeeDiscount: asNumber(record.deliveryFeeDiscount),
    cancelReason: record.cancelReason ? String(record.cancelReason) : undefined,
    cancelledAt: record.cancelledAt ? String(record.cancelledAt) : undefined,
    cancelledBy: record.cancelledBy ? String(record.cancelledBy) : undefined,
    totalAmount: asNumber(record.totalAmount ?? record.total ?? record.amount ?? record.payAmount),
    items,
  }
}

function normalizePromotion(value: unknown): PromotionConfig {
  const record = (value ?? {}) as Record<string, unknown>
  const legacyTier = record.threshold !== undefined || record.amount !== undefined
    ? [{ threshold: asNumber(record.threshold), amount: asNumber(record.amount), sortOrder: 1 }]
    : []
  return {
    enabled: Boolean(record.enabled ?? record.fullReductionEnabled),
    fullReductions: (asArray<Record<string, unknown>>(record.fullReductions).length
      ? asArray<Record<string, unknown>>(record.fullReductions)
      : legacyTier).map((tier, index) => ({
        threshold: asNumber(tier.threshold),
        amount: asNumber(tier.amount),
        sortOrder: tier.sortOrder === undefined ? index + 1 : asNumber(tier.sortOrder),
      })),
    newCustomerEnabled: Boolean(record.newCustomerEnabled),
    newCustomerAmount: asNumber(record.newCustomerAmount),
    freeDeliveryEnabled: Boolean(record.freeDeliveryEnabled ?? (asNumber(record.freeDeliveryThreshold) > 0)),
    freeDeliveryThreshold: asNumber(record.freeDeliveryThreshold),
    memberDiscountEnabled: Boolean(record.memberDiscountEnabled),
    memberDiscountRate: asNumber(record.memberDiscountRate, 1),
  }
}

function normalizeReview(value: unknown): Review {
  const record = (value ?? {}) as Record<string, unknown>
  return {
    reviewId: String(record.reviewId ?? record.id ?? ''),
    orderId: record.orderId ? String(record.orderId) : undefined,
    userNickname: String(record.userNickname ?? record.nickname ?? '匿名顾客'),
    rating: asNumber(record.rating),
    content: String(record.content ?? ''),
    images: asArray<unknown>(record.images).map(String),
    tags: asArray<unknown>(record.tags).map(String),
    reply: record.reply ? String(record.reply) : undefined,
    repliedAt: record.repliedAt ? String(record.repliedAt) : undefined,
    createdAt: record.createdAt ? String(record.createdAt) : undefined,
  }
}

function normalizeConversation(value: unknown): Conversation {
  const record = (value ?? {}) as Record<string, unknown>
  const messages = asArray<Record<string, unknown>>(record.messages).map((item) => ({
    messageId: String(item.messageId ?? item.id ?? ''),
    senderId: item.senderId ? String(item.senderId) : undefined,
    senderRole: String(item.senderRole ?? item.role ?? ''),
    content: String(item.content ?? ''),
    createdAt: item.createdAt ? String(item.createdAt) : undefined,
  }))
  const last = messages.at(-1)
  return {
    conversationId: String(record.conversationId ?? record.id ?? ''),
    orderId: record.orderId ? String(record.orderId) : undefined,
    userNickname: String(record.userNickname ?? record.nickname ?? '顾客'),
    merchantRead: Boolean(record.merchantRead),
    unreadCount: asNumber(record.unreadCount, record.merchantRead ? 0 : 1),
    messages,
    lastMessage: record.lastMessage ? String(record.lastMessage) : last?.content,
    updatedAt: record.updatedAt ? String(record.updatedAt) : last?.createdAt,
  }
}

function normalizeOverview(value: unknown): Overview {
  const record = (value ?? {}) as Record<string, unknown>
  return {
    todaySalesAmount: asNumber(record.todaySalesAmount ?? record.salesAmount),
    validOrderCount: asNumber(record.validOrderCount ?? record.orderCount),
    expectedIncome: asNumber(record.expectedIncome ?? record.salesAmount),
    pendingOrderCount: asNumber(record.pendingOrderCount),
    unrepliedReviewCount: asNumber(record.unrepliedReviewCount),
    unreadMessageCount: asNumber(record.unreadMessageCount),
  }
}

function normalizeAnalytics(value: unknown, range: Analytics['range']): Analytics {
  const record = (value ?? {}) as Record<string, unknown>
  const normalizeDistribution = (items: unknown) => asArray<Record<string, unknown>>(items).map((item) => ({
    name: String(item.name ?? item.label ?? item.status ?? item.channel ?? ''),
    value: asNumber(item.value ?? item.count ?? item.amount),
  }))
  return {
    range: (record.range ?? range) as Analytics['range'],
    salesAmount: asNumber(record.salesAmount),
    orderCount: asNumber(record.orderCount),
    avgOrderAmount: asNumber(record.avgOrderAmount),
    trend: asArray<Record<string, unknown>>(record.trend ?? record.daily).map((item) => ({
      date: String(item.date ?? item.day ?? ''),
      salesAmount: asNumber(item.salesAmount ?? item.amount),
      orderCount: asNumber(item.orderCount ?? item.count),
    })),
    channelDistribution: normalizeDistribution(record.channelDistribution),
    statusDistribution: normalizeDistribution(record.statusDistribution),
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  const text = await response.text()
  let payload: unknown

  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    throw new ApiError('服务返回的不是 JSON，请检查接口地址或后端错误页。', response.status)
  }

  const body = (payload ?? {}) as { code?: number; message?: string; data?: unknown }
  if (!response.ok || body.code !== 0) {
    if ((response.status === 401 || response.status === 403) && path !== '/merchant/me' && !path.includes('/auth/login')) {
      window.dispatchEvent(new Event('elm-session-expired'))
    }
    throw new ApiError(body.message || `请求失败（${response.status}）`, response.status, body.code)
  }

  return body.data as T
}

interface MockState {
  signedIn: boolean
  merchant: Merchant
  store: Store
  categories: Category[]
  products: Product[]
  orders: Order[]
  promotion: PromotionConfig
  reviews: Review[]
  conversations: Conversation[]
}

const mockState: MockState = {
  signedIn: true,
  merchant: { merchantId: 'merchant-a', account: 'merchant-a', name: '肯德基宅急送商家' },
  store: {
    storeId: 'm002',
    name: '肯德基宅急送',
    description: '提供校园配送服务',
    contactPhone: '13800000002',
    startPrice: 20,
    deliveryFee: 3,
    status: 'OPEN',
  },
  categories: [
    { categoryId: 'c001', name: '人气套餐', sortOrder: 1 },
    { categoryId: 'c002', name: '汉堡小食', sortOrder: 2 },
    { categoryId: 'c003', name: '饮品', sortOrder: 3 },
  ],
  products: [
    { productId: 'p101', categoryId: 'c001', name: '香辣鸡腿堡套餐', description: '含可乐和薯条', price: 28, stock: 20, onSale: true, tags: ['招牌'], specOptions: [{ name: '标准', priceDelta: 0 }] },
    { productId: 'p102', categoryId: 'c002', name: '新奥尔良烤翅', description: '四块装', price: 16.5, stock: 12, onSale: true },
    { productId: 'p103', categoryId: 'c003', name: '百事可乐', description: '冰镇饮品', price: 6, stock: 0, onSale: false },
  ],
  orders: [
    {
      orderId: 'o10234',
      remark: '少放辣',
      customerName: '王小明',
      contactName: '王小明',
      contactPhone: '138****0001',
      address: '天津大学软件园校区 12号楼 304室',
      status: 'PROCESSING',
      createdAt: '2026-09-08 10:20:00',
      productTotal: 26,
      packagingFee: 2,
      deliveryFee: 3,
      fullReductionAmount: 2,
      totalAmount: 29,
      items: [{ productId: 'p101', name: '香辣鸡腿堡套餐', quantity: 1, price: 26, subtotal: 26 }],
    },
  ],
  promotion: {
    enabled: true,
    fullReductions: [{ threshold: 20, amount: 2 }, { threshold: 40, amount: 5 }],
    newCustomerEnabled: true,
    newCustomerAmount: 3,
    freeDeliveryEnabled: true,
    freeDeliveryThreshold: 30,
    memberDiscountEnabled: true,
    memberDiscountRate: 0.95,
  },
  reviews: [],
  conversations: [],
}

function mockCopy<T>(value: T): T {
  return structuredClone(value)
}

function nextId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}`
}

function mockRequireSession() {
  if (!mockState.signedIn) {
    throw new ApiError('登录状态已失效，请重新登录。', 401)
  }
}

const mockApi = {
  async login(account: string, password: string): Promise<MerchantSession> {
    if (account !== 'merchant-a' || password !== '123456') {
      throw new ApiError('账号或密码错误。', 401)
    }
    mockState.signedIn = true
    return mockCopy({ merchant: mockState.merchant, store: mockState.store })
  },
  async register(input: { account: string; password: string; storeName: string; contactPhone: string }) {
    if (!input.account || !input.password || !input.storeName || !input.contactPhone) {
      throw new ApiError('请完整填写注册信息。', 400)
    }
    if (input.account === 'merchant-a') {
      throw new ApiError('账号已存在。', 409)
    }
    mockState.merchant = { merchantId: nextId('merchant-'), account: input.account, name: input.storeName }
    mockState.store = {
      storeId: nextId('m'),
      name: input.storeName,
      contactPhone: input.contactPhone,
      startPrice: 0,
      deliveryFee: 0,
      description: '',
      status: 'CLOSED',
    }
    mockState.categories = []
    mockState.products = []
    mockState.orders = []
    mockState.reviews = []
    mockState.conversations = []
    mockState.signedIn = true
    return mockCopy({ merchant: mockState.merchant, store: mockState.store })
  },
  async me(): Promise<MerchantSession> {
    mockRequireSession()
    return mockCopy({ merchant: mockState.merchant, store: mockState.store })
  },
  async logout() {
    mockState.signedIn = false
  },
  async getStore(): Promise<Store> {
    mockRequireSession()
    return mockCopy(mockState.store)
  },
  async updateStore(input: StoreDraft): Promise<Store> {
    mockRequireSession()
    mockState.store = { ...mockState.store, ...input }
    return mockCopy(mockState.store)
  },
  async updateStoreStatus(status: StoreStatus): Promise<Store> {
    mockRequireSession()
    mockState.store = { ...mockState.store, status }
    return mockCopy(mockState.store)
  },
  async listCategories(): Promise<Category[]> {
    mockRequireSession()
    return mockCopy([...mockState.categories].sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0)))
  },
  async createCategory(input: CategoryDraft): Promise<Category> {
    mockRequireSession()
    if (mockState.categories.some((category) => category.name === input.name.trim())) {
      throw new ApiError('同一店铺内分类名称不能重复。', 409)
    }
    const category: Category = { categoryId: nextId('c'), name: input.name.trim(), sortOrder: input.sortOrder }
    mockState.categories.push(category)
    return mockCopy(category)
  },
  async updateCategory(categoryId: string, input: CategoryDraft): Promise<Category> {
    mockRequireSession()
    const category = mockState.categories.find((item) => item.categoryId === categoryId)
    if (!category) throw new ApiError('分类不存在。', 404)
    if (mockState.categories.some((item) => item.categoryId !== categoryId && item.name === input.name.trim())) {
      throw new ApiError('同一店铺内分类名称不能重复。', 409)
    }
    Object.assign(category, { name: input.name.trim(), sortOrder: input.sortOrder })
    return mockCopy(category)
  },
  async deleteCategory(categoryId: string) {
    mockRequireSession()
    if (mockState.products.some((product) => product.categoryId === categoryId)) {
      throw new ApiError('该分类仍有关联商品，请先处理商品归属。', 409)
    }
    const index = mockState.categories.findIndex((item) => item.categoryId === categoryId)
    if (index === -1) throw new ApiError('分类不存在。', 404)
    mockState.categories.splice(index, 1)
  },
  async bindCategoryProducts(categoryId: string, productIds: string[]) {
    mockRequireSession()
    if (!mockState.categories.some((item) => item.categoryId === categoryId)) throw new ApiError('分类不存在。', 404)
    if (productIds.some((id) => !mockState.products.some((item) => item.productId === id))) throw new ApiError('商品不存在。', 404)
    mockState.products.forEach((product) => {
      if (productIds.includes(product.productId)) product.categoryId = categoryId
    })
  },
  async listProducts(categoryId?: string): Promise<Product[]> {
    mockRequireSession()
    const products = categoryId ? mockState.products.filter((product) => product.categoryId === categoryId) : mockState.products
    return mockCopy(products)
  },
  async getProduct(productId: string): Promise<Product> {
    mockRequireSession()
    const product = mockState.products.find((item) => item.productId === productId)
    if (!product) throw new ApiError('商品不存在。', 404)
    return mockCopy(product)
  },
  async createProduct(input: ProductDraft): Promise<Product> {
    mockRequireSession()
    const product: Product = { productId: nextId('p'), ...input }
    mockState.products.push(product)
    return mockCopy(product)
  },
  async updateProduct(productId: string, input: ProductDraft): Promise<Product> {
    mockRequireSession()
    const product = mockState.products.find((item) => item.productId === productId)
    if (!product) throw new ApiError('商品不存在。', 404)
    Object.assign(product, input)
    return mockCopy(product)
  },
  async updateProductSpecifications(productId: string, specOptions: SpecOption[]): Promise<Product> {
    const product = mockState.products.find((item) => item.productId === productId)
    if (!product) throw new ApiError('商品不存在。', 404)
    product.specOptions = mockCopy(specOptions)
    return mockCopy(product)
  },
  async uploadImage(file: File): Promise<UploadedImage> {
    mockRequireSession()
    return { url: URL.createObjectURL(file), fileName: file.name, size: file.size, contentType: file.type }
  },
  async updateProductAvailability(productId: string, input: Partial<Pick<ProductDraft, 'onSale' | 'stock'>>): Promise<Product> {
    mockRequireSession()
    const product = mockState.products.find((item) => item.productId === productId)
    if (!product) throw new ApiError('商品不存在。', 404)
    // 只应用本次显式传入的字段：后端对 null 字段同样不做修改（CatalogService.availability）
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) (product as unknown as Record<string, unknown>)[key] = value
    }
    return mockCopy(product)
  },
  async deleteProduct(productId: string) {
    mockRequireSession()
    const product = mockState.products.find((item) => item.productId === productId)
    if (!product) throw new ApiError('商品不存在。', 404)
    if (product.onSale) throw new ApiError('在售商品请先下架后再删除。', 409)
    mockState.products = mockState.products.filter((item) => item.productId !== productId)
  },
  async listOrders(status?: string): Promise<Order[]> {
    mockRequireSession()
    return mockCopy(status ? mockState.orders.filter((order) => order.status === status) : mockState.orders)
  },
  async getOrder(orderId: string): Promise<Order> {
    mockRequireSession()
    const order = mockState.orders.find((item) => item.orderId === orderId)
    if (!order) throw new ApiError('订单不存在。', 404)
    return mockCopy(order)
  },
  async advanceOrder(orderId: string, status: string): Promise<Order> {
    const order = mockState.orders.find((item) => item.orderId === orderId)
    if (!order) throw new ApiError('订单不存在。', 404)
    const expected: Record<string, string> = { PENDING: 'COOKING', COOKING: 'DELIVERING', DELIVERING: 'COMPLETED' }
    if (expected[order.status] !== status) throw new ApiError('数据已变化，请刷新后重试。', 409)
    order.status = status
    return mockCopy(order)
  },
  async getPromotion() { mockRequireSession(); return mockCopy(mockState.promotion) },
  async savePromotion(input: PromotionConfig) { mockRequireSession(); mockState.promotion = mockCopy(input); return mockCopy(input) },
  async listReviews() { mockRequireSession(); return mockCopy(mockState.reviews) },
  async replyReview(reviewId: string, reply: string) {
    const review = mockState.reviews.find((item) => item.reviewId === reviewId)
    if (!review) throw new ApiError('评价不存在。', 404)
    review.reply = reply
    review.repliedAt = new Date().toISOString()
    return mockCopy(review)
  },
  async listConversations() { mockRequireSession(); return mockCopy(mockState.conversations) },
  async getConversation(conversationId: string) {
    const conversation = mockState.conversations.find((item) => item.conversationId === conversationId)
    if (!conversation) throw new ApiError('会话不存在。', 404)
    return mockCopy(conversation)
  },
  async sendMessage(conversationId: string, content: string) {
    const conversation = mockState.conversations.find((item) => item.conversationId === conversationId)
    if (!conversation) throw new ApiError('会话不存在。', 404)
    conversation.messages.push({ messageId: nextId('msg'), senderRole: 'MERCHANT', content, createdAt: new Date().toISOString() })
    conversation.lastMessage = content
    return mockCopy(conversation)
  },
  async markConversationRead(conversationId: string) {
    const conversation = mockState.conversations.find((item) => item.conversationId === conversationId)
    if (!conversation) throw new ApiError('会话不存在。', 404)
    conversation.merchantRead = true
    conversation.unreadCount = 0
    return mockCopy(conversation)
  },
  async getOverview(): Promise<Overview> {
    const valid = mockState.orders.filter((order) => !['PENDING_PAYMENT', 'CANCELLED'].includes(order.status))
    const total = valid.reduce((sum, order) => sum + order.totalAmount, 0)
    return { todaySalesAmount: total, validOrderCount: valid.length, expectedIncome: total, pendingOrderCount: valid.filter((order) => order.status === 'PENDING').length, unrepliedReviewCount: mockState.reviews.filter((review) => !review.reply).length, unreadMessageCount: mockState.conversations.reduce((sum, item) => sum + item.unreadCount, 0) }
  },
  async getAnalytics(range: Analytics['range']): Promise<Analytics> {
    const overview = await this.getOverview()
    return { range, salesAmount: overview.todaySalesAmount, orderCount: overview.validOrderCount, avgOrderAmount: overview.validOrderCount ? overview.todaySalesAmount / overview.validOrderCount : 0, trend: [], channelDistribution: [], statusDistribution: [] }
  },
}

const realApi = {
  async login(account: string, password: string): Promise<MerchantSession> {
    const data = await request<unknown>('/merchant/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account, password, role: 'merchant' }),
    })
    const record = (data ?? {}) as Record<string, unknown>
    const merchant = (record.merchant ?? record) as Merchant
    const store = normalizeStore(record.store)
    if (store.storeId) return { merchant, store }
    return this.me()
  },
  async register(input: { account: string; password: string; storeName: string; contactPhone: string }): Promise<MerchantSession> {
    const data = await request<unknown>('/merchants', { method: 'POST', body: JSON.stringify(input) })
    const record = (data ?? {}) as Record<string, unknown>
    const merchant = (record.merchant ?? record) as Merchant
    const store = normalizeStore(record.store)
    if (store.storeId) return { merchant, store }
    return this.me()
  },
  async me(): Promise<MerchantSession> {
    const data = await request<unknown>('/merchant/me')
    const record = (data ?? {}) as Record<string, unknown>
    const merchant = (record.merchant ?? record) as Merchant
    const store = normalizeStore(record.store ?? record.currentStore)
    return { merchant, store }
  },
  async logout() {
    await request<unknown>('/auth/logout', { method: 'POST', body: JSON.stringify({}) })
  },
  async getStore() {
    return normalizeStore(await request<unknown>('/merchant/store'))
  },
  async updateStore(input: StoreDraft) {
    return normalizeStore(await request<unknown>('/merchant/store', { method: 'PATCH', body: JSON.stringify(input) }))
  },
  async updateStoreStatus(status: StoreStatus) {
    return normalizeStore(await request<unknown>('/merchant/store/status', { method: 'PATCH', body: JSON.stringify({ status }) }))
  },
  async listCategories() {
    return asArray<unknown>(await request<unknown>('/merchant/categories')).map(normalizeCategory)
  },
  async createCategory(input: CategoryDraft) {
    return normalizeCategory(await request<unknown>('/merchant/categories', { method: 'POST', body: JSON.stringify(input) }))
  },
  async updateCategory(categoryId: string, input: CategoryDraft) {
    return normalizeCategory(await request<unknown>(`/merchant/categories/${encodeURIComponent(categoryId)}`, { method: 'PATCH', body: JSON.stringify(input) }))
  },
  async deleteCategory(categoryId: string) {
    await request<unknown>(`/merchant/categories/${encodeURIComponent(categoryId)}`, { method: 'DELETE' })
  },
  async bindCategoryProducts(categoryId: string, productIds: string[]) {
    await request<unknown>(`/merchant/categories/${encodeURIComponent(categoryId)}/products`, { method: 'PATCH', body: JSON.stringify({ productIds }) })
  },
  async listProducts(categoryId?: string) {
    const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : ''
    return asArray<unknown>(await request<unknown>(`/merchant/products${query}`)).map(normalizeProduct)
  },
  async getProduct(productId: string) {
    return normalizeProduct(await request<unknown>(`/merchant/products/${encodeURIComponent(productId)}`))
  },
  async createProduct(input: ProductDraft) {
    return normalizeProduct(await request<unknown>('/merchant/products', { method: 'POST', body: JSON.stringify(input) }))
  },
  async updateProduct(productId: string, input: ProductDraft) {
    return normalizeProduct(await request<unknown>(`/merchant/products/${encodeURIComponent(productId)}`, { method: 'PATCH', body: JSON.stringify(input) }))
  },
  async updateProductSpecifications(productId: string, specOptions: SpecOption[]) {
    return normalizeProduct(await request<unknown>(`/merchant/products/${encodeURIComponent(productId)}/specifications`, { method: 'PUT', body: JSON.stringify({ specOptions }) }))
  },
  async uploadImage(file: File): Promise<UploadedImage> {
    const form = new FormData()
    form.append('file', file)
    form.append('scene', 'product')
    return request<UploadedImage>('/files/images', { method: 'POST', body: form })
  },
  async updateProductAvailability(productId: string, input: Partial<Pick<ProductDraft, 'onSale' | 'stock'>>) {
    return normalizeProduct(await request<unknown>(`/merchant/products/${encodeURIComponent(productId)}/availability`, { method: 'PATCH', body: JSON.stringify(input) }))
  },
  async deleteProduct(productId: string) {
    await request<unknown>(`/merchant/products/${encodeURIComponent(productId)}`, { method: 'DELETE' })
  },
  async listOrders(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return asArray<unknown>(await request<unknown>(`/merchant/orders${query}`)).map(normalizeOrder)
  },
  async getOrder(orderId: string) {
    return normalizeOrder(await request<unknown>(`/merchant/orders/${encodeURIComponent(orderId)}`))
  },
  async advanceOrder(orderId: string, status: string) {
    return normalizeOrder(await request<unknown>(`/merchant/orders/${encodeURIComponent(orderId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }))
  },
  async getPromotion() { return normalizePromotion(await request<unknown>('/merchant/promotions')) },
  async savePromotion(input: PromotionConfig) {
    return normalizePromotion(await request<unknown>('/merchant/promotions', {
      method: 'PUT',
      body: JSON.stringify(input),
    }))
  },
  async listReviews() { return asArray<unknown>(await request<unknown>('/merchant/reviews')).map(normalizeReview) },
  async replyReview(reviewId: string, reply: string) { return normalizeReview(await request<unknown>(`/merchant/reviews/${encodeURIComponent(reviewId)}/reply`, { method: 'PATCH', body: JSON.stringify({ reply }) })) },
  async listConversations() { return asArray<unknown>(await request<unknown>('/conversations')).map(normalizeConversation) },
  async getConversation(conversationId: string) { return normalizeConversation(await request<unknown>(`/conversations/${encodeURIComponent(conversationId)}`)) },
  async sendMessage(conversationId: string, content: string) { return normalizeConversation(await request<unknown>(`/conversations/${encodeURIComponent(conversationId)}/messages`, { method: 'POST', body: JSON.stringify({ content }) })) },
  async markConversationRead(conversationId: string) { return normalizeConversation(await request<unknown>(`/conversations/${encodeURIComponent(conversationId)}/read`, { method: 'PATCH', body: JSON.stringify({}) })) },
  async getOverview() { return normalizeOverview(await request<unknown>('/merchant/overview')) },
  async getAnalytics(range: Analytics['range']) { return normalizeAnalytics(await request<unknown>(`/merchant/analytics?range=${encodeURIComponent(range)}`), range) },
}

export const merchantApi = apiMode === 'real' ? realApi : mockApi
export const isRealApiMode = apiMode === 'real'
