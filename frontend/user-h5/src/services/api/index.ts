/**
 * api 桶导出：页面只通过命名空间调用（如 authApi.login / storeApi.getStoreList），
 * 路径拼接与响应拆包一律收敛在 services 层，页面不直接解析原始响应（架构约定 §3.3）
 */
export * as authApi from './auth'
export * as storeApi from './store'
export * as cartApi from './cart'
export * as addressApi from './address'
export * as orderApi from './order'
export * as reviewApi from './review'
