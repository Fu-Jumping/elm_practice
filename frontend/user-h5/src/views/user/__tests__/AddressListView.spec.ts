import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import AddressListView from '../AddressListView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { ADDRESS_SEED, addressMockState } from '@/mocks/address'

/**
 * 地址列表页 P0 行为测试 T31–T35（2026-09-07 第二批，口径来自 PRD 7.9 + 7.16 地址列表页两行，AI 辅助脚手架）
 * T31 列表渲染：联系人/电话/地区/详址/标签；默认地址置顶且带"默认"标识
 * T32 空态：无数据提示 + "新增地址"入口
 * T33 未登录进入 → 转登录带 redirect
 * T34 设为默认：调用更新接口，成功后默认标识迁移且仅一条默认
 * T35 删除：二次确认后调用删除接口，列表刷新
 */
describe('AddressListView（地址列表页 P0）', () => {
  let offToast: (() => void) | undefined
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    offToast = undefined
    addressMockState.splice(0, addressMockState.length, ...ADDRESS_SEED.map((item) => ({ ...item })))
    // 每条用例独立 pinia 并先激活：login() 与视图共用同一实例
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterEach(() => {
    offToast?.()
  })

  /** 第二地址（非默认），供设默认/删除用例使用 */
  const SECOND = {
    addressId: 'da002',
    contactName: '李同学',
    contactSex: '女' as const,
    contactPhone: '13900000000',
    region: '天津大学北洋园校区',
    detail: '11号楼 502室',
    label: '家',
    isDefault: false,
  }

  async function mountList(path = '/addresses') {
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/login', name: 'login', component: { template: '<div />' } },
        { path: '/addresses', name: 'address-list', component: AddressListView },
        { path: '/addresses/new', name: 'address-new', component: { template: '<div />' } },
        { path: '/addresses/:addressId/edit', name: 'address-edit', component: { template: '<div />' } },
        { path: '/orders/confirm', name: 'order-confirm', component: { template: '<div />' } },
      ],
    })
    await router.push(path)
    await router.isReady()
    const wrapper = mount(AddressListView, { global: { plugins: [pinia, router] } })
    return { wrapper, router }
  }

  function login() {
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    return session
  }

  it('T31 列表渲染联系人/电话/地址，默认地址置顶带默认标识', async () => {
    login()
    const { wrapper } = await mountList()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="address-card"]').length).toBe(1),
      { timeout: 2000 },
    )
    const card = wrapper.find('[data-testid="address-card-da001"]')
    expect(card.text()).toContain('张同学')
    expect(card.text()).toContain('13800000001')
    expect(card.text()).toContain('天津大学北洋园校区')
    expect(card.text()).toContain('12号楼 304室')
    expect(card.text()).toContain('学校')
    expect(card.find('[data-testid="default-tag-da001"]').exists()).toBe(true)
  })

  it('T32 无地址显示空态与新增地址入口', async () => {
    login()
    addressMockState.splice(0, addressMockState.length)
    const { wrapper } = await mountList()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="address-empty"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="address-empty"]').text()).toContain('暂无收货地址')
    expect(wrapper.find('[data-testid="add-address-btn"]').exists()).toBe(true)
  })

  it('T33 未登录进入 → 跳登录并带 redirect', async () => {
    const { router } = await mountList()
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'), { timeout: 2000 })
    expect(String(router.currentRoute.value.query.redirect)).toContain('/addresses')
  })

  it('T34 设为默认：默认标识迁移且仅一条默认（TC-ADR-003 前端侧）', async () => {
    login()
    addressMockState.push({ ...SECOND })
    const { wrapper } = await mountList()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="address-card"]').length).toBe(2),
      { timeout: 2000 },
    )
    // 点击 da002 的"设为默认"
    await wrapper.find('[data-testid="set-default-da002"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="default-tag-da002"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    // 原默认取消标识（TC-ADR-003：仅一条默认）
    expect(wrapper.find('[data-testid="default-tag-da001"]').exists()).toBe(false)
  })

  it('T35 删除：二次确认后调用删除，列表刷新', async () => {
    login()
    addressMockState.push({ ...SECOND })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { wrapper } = await mountList()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="address-card"]').length).toBe(2),
      { timeout: 2000 },
    )
    await wrapper.find('[data-testid="delete-da001"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="address-card"]').length).toBe(1),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="address-card-da001"]').exists()).toBe(false)
    expect(confirmSpy).toHaveBeenCalled()
  })

  // T58 地址选择回填（2026-09-07 第三批，PRD 873 行：确认订单场景点击地址卡选中并返回，
  // 管理场景仍进入编辑；回填不直接创建订单）
  it('T58 选择模式（query.select）：点击地址卡回传所选地址并返回确认订单；管理场景仍进编辑', async () => {
    login()
    addressMockState.push({ ...SECOND })
    // 选择模式：从确认订单进入
    const { wrapper, router } = await mountList('/addresses?select=1&storeId=m002')
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="address-card"]').length).toBe(2),
      { timeout: 2000 },
    )
    await wrapper.find('[data-testid="address-card-da002"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('order-confirm')
    expect(router.currentRoute.value.query.addressId).toBe('da002')
    expect(router.currentRoute.value.query.storeId).toBe('m002')

    // 对照：管理场景（无 select 标记）点击地址卡仍进入编辑
    const mgmt = await mountList('/addresses')
    await vi.waitFor(
      () => expect(mgmt.wrapper.findAll('[data-testid="address-card"]').length).toBe(2),
      { timeout: 2000 },
    )
    await mgmt.wrapper.find('[data-testid="address-card-da002"]').trigger('click')
    await flushPromises()
    expect(mgmt.router.currentRoute.value.name).toBe('address-edit')
    expect(mgmt.router.currentRoute.value.params.addressId).toBe('da002')
  })

  // T61 选择模式新增入口透传来源上下文（2026-09-08 缺陷修复：新增后要能回到选择回填链路）
  it('T61 选择模式点「新增地址」→ 新增页携带 select 与 storeId', async () => {
    login()
    const { wrapper, router } = await mountList('/addresses?select=1&storeId=m002')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="add-address-btn"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    await wrapper.find('[data-testid="add-address-btn"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('address-new')
    expect(router.currentRoute.value.query.select).toBe('1')
    expect(router.currentRoute.value.query.storeId).toBe('m002')
  })
})
