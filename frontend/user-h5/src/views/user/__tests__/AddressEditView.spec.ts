import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import AddressEditView from '../AddressEditView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { ADDRESS_SEED, addressMockState } from '@/mocks/address'

/**
 * 新增/编辑地址页 P0 行为测试 T36–T39（2026-09-07 第二批，口径来自 PRD 7.9 + 7.16 新增地址页三行，AI 辅助脚手架）
 * T36 非法表单：逐字段提示、不发请求、停留当前页（TC-ADR-002 前端体验层）
 * T37 新增合法提交：只发一次请求，成功返回列表且新地址可见
 * T38 编辑模式：回显地址数据，修改保存成功（TC-ADR-005）
 * T39 编辑地址不存在：提示并返回列表（PRD 顶部栏行）
 * 口径：表单校验复用 validateAddressForm（第一批 T19-T22）；保存中禁用按钮（PRD 7.9 提交中"保存中"）
 */
describe('AddressEditView（新增/编辑地址页 P0）', () => {
  let offToast: (() => void) | undefined

  beforeEach(() => {
    offToast = undefined
    addressMockState.splice(0, addressMockState.length, ...ADDRESS_SEED.map((item) => ({ ...item })))
  })

  afterEach(() => {
    offToast?.()
  })

  function bootstrapPinia() {
    const pinia = createPinia()
    setActivePinia(pinia)
    return pinia
  }

  async function mountEdit(path: string, pinia?: ReturnType<typeof createPinia>) {
    const p = pinia ?? bootstrapPinia()
    setActivePinia(p)
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/addresses', name: 'address-list', component: { template: '<div />' } },
        { path: '/addresses/new', name: 'address-new', component: AddressEditView },
        { path: '/addresses/:addressId/edit', name: 'address-edit', component: AddressEditView },
      ],
    })
    await router.push(path)
    await router.isReady()
    const wrapper = mount(AddressEditView, { global: { plugins: [p, router] } })
    return { wrapper, router }
  }

  it('T36 必填全空提交 → 逐字段提示且停留当前页（不发请求）', async () => {
    const { wrapper, router } = await mountEdit('/addresses/new')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="save-address-btn"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    await wrapper.find('[data-testid="save-address-btn"]').trigger('click')
    await flushPromises()
    // 逐字段错误提示（联系人/电话/地区/详址）
    expect(wrapper.find('[data-testid="error-contactName"]').text()).toContain('联系人不能为空')
    expect(wrapper.find('[data-testid="error-contactPhone"]').text()).toContain('手机号不能为空')
    expect(wrapper.find('[data-testid="error-region"]').text()).toContain('所在地区不能为空')
    expect(wrapper.find('[data-testid="error-detail"]').text()).toContain('详细地址不能为空')
    // 校验不过不发请求：停留表单页
    expect(router.currentRoute.value.name).toBe('address-new')
  })

  it('T37 新增合法提交 → 成功返回列表且新地址可见', async () => {
    const { wrapper, router } = await mountEdit('/addresses/new')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="save-address-btn"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    await wrapper.find('[data-testid="input-contactName"]').setValue('李同学')
    await wrapper.find('[data-testid="input-contactPhone"]').setValue('13900000000')
    await wrapper.find('[data-testid="input-region"]').setValue('天津大学北洋园校区')
    await wrapper.find('[data-testid="input-detail"]').setValue('11号楼 502室')
    await wrapper.find('[data-testid="save-address-btn"]').trigger('click')
    // 成功返回地址列表（PRD：成功返回地址列表）
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('address-list'), {
      timeout: 2000,
    })
    // 新地址出现在地址数据中
    expect(addressMockState.some((item) => item.contactName === '李同学')).toBe(true)
  })

  it('T38 编辑模式回显数据，修改保存成功（TC-ADR-005）', async () => {
    const { wrapper, router } = await mountEdit('/addresses/da001/edit')
    await vi.waitFor(
      () =>
        expect(
          (wrapper.find('[data-testid="input-contactName"]').element as HTMLInputElement).value,
        ).toBe('张同学'),
      { timeout: 2000 },
    )
    expect(
      (wrapper.find('[data-testid="input-detail"]').element as HTMLInputElement).value,
    ).toContain('12号楼 304室')
    await wrapper.find('[data-testid="input-detail"]').setValue('13号楼 101室')
    await wrapper.find('[data-testid="save-address-btn"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('address-list'), {
      timeout: 2000,
    })
    expect(
      addressMockState.find((item) => item.addressId === 'da001')!.detail,
    ).toBe('13号楼 101室')
  })

  it('T39 编辑地址不存在 → 提示并返回列表', async () => {
    const { wrapper, router } = await mountEdit('/addresses/da999/edit')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="address-missing-tip"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="address-missing-tip"]').text()).toContain('地址不存在')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('address-list'), {
      timeout: 2000,
    })
  })
})
