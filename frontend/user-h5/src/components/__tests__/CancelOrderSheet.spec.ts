import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CancelOrderSheet from '../CancelOrderSheet.vue'
import { orderApi } from '@/services/api'

/**
 * 取消订单确认弹层行为测试 TP 组（TODO-USER-002，2026-09-11）
 * 口径出处：PRD 7.6 取消订单规则（原因必填 1–50 字、二次确认）+ PRD 7.16.1「取消订单确认页-取消确认弹层」行 +
 * 契约 §3.5（POST /orders/{orderId}/cancel：reason 必填 1–50 字；COOKING 及之后 409；重复取消幂等）+
 * 设计真源 `docs/design/exports/用户端/12-订单与支付/03-取消确认弹窗/`。
 * 课程口径（PRD 明示）：**不出现退款、售后与资金处理文案**——设计稿原有的
 * 「如有已使用的优惠券将原路退回」已按负责人 2026-09-11 拍板删除，实现不得写回。
 * 测试场景由负责人确认后由 AI 落地；本组在 feat: 实现前必须红（脚手架见 chore: 提交）。
 */
vi.mock('@/services/api', () => ({ orderApi: { cancelOrder: vi.fn() } }))

function mountSheet(orderId = 'o1') {
  return mount(CancelOrderSheet, { props: { orderId } })
}

/** 四个快捷原因（PRD 7.16.1 逐字） */
const QUICK_REASONS = ['不想要了', '信息填写错误', '重新选购', '其他原因']

describe('CancelOrderSheet 取消订单确认弹层（批次⑩ TODO-USER-002）', () => {
  beforeEach(() => vi.clearAllMocks())

  it('TP-1 弹层结构：标题/说明/必填原因 chips/文本域计数/两个按钮（不含优惠券退回文案）', () => {
    const view = mountSheet()
    const sheet = view.get('[data-testid="cancel-sheet"]')
    expect(sheet.text()).toContain('取消订单')
    // 说明只保留「不可恢复」；设计稿的「优惠券将原路退回」按拍板删除
    expect(sheet.text()).toContain('订单取消后不可恢复')
    expect(sheet.text()).toContain('取消原因')
    expect(sheet.text()).toContain('必填')
    const chips = view.findAll('[data-testid="reason-chip"]')
    expect(chips.map((chip) => chip.text())).toEqual(QUICK_REASONS)
    expect(view.get('[data-testid="reason-input"]').attributes('placeholder')).toContain('请填写取消订单的具体原因')
    expect(view.get('[data-testid="reason-counter"]').text()).toBe('0/50')
    expect(view.get('[data-testid="cancel-keep-btn"]').text()).toContain('再想想')
    expect(view.get('[data-testid="cancel-confirm-btn"]').text()).toContain('确定取消')
  })

  it('TP-2 点快捷原因回填文本域，字数计数同步且上限 50 字（契约 §3.5 1–50 字符）', async () => {
    const view = mountSheet()
    await view.findAll('[data-testid="reason-chip"]')[1]!.trigger('click')
    const input = view.get('[data-testid="reason-input"]')
    expect((input.element as HTMLTextAreaElement).value).toBe('信息填写错误')
    expect(view.get('[data-testid="reason-counter"]').text()).toBe('6/50')
    expect(input.attributes('maxlength')).toBe('50')
  })

  it('TP-3 原因为空时不可提交并提示必填（不调用取消接口）', async () => {
    const view = mountSheet()
    const confirm = view.get('[data-testid="cancel-confirm-btn"]')
    expect(confirm.attributes('aria-disabled')).toBe('true')
    await confirm.trigger('click')
    await flushPromises()
    expect(view.get('[data-testid="cancel-reason-tip"]').text()).toContain('请填写取消原因')
    expect(orderApi.cancelOrder).not.toHaveBeenCalled()
  })

  it('TP-4 点「确定取消」提交成功：调取消接口并 emit cancelled；提交中按钮禁用显示处理中', async () => {
    let resolveCancel: (value: unknown) => void = () => undefined
    vi.mocked(orderApi.cancelOrder).mockImplementation(
      () => new Promise((resolve) => { resolveCancel = resolve }) as never,
    )
    const view = mountSheet()
    await view.findAll('[data-testid="reason-chip"]')[0]!.trigger('click')
    await view.get('[data-testid="cancel-confirm-btn"]').trigger('click')
    // 提交中：按钮禁用且文案为处理中，重复点击不产生第二次请求
    const pending = view.get('[data-testid="cancel-confirm-btn"]')
    expect(pending.attributes('disabled')).toBeDefined()
    expect(pending.text()).toContain('处理中')
    await pending.trigger('click')
    expect(orderApi.cancelOrder).toHaveBeenCalledTimes(1)
    expect(orderApi.cancelOrder).toHaveBeenCalledWith('o1', '不想要了')
    resolveCancel({ status: 'CANCELLED', cancelReason: '不想要了' })
    await flushPromises()
    expect(view.emitted('cancelled')).toHaveLength(1)
  })

  it('TP-5 提交被拒（已接单 409）：提示原因并 emit rejected 供页面刷新', async () => {
    vi.mocked(orderApi.cancelOrder).mockRejectedValue(new Error('商家已接单，无法取消'))
    const view = mountSheet()
    await view.findAll('[data-testid="reason-chip"]')[0]!.trigger('click')
    await view.get('[data-testid="cancel-confirm-btn"]').trigger('click')
    await flushPromises()
    expect(view.get('[data-testid="cancel-error-tip"]').text()).toContain('无法取消')
    expect(view.emitted('rejected')).toHaveLength(1)
    expect(view.emitted('cancelled')).toBeUndefined()
  })

  it('TP-6 「再想想」、右上角关闭与点遮罩都只关闭弹层，不调取消接口', async () => {
    const keep = mountSheet()
    await keep.get('[data-testid="cancel-keep-btn"]').trigger('click')
    expect(keep.emitted('close')).toHaveLength(1)

    const closeBtn = mountSheet()
    await closeBtn.get('[data-testid="cancel-sheet-close"]').trigger('click')
    expect(closeBtn.emitted('close')).toHaveLength(1)

    const overlay = mountSheet()
    await overlay.get('[data-testid="cancel-sheet-overlay"]').trigger('click')
    expect(overlay.emitted('close')).toHaveLength(1)

    expect(orderApi.cancelOrder).not.toHaveBeenCalled()
  })

  it('TP-7 课程口径：不出现退款、优惠券退回与售后文案', () => {
    const view = mountSheet()
    const text = view.get('[data-testid="cancel-sheet"]').text()
    expect(text).not.toContain('退款')
    expect(text).not.toContain('原路退回')
    expect(text).not.toContain('售后')
  })
})
