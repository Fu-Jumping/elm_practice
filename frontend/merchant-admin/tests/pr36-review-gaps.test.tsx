/**
 * PR #36 评审功能缺口红测试（TDD 红，预期失败）
 *
 * 覆盖评审四项缺口：
 * 1. 订单状态中文映射须覆盖后端 Domain.OrderStatus 全部 6 个枚举
 * 2. 订单备注 remark 须映射并在详情展示（PRD 6.13/7.11 P0 字段）
 * 3. 登录成功后回跳原页面（PRD 7.15：保留当前页面地址，登录后返回原流程）
 * 4. 店铺设置不再渲染后端不支持的联系电话字段（BUG-20260908-012 前端侧处置：
 *    后端 StorePatch 无 contactPhone，保存即假成功，先行移除）
 *
 * 首次运行应失败；对应实现补齐后转绿。修复时不得删除或放宽断言。
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../src/App'
import { normalizeOrder } from '../src/services/merchantApi'
import { orderStatusLabel } from '../src/App'

beforeEach(async () => {
  window.location.hash = ''
})

describe('订单状态映射覆盖后端全部枚举（评审缺口1）', () => {
  it('PENDING/COOKING/DELIVERING 应翻译为中文', () => {
    expect(orderStatusLabel('PENDING')).toBe('待接单')
    expect(orderStatusLabel('COOKING')).toBe('制作中')
    expect(orderStatusLabel('DELIVERING')).toBe('配送中')
  })
})

describe('订单备注 remark 映射与展示（评审缺口2）', () => {
  it('normalizeOrder 应保留 remark 字段', () => {
    const order = normalizeOrder({ orderId: 'o1', status: 'PROCESSING', remark: '少放辣', total: 31 })
    expect(order.remark).toBe('少放辣')
  })

  it('订单详情抽屉应展示备注', async () => {
    window.location.hash = '#orders'
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /查看详情/ }, { timeout: 3000 }))
    expect(await screen.findByText('少放辣', undefined, { timeout: 3000 })).toBeTruthy()
  })
})

describe('登录成功后回跳原页面（评审缺口3，PRD 7.15）', () => {
  it('未登录访问商品管理 → 登录成功后应回到商品管理而非订单页', async () => {
    await (await import('../src/services/merchantApi')).merchantApi.logout()
    window.location.hash = '#products'
    const user = userEvent.setup()
    render(<App />)

    // 未登录被拦到登录页
    expect(await screen.findByRole('heading', { name: '校园外卖商家版' })).toBeTruthy()
    await user.type(screen.getByLabelText('账号'), 'merchant-a')
    await user.type(screen.getByLabelText('密码'), '123456')
    await user.click(screen.getByRole('button', { name: /登\s*录/ }))

    // 登录成功后应回到商品管理页
    expect(await screen.findByRole('heading', { name: '商品管理' })).toBeTruthy()
    expect(window.location.hash).toBe('#products')
  })
})

// BUG-20260908-012 处置更新（2026-09-14）：原断言「不应渲染联系电话」系后端无该字段时的临时处置，
// 后端 `StorePatch.contactPhone` 已随 PR #61 落入 main，按缺陷单说明恢复字段，断言随之反转为「应提供」。
describe('店铺设置联系电话字段（评审缺口4，BUG-20260908-012 恢复）', () => {
  it('店铺设置表单应提供联系电话输入框', async () => {
    window.location.hash = '#store'
    render(<App />)

    expect(await screen.findByRole('heading', { name: '店铺设置' })).toBeTruthy()
    expect(await screen.findByLabelText(/联系电话/)).toBeTruthy()
  })
})
