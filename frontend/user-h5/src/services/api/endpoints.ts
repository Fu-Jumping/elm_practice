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
    // TODO(购物车弹层任务)：PATCH/DELETE /cart/items/{cartLineId} 届时接入
  },
  // 地址簿（契约 §3.3）：GET 列表 / POST 新增；PATCH/DELETE/{addressId} 待地址管理页任务接入
  address: {
    list: '/me/addresses',
    add: '/me/addresses',
  },
  // 订单（契约 §3.5）：POST 创建 / GET 列表 / GET 详情；明细含在详情（P0）
  order: {
    create: '/orders',
    list: '/orders',
  },
} as const
