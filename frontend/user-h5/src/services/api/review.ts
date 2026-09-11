/**
 * 评价域接口（契约 §6.2，批次⑩ TODO-USER-003）
 * 提交评价：POST /orders/{orderId}/review（rating 1–5 必填，content/tags/images 为评价内容与可选字段）
 * 店铺评价：GET /stores/{storeId}/reviews（按时间倒序，含商家回复）
 */
import { request } from '@/services/http'
import type { ReviewRecord, ReviewSubmitPayload } from './types'
import { endpoints } from './endpoints'

export function submitReview(orderId: string, body: ReviewSubmitPayload): Promise<ReviewRecord> {
  return request<ReviewRecord>({ method: 'POST', url: endpoints.review.submit(orderId), data: body })
}

export function getStoreReviews(storeId: string): Promise<ReviewRecord[]> {
  return request<ReviewRecord[]>({ method: 'GET', url: endpoints.review.byStore(storeId) })
}
