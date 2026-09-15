/**
 * 评价域接口（契约 §6.2，批次⑩ TODO-USER-003）
 * 提交评价：POST /orders/{orderId}/review（rating 1–5 必填，content/tags/images 为评价内容与可选字段）
 * 店铺评价：GET /stores/{storeId}/reviews（按时间倒序，含商家回复）
 */
import { request } from '@/services/http'
import type { ReviewFilter, ReviewPage, ReviewRecord, ReviewSubmitPayload } from './types'
import { endpoints } from './endpoints'

export function submitReview(orderId: string, body: ReviewSubmitPayload): Promise<ReviewRecord> {
  return request<ReviewRecord>({ method: 'POST', url: endpoints.review.submit(orderId), data: body })
}

/** 店铺评价（契约 §6.2 Wave3）：返回 summary（平均分+总数）+ 按筛选收窄的 list */
export function getStoreReviews(storeId: string, filter: ReviewFilter = '全部'): Promise<ReviewPage> {
  return request<ReviewPage>({
    method: 'GET',
    url: endpoints.review.byStore(storeId),
    params: filter === '全部' ? undefined : { filter },
  })
}
