import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import StoreDetailView from '../StoreDetailView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { useCartStore } from '@/stores/cartStore'
import { onToast } from '@/utils/toast'
import { clearMockCart, getMockCartSnapshot } from '@/mocks/cart'

/**
 * 商家详情页·规格弹层与会员价用例 SPEC-1～SPEC-7（2026-09-15）
 * 口径：PRD 7.16.1「商品规格弹层-规格弹层」行（有规格的商品卡显示规格入口，点击加号打开本弹层；
 *       规格由商品配置返回，没有默认值时必须先选择；数量默认 1；价格由后端按商品单价与规格价差计算，
 *       页面只展示；遮罩或关闭按钮放弃本次输入；必选规格未选/数量越界提示；请求中按钮禁用）
 *       ＋ PRD 7.12/契约 §3.4·§4.2（购物车与订单按「商品 + 规格组合」区分，`cartLineId` 行唯一范围，
 *       同一商品不同规格不得错误合并）＋ PRD 7.10（会员价展示，价格行高亮）
 *       ＋ TC-SPC-002（用户选择规格加购，双端）、TC-SPC-007（无规格商品沿用基础计价，双端）
 * SPEC-1 有规格商品点加号打开弹层且不直接加购；无规格商品仍直接按基础价加购（对照）
 * SPEC-2 未选规格时「加入购物车」禁用并提示，不发加购请求
 * SPEC-3 预览价 =（基础价 + 已选规格价差）× 数量；数量增减刷新预览价
 * SPEC-4 提交带 specOptions 的加购成功：弹层关闭、购物车栏刷新、购物车弹层显示规格文案
 * SPEC-5 同一商品不同规格在购物车中分行（不同规格不得合并），单价各含各自价差
 * SPEC-6 遮罩点击放弃本次输入；数量不得超过库存
 * SPEC-7 会员价：接口返回 memberPrice 才展示并高亮；缺失整块隐藏且不出现 undefined
 * SPEC-8 有规格商品加购后，商品列表卡片显示该商品的已加**合计**数量（同一商品不同规格是不同行，
 *        卡片数量为各行之和）；行内不出现减号（多规格行无法确定减哪一行，增减统一在规格弹层与
 *        购物车弹层内完成）；加号仍打开规格弹层。对应缺陷：有规格商品此前被整体排除在步进器之外，
 *        加购成功后卡片无任何数量反馈，只剩"未加购"外观（PRD 7.16.1：加购成功后购物车栏数量与金额立即刷新）
 * 本组在 feat: 实现前必须红（规格弹层、会员价行与替身规格数据由 feat: 加入）。
 */
