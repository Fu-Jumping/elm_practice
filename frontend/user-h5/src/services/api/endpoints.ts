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
  // 搜索（契约 §3.6）：关键词搜索同时返回商家与商品汇总；排序 综合/销量/距离；分页 page/size
  search: {
    query: '/search',
    suggest: '/search/suggest',
    hot: '/search/hot',
  },
  // 文件上传（契约 §10.1）：单张 multipart（字段 file，可选 scene=product/review）；
  // 读取经静态映射 /uploads/** 提供，业务侧只保存返回的 url
  file: {
    upload: '/files/images',
    read: (fileName: string) => `/files/images/${fileName}`,
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
    // 计价预览（契约 §3.5，CHG-006）：确认订单页下单前取后端七步计价结果，只读
    preview: '/orders/preview',
  },
  // 消息（契约 §6.1）：会话列表/详情/发消息/标记已读（列表支持 orderId 过滤，供订单详情「联系商家」直取会话）
  conversation: {
    list: '/conversations',
    detail: (id: string) => `/conversations/${encodeURIComponent(id)}`,
    messages: (id: string) => `/conversations/${encodeURIComponent(id)}/messages`,
    read: (id: string) => `/conversations/${encodeURIComponent(id)}/read`,
  },
  // 通知（契约 §3.9）：列表/单条已读/全部已读/未读数（未读数用途即底部导航角标）
  notification: {
    list: '/me/notifications',
    read: (id: string) => `/me/notifications/${encodeURIComponent(id)}/read`,
    readAll: '/me/notifications/read',
    unreadCount: '/me/notifications/unread-count',
  },
  // 评价（契约 §6.2）：用户为已完成订单提交评价 / 查询店铺评价列表
  review: {
    submit: (orderId: string) => `/orders/${encodeURIComponent(orderId)}/review`,
    byStore: (storeId: string) => `/stores/${encodeURIComponent(storeId)}/reviews`,
  },
  // 商家收藏（契约 §3.7）：列表 / 收藏 / 取消收藏（取消未被收藏的商店按幂等 200）
  favorite: {
    list: '/me/favorites',
    add: '/me/favorites',
    remove: (storeId: string) => `/me/favorites/${encodeURIComponent(storeId)}`,
  },
  // 会员（契约 §3.8）：会员标识与权益说明（开通与续费接口本期不提供）
  member: {
    me: '/me/member',
  },
  // 红包（契约 §3.8 + §3.10 CHG-001）：列表（available/expired）/ 当前订单可用 / 买套餐 / 爆一次
  coupon: {
    list: '/me/coupons',
    available: '/me/coupons/available',
    packs: '/me/coupon-packs',
    blast: '/me/coupons/blast',
  },
  // AI 点餐助手（契约 §10.6）：非流式 /chat；流式 /stream-chat（text/event-stream 文本分片）
  ai: {
    chat: '/ai/chat',
    streamChat: '/ai/stream-chat',
  },
} as const
