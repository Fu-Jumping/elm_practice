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
export * as messageApi from './message'
export * as favoriteApi from './favorite'
export * as memberApi from './member'
export * as couponApi from './coupon'
export * as searchApi from './search'
export * as fileApi from './file'
export * as aiApi from './ai'

// AI 域错误类型与结果类型（页面按 PRD §6.3 异常表分流时需要区分）
export { AI_TIMEOUT_MS, AiTimeoutError, AiUnavailableError } from './ai'
export type { AiChatMessage, AiChatPayload, AiChatResult } from './types'
// 搜索增强（契约 §3.6）：联想候选类型（SearchEntryView 下拉用）
export type { SearchSuggestion } from './search'
