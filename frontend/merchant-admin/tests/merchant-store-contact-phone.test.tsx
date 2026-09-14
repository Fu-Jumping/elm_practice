/**
 * BUG-20260908-012 处置更新后的回归测试（TDD 红）：店铺设置联系电话字段恢复
 *
 * 背景：该字段曾因后端 `StorePatch` 无 `contactPhone`、保存会被静默丢弃（假成功）而由前端先行移除，
 * 并在 `tests/pr36-review-gaps.test.tsx` 中断言「不应渲染该字段」（临时处置）。
 * 后端字段已随 PR #61（`codex/merchant-stage2`）落入 main，且 `Store`/`StoreDraft`/`normalizeStore`
 * 均已支持该字段，故按缺陷单处置说明恢复前端字段。
 *
 * 契约口径（`docs/backend/后端接口契约.md` L364）：`PATCH /merchant/store` 的 `contactPhone` 为可选字段，
 * 传入时必须为 11 位手机号（`^1\d{10}$`），空串或格式非法返回 400 且不落库；
 * PRD L993 店铺设置基本资料卡片中「店铺名称」必填、联系电话非必填，但要求格式不合法时提示并定位字段。
 *
 * 本文件为恢复前的失败测试：首次运行必须失败（字段不存在、无格式校验）。
 * 修复时不得删除或放宽断言。
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../src/App'
import { merchantApi } from '../src/services/merchantApi'

beforeEach(() => {
  window.location.hash = '#store'
})

describe('店铺设置联系电话（BUG-20260908-012 恢复）', () => {
  it('店铺设置应提供联系电话输入框', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: '店铺设置' })).toBeTruthy()
    expect(await screen.findByLabelText(/联系电话/)).toBeTruthy()
  })

  it('保存店铺设置时应把联系电话提交给后端', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: '店铺设置' })
    const save = await screen.findByRole('button', { name: /保存店铺设置/ })
    const phone = await screen.findByLabelText(/联系电话/)
    await user.clear(phone)
    await user.type(phone, '13800000002')
    await user.click(save)

    const session = await merchantApi.me()
    expect(session.store.contactPhone).toBe('13800000002')
  })

  it('联系电话格式非法时应提示且不提交保存（契约要求 11 位手机号）', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: '店铺设置' })
    const save = await screen.findByRole('button', { name: /保存店铺设置/ })
    const before = (await merchantApi.me()).store.contactPhone

    const phone = await screen.findByLabelText(/联系电话/)
    await user.clear(phone)
    await user.type(phone, '022-12345678')
    await user.click(save)

    expect(await screen.findByText('请输入 11 位手机号')).toBeTruthy()
    expect((await merchantApi.me()).store.contactPhone).toBe(before)
  })
})
