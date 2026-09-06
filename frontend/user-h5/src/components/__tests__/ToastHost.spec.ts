import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ToastHost from '../ToastHost.vue'
import { toast } from '@/utils/toast'

/**
 * ToastHost 轻提示视觉层（2026-09-06 负责人拍板口径）
 * 单条覆盖：连续调用只显示最新一条；顶部居中深色胶囊白字；约 2 秒自动消失
 * PRD 口径来源：占位内容点击提示"暂未开放"需用户可见（PRD 7.16.1）
 */
describe('ToastHost（轻提示视觉层）', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('T5 toast() 后渲染可见提示，2 秒后自动消失', async () => {
    const wrapper = mount(ToastHost)
    toast('暂未开放')
    await wrapper.vm.$nextTick()
    const node = wrapper.find('[data-testid="toast"]')
    expect(node.exists()).toBe(true)
    expect(node.text()).toBe('暂未开放')
    // 2 秒内仍在，到点消失
    vi.advanceTimersByTime(1999)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="toast"]').exists()).toBe(true)
    vi.advanceTimersByTime(1)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="toast"]').exists()).toBe(false)
  })

  it('T6 连续调用单条覆盖，只显示最新提示且重新计时', async () => {
    const wrapper = mount(ToastHost)
    toast('第一条')
    await wrapper.vm.$nextTick()
    toast('第二条')
    await wrapper.vm.$nextTick()
    const nodes = wrapper.findAll('[data-testid="toast"]')
    expect(nodes).toHaveLength(1)
    expect(nodes[0]!.text()).toBe('第二条')
    // 覆盖时重置计时：到 2s 一并消失，不残留
    vi.advanceTimersByTime(2000)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="toast"]').exists()).toBe(false)
  })
})
