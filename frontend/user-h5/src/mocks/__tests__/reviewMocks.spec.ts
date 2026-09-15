import { beforeEach, describe, expect, it } from 'vitest'
import { mockDispatch } from '../index'
import { ORDER_SEED, orderMockState } from '../order'
import { REVIEW_SEED, reviewMockState } from '../review'

/**
 * 评价接口替身用例 TV-12（批次⑩ TODO-USER-003，契约 §6.2）
 * 覆盖：提交成功标记订单已评价并可查（含脱敏昵称）、重复评价 409（同一订单只允许一条，TC-REV-004）、
 * 未完成订单 409（TC-REV-005）、评分非法 400（TC-REV-006）、店铺评价列表含商家回复且倒序（TC-REV-003）。
 * 本组在 feat: 实现前必须红。
 */
describe('评价接口替身（契约 §6.2）', () => {
  beforeEach(() => {
    // 重置为种子（含一条商家回复的评价），避免清空导致列表类用例无数据
    reviewMockState.splice(0, reviewMockState.length, ...REVIEW_SEED.map((item) => ({ ...item })))
    orderMockState.splice(
      0,
      orderMockState.length,
      ...ORDER_SEED.map((item) => ({ ...item })),
      {
        ...ORDER_SEED[0]!,
        orderId: 'or01',
        status: 'COMPLETED',
        reviewed: false,
        storeId: 'm002',
        items: [{ productId: 'p101', name: '香辣脆皮鸡腿堡', unitPrice: 19.5, quantity: 1, subtotal: 19.5 }],
      },
    )
  })

  it('TV-12a 提交成功：订单标记已评价，并出现在店铺评价列表（含脱敏昵称）', async () => {
    const res = await mockDispatch({
      method: 'POST',
      url: '/orders/or01/review',
      data: { rating: 5, content: '出餐快，味道好', tags: ['味道好'] },
    })
    expect(res.status).toBe(200)
    expect(orderMockState.find((order) => order.orderId === 'or01')?.reviewed).toBe(true)

    const list = await mockDispatch({ method: 'GET', url: '/stores/m002/reviews' })
    // 2026-09-15 Wave3：响应改为 { summary, list }（契约 §6.2）
    const page = list.payload.data as { summary: { averageRating: number; totalCount: number }; list: Array<Record<string, unknown>> }
    expect(page.summary.totalCount).toBeGreaterThan(0)
    const reviews = page.list
    const mine = reviews.find((item) => item.orderId === 'or01')
    expect(mine).toBeDefined()
    expect(mine!.rating).toBe(5)
    expect(String(mine!.userNickname)).toContain('*')
  })

  it('TV-12b 重复评价 → 409，不新增第二条（TC-REV-004）', async () => {
    await mockDispatch({ method: 'POST', url: '/orders/or01/review', data: { rating: 5, content: '很好' } })
    const dup = await mockDispatch({
      method: 'POST',
      url: '/orders/or01/review',
      data: { rating: 5, content: '再来一次' },
    })
    expect(dup.status).toBe(409)
    const list = await mockDispatch({ method: 'GET', url: '/stores/m002/reviews' })
    const mine = ((list.payload.data as { list: Array<Record<string, unknown>> }).list).filter((item) => item.orderId === 'or01')
    expect(mine).toHaveLength(1)
  })

  it('TV-12c 未完成订单评价 → 409；评分非法 → 400（TC-REV-005/006）', async () => {
    const notCompleted = await mockDispatch({
      method: 'POST',
      url: '/orders/o0001/review',
      data: { rating: 5, content: 'x' },
    })
    expect(notCompleted.status).toBe(409)
    const badRating = await mockDispatch({
      method: 'POST',
      url: '/orders/or01/review',
      data: { rating: 6, content: 'x' },
    })
    expect(badRating.status).toBe(400)
  })

  it('TV-12d 店铺评价列表含商家回复与回复时间，按时间倒序（TC-REV-003）', async () => {
    const list = await mockDispatch({ method: 'GET', url: '/stores/m002/reviews' })
    const reviews = (list.payload.data as { list: Array<Record<string, unknown>> }).list
    expect(reviews.length).toBeGreaterThan(0)
    const replied = reviews.find((item) => item.reply)
    expect(replied).toBeDefined()
    expect(String(replied!.reply)).toBeTruthy()
    expect(String(replied!.repliedAt)).toBeTruthy()
    const times = reviews.map((item) => Date.parse(String(item.createdAt)))
    expect([...times].sort((a, b) => b - a)).toEqual(times)
  })
})
