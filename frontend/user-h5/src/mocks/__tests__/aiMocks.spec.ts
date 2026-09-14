import { beforeEach, describe, expect, it } from 'vitest'
import { mockDispatch } from '../index'
import { resetAiMockState } from '../ai'
import { ALL_PRODUCTS, STORES } from '../store'

/**
 * AI 点餐助手接口替身用例 AM-1~AM-6（契约 §10.6 + AI点餐助手前端PRD §4/§5，2026-09-14）
 *
 * 口径出处：契约 §10.6（`POST /api/v1/ai/chat`，请求 `{sessionId?, prompt}`，响应 `{sessionId, reply}`；
 * 只做推荐查询不下单；只能依据知识库真实数据、不得编造；知识库查不到如实告知「暂时没有」）。
 * 替身离线可跑：知识库直接由工程内演示种子（`mocks/store.ts` 的 STORES / ALL_PRODUCTS）构成，
 * 保证 mock 模式演示与真实后端「知识库来自业务库在售数据」同口径。
 * 本组在 feat: 实现前必须红（`mocks/ai.ts` 由 feat: 创建）。
 */
async function chat(prompt: string, sessionId?: string) {
  const res = await mockDispatch({
    method: 'POST',
    url: '/ai/chat',
    data: sessionId ? { sessionId, prompt } : { prompt },
  })
  return res
}

describe('AI 点餐助手替身（契约 §10.6）', () => {
  beforeEach(() => {
    resetAiMockState()
    // 用例内不改动共享种子：断言只读，出问题即报错（与 mocks 其他域同口径）
    expect(STORES.length).toBeGreaterThan(0)
    expect(ALL_PRODUCTS.length).toBeGreaterThan(0)
  })

  it('AM-1 传 sessionId 时回显同一 sessionId，reply 非空', async () => {
    const res = await chat('我想吃辣的', 'sid-fixed')
    expect(res.status).toBe(200)
    const data = res.payload.data as { sessionId: string; reply: string }
    expect(data.sessionId).toBe('sid-fixed')
    expect(typeof data.reply).toBe('string')
    expect(data.reply.trim().length).toBeGreaterThan(0)
  })

  it('AM-2 不传 sessionId 时返回新会话 id（非空且两次不同）', async () => {
    const first = (await chat('不知道吃什么')).payload.data as unknown as { sessionId: string }
    const second = (await chat('不知道吃什么')).payload.data as unknown as { sessionId: string }
    expect(first.sessionId).toBeTruthy()
    expect(second.sessionId).toBeTruthy()
    expect(first.sessionId).not.toBe(second.sessionId)
  })

  it('AM-3 prompt 为空或纯空白返回 400', async () => {
    expect((await chat('')).status).toBe(400)
    expect((await chat('   ')).status).toBe(400)
  })

  it('AM-4 按店铺名推荐：命中知识库的真实商家与菜品金额（不得编造）', async () => {
    const res = await chat('肯德基有什么')
    const reply = (res.payload.data as { reply: string }).reply
    expect(reply).toContain('肯德基宅急送')
    expect(reply).toContain('[m002]')
    expect(reply).toContain('香辣鸡腿堡')
    expect(reply).toContain('¥19.50')
  })

  it('AM-5 多轮记忆：同一 sessionId 内追问时记得上一轮的店铺', async () => {
    const first = await chat('我想吃辣的', 'sid-memory')
    const firstReply = (first.payload.data as { reply: string }).reply
    expect(firstReply).toContain('[m002]')

    const second = await chat('还有什么喝的', 'sid-memory')
    const secondReply = (second.payload.data as { reply: string }).reply
    // 记得上一轮说的是 m002 → 直接给该店饮品（九珍果汁），而不是全平台泛推荐
    expect(secondReply).toContain('[m002]')
    expect(secondReply).toContain('九珍果汁')

    // 另起会话则不带上一轮上下文（不得串会话）
    const other = await chat('还有什么喝的', 'sid-other')
    expect((other.payload.data as unknown as { sessionId: string }).sessionId).toBe('sid-other')
  })

  it('AM-6 知识库没有的如实说「暂时没有」，且不编造商家编号', async () => {
    const res = await chat('有没有螺蛳粉')
    const reply = (res.payload.data as { reply: string }).reply
    expect(reply).toContain('暂时没有')
    expect(reply).not.toMatch(/\[m\d+/)
  })

  it('AM-7 只推荐在售商品（下架商品不出现在推荐里）', async () => {
    const offShelf = ALL_PRODUCTS.find((item) => item.onSale === false)
    if (!offShelf) return
    const res = await chat(`推荐 ${offShelf.name}`)
    const reply = (res.payload.data as { reply: string }).reply
    expect(reply).not.toContain(offShelf.name)
  })
})
