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
  status: string
  createdAt?: string
  productTotal: number
  packagingFee: number
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
}

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

function normalizeOrder(value: unknown): Order {
  const record = (value ?? {}) as Record<string, unknown>
  const items = asArray<Record<string, unknown>>(record.items).map((item) => ({
    productId: item.productId ? String(item.productId) : undefined,
    name: String(item.name ?? item.productName ?? ''),
    quantity: asNumber(item.quantity),
    price: asNumber(item.price ?? item.unitPrice),
    subtotal: item.subtotal === undefined ? undefined : asNumber(item.subtotal),
  }))
  return {
    orderId: String(record.orderId ?? record.id ?? ''),
    customerName: record.customerName ? String(record.customerName) : undefined,
    contactName: record.contactName ? String(record.contactName) : undefined,
    contactPhone: record.contactPhone ? String(record.contactPhone) : undefined,
    address: record.address ? String(record.address) : undefined,
    status: String(record.status ?? 'PROCESSING'),
    createdAt: record.createdAt ? String(record.createdAt) : undefined,
    productTotal: asNumber(record.productTotal ?? record.goodsAmount ?? record.subtotal),
    packagingFee: asNumber(record.packagingFee, 2),
    totalAmount: asNumber(record.totalAmount ?? record.amount ?? record.payAmount),
    items,
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
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
}

const mockState: MockState = {
  signedIn: true,
  merchant: { merchantId: 'merchant-a', account: 'merchant-a', name: '肯德基宅急送商家' },
  store: {
    storeId: 'm002',
    name: '肯德基宅急送',
    description: '提供校园配送服务',
    contactPhone: '022-12345678',
    status: 'OPEN',
  },
  categories: [
    { categoryId: 'c001', name: '人气套餐', sortOrder: 1 },
    { categoryId: 'c002', name: '汉堡小食', sortOrder: 2 },
    { categoryId: 'c003', name: '饮品', sortOrder: 3 },
  ],
  products: [
    { productId: 'p101', categoryId: 'c001', name: '香辣鸡腿堡套餐', description: '含可乐和薯条', price: 28, stock: 20, onSale: true },
    { productId: 'p102', categoryId: 'c002', name: '新奥尔良烤翅', description: '四块装', price: 16.5, stock: 12, onSale: true },
    { productId: 'p103', categoryId: 'c003', name: '百事可乐', description: '冰镇饮品', price: 6, stock: 0, onSale: false },
  ],
  orders: [
    {
      orderId: 'o10234',
      customerName: '王小明',
      contactName: '王小明',
      contactPhone: '138****0001',
      address: '天津大学软件园校区 12号楼 304室',
      status: 'PROCESSING',
      createdAt: '2026-09-08 10:20:00',
      productTotal: 26,
      packagingFee: 2,
      totalAmount: 28,
      items: [{ productId: 'p101', name: '香辣鸡腿堡套餐', quantity: 1, price: 26, subtotal: 26 }],
    },
  ],
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
      description: '',
      status: 'CLOSED',
    }
    mockState.categories = []
    mockState.products = []
    mockState.orders = []
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
  async updateProductAvailability(productId: string, input: Pick<ProductDraft, 'onSale' | 'stock'>): Promise<Product> {
    mockRequireSession()
    const product = mockState.products.find((item) => item.productId === productId)
    if (!product) throw new ApiError('商品不存在。', 404)
    Object.assign(product, input)
    return mockCopy(product)
  },
  async deleteProduct(productId: string) {
    mockRequireSession()
    const product = mockState.products.find((item) => item.productId === productId)
    if (!product) throw new ApiError('商品不存在。', 404)
    if (product.onSale) throw new ApiError('在售商品请先下架后再删除。', 409)
    mockState.products = mockState.products.filter((item) => item.productId !== productId)
  },
  async listOrders(): Promise<Order[]> {
    mockRequireSession()
    return mockCopy(mockState.orders)
  },
  async getOrder(orderId: string): Promise<Order> {
    mockRequireSession()
    const order = mockState.orders.find((item) => item.orderId === orderId)
    if (!order) throw new ApiError('订单不存在。', 404)
    return mockCopy(order)
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
  async updateProductAvailability(productId: string, input: Pick<ProductDraft, 'onSale' | 'stock'>) {
    return normalizeProduct(await request<unknown>(`/merchant/products/${encodeURIComponent(productId)}/availability`, { method: 'PATCH', body: JSON.stringify(input) }))
  },
  async deleteProduct(productId: string) {
    await request<unknown>(`/merchant/products/${encodeURIComponent(productId)}`, { method: 'DELETE' })
  },
  async listOrders() {
    return asArray<unknown>(await request<unknown>('/merchant/orders')).map(normalizeOrder)
  },
  async getOrder(orderId: string) {
    return normalizeOrder(await request<unknown>(`/merchant/orders/${encodeURIComponent(orderId)}`))
  },
}

export const merchantApi = apiMode === 'real' ? realApi : mockApi
export const isRealApiMode = apiMode === 'real'
