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
  // TODO(9/4 起)：address 地址簿 /me/addresses、cart 购物车 /cart、order 订单 /orders
} as const