describe('StoreDetailView（规格弹层与会员价，2026-09-15）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  beforeEach(() => {
    messages.length = 0
    offToast = onToast((message) => messages.push(message))
    clearMockCart('m002')
    clearMockCart('m003')
  })

  afterEach(() => {
    offToast?.()
  })

  async function mountDetail(path = '/stores/m002') {
    const pinia = createPinia()
    setActivePinia(pinia)
    useSessionStore().user = { account: '13800000001', nickname: '张同学' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/stores/:storeId', name: 'store-detail', component: StoreDetailView },
        { path: '/login', name: 'login', component: { template: '<div />' } },
        { path: '/orders/confirm', name: 'order-confirm', component: { template: '<div />' } },
      ],
    })
    await router.push(path)
    await router.isReady()
    const wrapper = mount(StoreDetailView, { global: { plugins: [pinia, router] } })
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="add-btn-p107"]').exists()).toBe(true),
      { timeout: 10000 },
    )
    return { wrapper, router }
  }

  it('SPEC-1 有规格商品点加号打开规格弹层且不直接加购；无规格商品仍直接加购（TC-SPC-007 对照）', async () => {
    const { wrapper } = await mountDetail()

    // 有规格商品：卡片上显示规格入口提示
    expect(wrapper.find('[data-testid="spec-hint-p107"]').exists()).toBe(true)
    await wrapper.find('[data-testid="add-btn-p107"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="spec-popup"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="spec-popup-name"]').text()).toContain('双人分享套餐')
    // 未选定规格前不产生加购：购物车弹层暂无该商品行
    expect(getMockCartSnapshot('m002')).toHaveLength(0)

    // 关闭弹层后改用无规格商品：仍走原「直接按基础价加购」路径
    await wrapper.find('[data-testid="spec-popup-close"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="spec-popup"]').exists()).toBe(false)
    await wrapper.find('[data-testid="add-btn-p101"]').trigger('click')
    await vi.waitFor(() => expect(getMockCartSnapshot('m002')).toHaveLength(1), { timeout: 10000 })
    expect(getMockCartSnapshot('m002')[0]?.unitPrice).toBe(19.5)
    expect(getMockCartSnapshot('m002')[0]?.specOptions).toBeUndefined()
  })

  it('SPEC-2 未选规格时提交被拦截并提示，不发加购请求（PRD 异常列：必选规格未选）', async () => {
    const { wrapper } = await mountDetail()
    await wrapper.find('[data-testid="add-btn-p107"]').trigger('click')
    await flushPromises()

    // 未选规格 → 提交按钮禁用
    expect(wrapper.find('[data-testid="spec-submit"]').attributes('disabled')).toBeDefined()
    await wrapper.find('[data-testid="spec-submit"]').trigger('click')
    await flushPromises()
    expect(getMockCartSnapshot('m002')).toHaveLength(0)
    expect(wrapper.find('[data-testid="spec-popup"]').exists()).toBe(true)
  })

  it('SPEC-3 预览价 =（基础价 + 规格价差）× 数量，随选规格与数量变化', async () => {
    const { wrapper } = await mountDetail()
    await wrapper.find('[data-testid="add-btn-p107"]').trigger('click')
    await flushPromises()

    // 默认数量 1；未选规格时按基础价预览
    expect(wrapper.find('[data-testid="spec-quantity"]').text()).toBe('1')
    expect(wrapper.find('[data-testid="spec-preview-total"]').text()).toContain('¥49.00')

    // 选「加量份」（价差 +4）→ 预览价 53.00
    await wrapper.find('[data-testid="spec-option-加量份"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="spec-preview-total"]').text()).toContain('¥53.00')
    expect(wrapper.find('[data-testid="spec-option-加量份"]').classes()).toContain('is-selected')

    // 数量 +1 → 预览价 106.00
    await wrapper.find('[data-testid="spec-plus"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="spec-quantity"]').text()).toBe('2')
    expect(wrapper.find('[data-testid="spec-preview-total"]').text()).toContain('¥106.00')

    // 换选「标准份」（价差 0）→ 预览价 98.00，且原选项取消选中
    await wrapper.find('[data-testid="spec-option-标准份"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="spec-preview-total"]').text()).toContain('¥98.00')
    expect(wrapper.find('[data-testid="spec-option-加量份"]').classes()).not.toContain('is-selected')
  })

  it('SPEC-4 提交带规格的加购：弹层关闭、购物车栏与购物车弹层显示规格（TC-SPC-002）', async () => {
    const { wrapper } = await mountDetail()
    await wrapper.find('[data-testid="add-btn-p107"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="spec-option-加量份"]').trigger('click')
    await wrapper.find('[data-testid="spec-submit"]').trigger('click')

    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="spec-popup"]').exists()).toBe(false),
      { timeout: 10000 },
    )
    const lines = getMockCartSnapshot('m002')
    expect(lines).toHaveLength(1)
    expect(lines[0]?.specOptions).toEqual([{ name: '加量份', priceDelta: 4 }])
    // 单价含价差（49 + 4），购物车栏合计同步刷新
    expect(lines[0]?.unitPrice).toBe(53)
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="cart-bar-total"]').text()).toContain('¥53.00'),
      { timeout: 10000 },
    )

    // 购物车弹层内的行展示规格文案
    await wrapper.find('[data-testid="cart-bar"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="cart-popup-item"]').text()).toContain('加量份')
  })

  it('SPEC-5 同一商品不同规格在购物车中分行，不错误合并（契约 §3.4 行唯一范围）', async () => {
    const { wrapper } = await mountDetail()

    // 第一次：标准份 1 件
    await wrapper.find('[data-testid="add-btn-p107"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="spec-option-标准份"]').trigger('click')
    await wrapper.find('[data-testid="spec-submit"]').trigger('click')
    await vi.waitFor(() => expect(getMockCartSnapshot('m002')).toHaveLength(1), { timeout: 10000 })

    // 第二次：同一商品改选加量份 → 必须是新行（不同规格不得合并）
    await wrapper.find('[data-testid="add-btn-p107"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="spec-option-加量份"]').trigger('click')
    await wrapper.find('[data-testid="spec-submit"]').trigger('click')
    await vi.waitFor(() => expect(getMockCartSnapshot('m002')).toHaveLength(2), { timeout: 10000 })

    const lines = getMockCartSnapshot('m002')
    expect(lines.map((line) => line.unitPrice).sort((a, b) => a - b)).toEqual([49, 53])
    // 同规格重复加购仍然合并为一行（数量累加）
    await wrapper.find('[data-testid="add-btn-p107"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="spec-option-标准份"]').trigger('click')
    await wrapper.find('[data-testid="spec-submit"]').trigger('click')
    await vi.waitFor(
      () => {
        const current = getMockCartSnapshot('m002')
        expect(current).toHaveLength(2)
        expect(current.find((line) => line.unitPrice === 49)?.quantity).toBe(2)
      },
      { timeout: 10000 },
    )
  })

  it('SPEC-6 遮罩点击放弃本次输入；数量越界被拦截（PRD 交互/异常列）', async () => {
    const { wrapper } = await mountDetail()
    await wrapper.find('[data-testid="add-btn-p107"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="spec-option-标准份"]').trigger('click')
    await wrapper.find('[data-testid="spec-popup-mask"]').trigger('click')
    await flushPromises()

    // 放弃本次输入：弹层关闭且未加购
    expect(wrapper.find('[data-testid="spec-popup"]').exists()).toBe(false)
    expect(getMockCartSnapshot('m002')).toHaveLength(0)

    // 重新打开：数量减到 0 被拦截，保持在 1
    await wrapper.find('[data-testid="add-btn-p107"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="spec-minus"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="spec-quantity"]').text()).toBe('1')
    expect(messages.join('|')).toContain('数量至少为 1')
  })

  it('SPEC-7 会员价：接口返回才展示并高亮；缺失整块隐藏且不出现 undefined（PRD 7.10）', async () => {
    const { wrapper } = await mountDetail()

    // p107 返回 memberPrice=45 → 展示会员价行
    const memberRow = wrapper.find('[data-testid="member-price-p107"]')
    expect(memberRow.exists()).toBe(true)
    expect(memberRow.text()).toContain('会员价')
    expect(memberRow.text()).toContain('¥45.00')

    // p101 返回 memberPrice=17.5 → 同样展示
    const memberRow101 = wrapper.find('[data-testid="member-price-p101"]')
    expect(memberRow101.exists()).toBe(true)
    expect(memberRow101.text()).toContain('¥17.50')

    // 未返回 memberPrice 的商品（p102）→ 整块隐藏，不显示 undefined
    expect(wrapper.find('[data-testid="member-price-p102"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('undefined')
  })

  it('SPEC-8 有规格商品加购后卡片显示累计数量，行内无减号且加号仍开弹层（红端：卡片无数量反馈）', async () => {
    const { wrapper } = await mountDetail()

    // 初始未加购：卡片不显示数量
    expect(wrapper.find('[data-testid="product-qty-p107"]').exists()).toBe(false)

    // 选「标准份」加购 1 件 → 卡片立即显示 1
    await wrapper.find('[data-testid="add-btn-p107"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="spec-option-标准份"]').trigger('click')
    await wrapper.find('[data-testid="spec-submit"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="product-qty-p107"]').text()).toBe('1'),
      { timeout: 10000 },
    )

    // 同一商品改选「加量份」再加 1 件（不同规格分行）→ 卡片数量为两行之和
    await wrapper.find('[data-testid="add-btn-p107"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="spec-option-加量份"]').trigger('click')
    await wrapper.find('[data-testid="spec-submit"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="product-qty-p107"]').text()).toBe('2'),
      { timeout: 10000 },
    )

    // 有规格商品行内不做减号：多规格行无法确定减哪一行（增减在弹层内完成）
    expect(wrapper.find('[data-testid="minus-btn-p107"]').exists()).toBe(false)

    // 加号仍打开规格弹层（PRD 850：有规格商品卡点加号打开规格弹层）
    await wrapper.find('[data-testid="add-btn-p107"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="spec-popup"]').exists()).toBe(true)
  })
})
