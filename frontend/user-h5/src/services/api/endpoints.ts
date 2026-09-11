/**
 * 接口路径单点维护（相对 /api/v1 前缀）
 * 与 docs/backend/后端接口契约.md 逐条对齐；改动必须同步契约文档（架构约定 §5）
 */
export const endpoints = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/me',
  },
  user: {
    register: '/users',
  },
  store: {
    list: '/stores',
    detail: (storeId: string) => `/stores/${storeId}`,
    categories: (storeId: string) => `/stores/${storeId}/categories`,
    products: (storeId: string) => `/stores/${storeId}/products`,
  },
  cart: {
    list: '/cart',
    add: '/cart/items',
    byId: (cartLineId: string) => `/cart/items/${cartLineId}`,
  },
  // 地址簿（契约 §3.3）：列表/新增/单查/修改/删除
  address: {
    list: '/me/addresses',
    add: '/me/addresses',
    byId: (addressId: string) => `/me/addresses/${addressId}`,
  },
  // 订单（契约 §3.5）：POST 创建 / GET 列表 / GET 详情（明细含在详情，P0）
  order: {
    create: '/orders',
    list: '/orders',
    detail: (orderId: string) => `/orders/${orderId}`,
    payment: (orderId: string) => `/orders/${encodeURIComponent(orderId)}/payment`,
    // 用户取消订单（契约 §3.5：reason 必填 1–50 字；COOKING 及之后 409；重复取消幂等）
    cancel: (orderId: string) => `/orders/${encodeURIComponent(orderId)}/cancel`,
  },
} as const
