/**
 * 商家端订单详情「拒单 / 打印小票」课程演示入口的红测试（TDD 红）
 *
 * 依据 PRD 7.11（订单处理）：**「拒单仅给出课程演示提示，打印小票仅模拟反馈」**——
 * 两项均为课程演示项，不调用真实接口、不改变订单状态与金额。
 *
 * 本文件为入口缺失前的失败测试：订单详情抽屉当前只有「状态推进」与「联系顾客」两个入口，
 * 首次运行必须失败（找不到「拒单」「打印小票」按钮）。修复时不得删除或放宽断言。
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../src/App'

beforeEach(() => {
  window.location.hash = '#orders'
})

async function openOrderDetail() {
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: /查看详情/ }, { timeout: 3000 }))
  return user
}

describe('订单详情课程演示入口（PRD 7.11 拒单 / 打印小票）', () => {
  it('订单详情应提供「拒单」与「打印小票」入口', async () => {
    await openOrderDetail()

    expect(await screen.findByRole('button', { name: /拒\s*单/ }, { timeout: 3000 })).toBeTruthy()
    expect(await screen.findByRole('button', { name: /打印小票/ }, { timeout: 3000 })).toBeTruthy()
  })

  it('点击「拒单」只给出课程演示提示，且不改变订单状态', async () => {
    const user = await openOrderDetail()
    const statusBefore = document.body.textContent.match(/待接单|制作中|配送中|已完成|进行中|待支付/)?.[0]

    await user.click(await screen.findByRole('button', { name: /拒\s*单/ }, { timeout: 3000 }))

    expect(await screen.findByText(/课程演示/, undefined, { timeout: 3000 })).toBeTruthy()
    const statusAfter = document.body.textContent.match(/待接单|制作中|配送中|已完成|进行中|待支付/)?.[0]
    expect(statusAfter).toBe(statusBefore)
  })

  it('点击「打印小票」只给出模拟反馈，且不改变订单状态', async () => {
    const user = await openOrderDetail()
    const statusBefore = document.body.textContent.match(/待接单|制作中|配送中|已完成|进行中|待支付/)?.[0]

    await user.click(await screen.findByRole('button', { name: /打印小票/ }, { timeout: 3000 }))

    expect(await screen.findByText(/模拟/, undefined, { timeout: 3000 })).toBeTruthy()
    const statusAfter = document.body.textContent.match(/待接单|制作中|配送中|已完成|进行中|待支付/)?.[0]
    expect(statusAfter).toBe(statusBefore)
  })
})
