/**
 * 评价域 mock（契约 §6.2，批次⑩ TODO-USER-003）
 * - `POST /orders/:orderId/review`：订单须存在（本替身单用户，按存在性判定 404）、须为已完成（否则 409，
 *   TC-REV-005）、同一订单只允许一条评价（已评价 409，TC-REV-004）、评分须为 1–5 的整数（否则 400）、
 *   评价正文不超过 200 字（课程口径：文档未定长度，前端 maxlength 与本校验同值，已在留痕登记）；
 *   成功则标记订单 `reviewed = true` 并写入评价（昵称按契约脱敏）
 * - `GET /stores/:storeId/reviews`：按时间倒序返回该店评价（含 tags/images/reply/repliedAt/userNickname，TC-REV-003）
 */
import { formatTime } from '@/services/normalizers'
import type { ReviewRecord } from '@/services/api/types'
import { orderMockState } from './order'
import type { MockHandler } from './index'
import { fail, ok } from './index'

/** 评价正文长度上限（课程口径，与 ReviewOrderView 的 maxlength 同值） */
const MAX_CONTENT_LENGTH = 200

/** 店铺评价种子（m002 两条含一条商家回复；m003 一条；其余店铺无评价用于空态验证） */
export const REVIEW_SEED: ReviewRecord[] = [
  {
    reviewId: 'rv1001',
    orderId: 'o0001',
    storeId: 'm002',
    rating: 5,
    content: '出餐很快，鸡腿堡还是热的，包装也完好。',
    tags: ['配送快', '味道好'],
    images: ['/design-assets/首页-精细/product-thumb-2.png', '/design-assets/首页-精细/product-thumb-3.png'],
    userNickname: '李**',
    createdAt: '2026-09-11 09:30:00',
    reply: '感谢支持，欢迎下次光临！',
    repliedAt: '2026-09-11 10:05:00',
  },
  {
    reviewId: 'rv1002',
    orderId: 'o0002',
    storeId: 'm002',
    rating: 4,
    content: '薯条稍微有点软，整体还是满意的。',
    tags: ['分量足'],
    images: [],
    userNickname: '王**',
    createdAt: '2026-09-10 12:00:00',
    reply: null,
    repliedAt: null,
  },
  {
    reviewId: 'rv1003',
    orderId: 'o0003',
    storeId: 'm003',
    rating: 5,
    content: '巨无霸味道很正，下次还会点。',
    tags: ['味道好'],
    images: [],
    userNickname: '赵**',
    createdAt: '2026-09-09 19:20:00',
    reply: null,
    repliedAt: null,
  },
]

export const reviewMockState: ReviewRecord[] = REVIEW_SEED.map((item) => ({ ...item }))

export const reviewMocks: Record<string, MockHandler> = {
  'POST /orders/:orderId/review': ({ params, data }) => {
    const order = orderMockState.find((item) => item.orderId === params?.orderId)
    if (!order) return fail(404, 40400, '订单不存在')
    if (order.status !== 'COMPLETED') return fail(409, 40900, '订单未完成，暂不能评价')
    if (order.reviewed) return fail(409, 40900, '该订单已评价')
    const body = (data ?? {}) as {
      rating?: number
      content?: string
      tags?: string[]
      images?: string[]
    }
    const rating = Number(body.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return fail(400, 40000, '评分需在 1–5 之间')
    }
    // 正文首尾空白由服务端裁剪（TC-REV-006）
    const content = String(body.content ?? '').trim()
    if (content.length > MAX_CONTENT_LENGTH) return fail(400, 40000, '评价内容过长')
    // 评价图片张数上限（契约 §10.1 定稿 + TC-IMG-007）：前端最多选 3 张，后端兜底拒绝第 4 张
    const submittedImages = Array.isArray(body.images) ? body.images : []
    if (submittedImages.length > 3) return fail(400, 40000, '评价图片最多 3 张')
    const review: ReviewRecord = {
      reviewId: `rv${1000 + reviewMockState.length + 1}`,
      orderId: order.orderId,
      storeId: order.storeId,
      rating,
      content,
      tags: Array.isArray(body.tags) ? [...body.tags] : [],
      images: Array.isArray(body.images) ? [...body.images] : [],
      userNickname: '张**',
      createdAt: formatTime(new Date()),
      reply: null,
      repliedAt: null,
    }
    order.reviewed = true
    reviewMockState.push(review)
    return ok({ ...review })
  },

  'GET /stores/:storeId/reviews': ({ params }) => {
    const list = reviewMockState
      .filter((item) => item.storeId === params?.storeId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    return ok(list.map((item) => ({ ...item })))
  },
}
