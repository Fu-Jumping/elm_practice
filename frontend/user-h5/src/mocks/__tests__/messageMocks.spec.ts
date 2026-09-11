import { beforeEach, describe, expect, it } from 'vitest'
import { mockDispatch } from '../index'
import { CONVERSATION_SEED, conversationMockState, NOTIFICATION_SEED, notificationMockState } from '../message'

/**
 * 消息与通知接口替身用例 TW-12（TODO-USER-004a，2026-09-11，契约 §6.1/§3.9）
 * 覆盖：通知列表时间倒序与未读数一致、标记单条/全部已读幂等、会话列表按 orderId 过滤、
 * 会话详情 404、标记会话已读清零、发消息空/超长 400（TC-MSG-004）与成功追加（TC-MSG-001）。
 * 本组在 feat: 实现前必须红（`mocks/message.ts` 由 feat: 创建）。
 */
describe('消息与通知接口替身（契约 §6.1/§3.9）', () => {
  beforeEach(() => {
    conversationMockState.splice(
      0,
      conversationMockState.length,
      ...CONVERSATION_SEED.map((item) => ({ ...item })),
    )
    notificationMockState.splice(
      0,
      notificationMockState.length,
      ...NOTIFICATION_SEED.map((item) => ({ ...item })),
    )
  })

  it('TW-12a 通知列表时间倒序，未读数与未读条数一致；标记单条与全部已读幂等', async () => {
    const list = await mockDispatch({ method: 'GET', url: '/me/notifications' })
    const items = list.payload.data as Array<Record<string, unknown>>
    const times = items.map((item) => Date.parse(String(item.createdAt)))
    expect([...times].sort((a, b) => b - a)).toEqual(times)

    const before = await mockDispatch({ method: 'GET', url: '/me/notifications/unread-count' })
    expect(before.payload.data).toBe(items.filter((item) => !item.read).length)

    const first = items.find((item) => !item.read)!
    const id = String(first.notificationId)
    await mockDispatch({ method: 'PATCH', url: `/me/notifications/${id}/read` })
    const again = await mockDispatch({ method: 'PATCH', url: `/me/notifications/${id}/read` })
    expect(again.status).toBe(200)

    await mockDispatch({ method: 'PATCH', url: '/me/notifications/read' })
    const after = await mockDispatch({ method: 'GET', url: '/me/notifications/unread-count' })
    expect(after.payload.data).toBe(0)
  })

  it('TW-12b 会话列表按 orderId 过滤；会话详情含消息；未知会话 404', async () => {
    const all = await mockDispatch({ method: 'GET', url: '/conversations' })
    expect((all.payload.data as unknown[]).length).toBe(CONVERSATION_SEED.length)

    const filtered = await mockDispatch({
      method: 'GET',
      url: '/conversations',
      params: { orderId: 'o0002' },
    })
    const matched = filtered.payload.data as Array<Record<string, unknown>>
    expect(matched).toHaveLength(1)
    expect(matched[0]!.orderId).toBe('o0002')

    const detail = await mockDispatch({ method: 'GET', url: '/conversations/cv2001' })
    expect(detail.status).toBe(200)
    expect((detail.payload.data as { messages: unknown[] }).messages.length).toBeGreaterThan(0)

    const missing = await mockDispatch({ method: 'GET', url: '/conversations/cv9999' })
    expect(missing.status).toBe(404)
  })

  it('TW-12c 标记会话已读清零且幂等', async () => {
    const before = await mockDispatch({ method: 'GET', url: '/conversations/cv2001' })
    expect((before.payload.data as { unread: number }).unread).toBeGreaterThan(0)
    await mockDispatch({ method: 'PATCH', url: '/conversations/cv2001/read' })
    const after = await mockDispatch({ method: 'GET', url: '/conversations/cv2001' })
    expect((after.payload.data as { unread: number }).unread).toBe(0)
    const again = await mockDispatch({ method: 'PATCH', url: '/conversations/cv2001/read' })
    expect(again.status).toBe(200)
  })

  it('TW-12d 发消息：空白与超长 400 不落库；正常发送追加并更新摘要（TC-MSG-001/004）', async () => {
    const blank = await mockDispatch({
      method: 'POST',
      url: '/conversations/cv2001/messages',
      data: { content: '   ' },
    })
    expect(blank.status).toBe(400)

    const tooLong = await mockDispatch({
      method: 'POST',
      url: '/conversations/cv2001/messages',
      data: { content: 'x'.repeat(201) },
    })
    expect(tooLong.status).toBe(400)

    const before = conversationMockState.find((item) => item.conversationId === 'cv2001')!
    const messagesBefore = (await mockDispatch({ method: 'GET', url: '/conversations/cv2001' })).payload
      .data as { messages: unknown[] }

    const ok = await mockDispatch({
      method: 'POST',
      url: '/conversations/cv2001/messages',
      data: { content: ' 麻烦多给一份餐具 ' },
    })
    expect(ok.status).toBe(200)
    expect((ok.payload.data as { content: string }).content).toBe('麻烦多给一份餐具')

    const after = conversationMockState.find((item) => item.conversationId === 'cv2001')!
    expect(after.lastMessage).toBe('麻烦多给一份餐具')
    const messagesAfter = (await mockDispatch({ method: 'GET', url: '/conversations/cv2001' })).payload
      .data as { messages: unknown[] }
    expect(messagesAfter.messages.length).toBe(messagesBefore.messages.length + 1)
    expect(before.conversationId).toBe(after.conversationId)
  })
})
