import { describe, expect, it } from 'vitest'
import {
  ADDRESS_PLACEHOLDER,
  DEMO_LOCATION,
  LOCATION_LOAD_FAILED,
  resolveLocationState,
} from '@/utils/location'

/**
 * 定位文案三态解析测试（PRD 7.16.1 首页-定位与频道栏 / 搜索结果页-搜索头部 /
 * 分类商家列表页-顶部栏；2026-09-15 负责人口径变更·方案 C）
 * LC-1 未登录 → 课程演示地址并标记为演示数据
 * LC-2 已登录 + 有默认地址 → 取默认地址 region，不标记演示
 * LC-3 已登录 + 无任何地址 → 占位「选择收货地址」，不得用演示地址冒充真实地址
 * LC-4 已登录 + 只有 detail（region 缺失）→ 用 detail
 * LC-5 已登录 + 无 isDefault 标记 → 取列表第一条
 * LC-6 已登录 + 地址字段全空 → 占位，不渲染空文案
 * LC-7 读取失败 → 保留默认演示地址并标记为演示数据
 */
describe('resolveLocationState（定位文案三态）', () => {
  it('LC-1 未登录 → 演示地址 + 演示标记', () => {
    expect(resolveLocationState({ isLoggedIn: false })).toEqual({
      text: DEMO_LOCATION,
      isDemoLocation: true,
    })
  })

  it('LC-2 已登录 + 有默认地址 → region，且不是演示数据', () => {
    expect(
      resolveLocationState({
        isLoggedIn: true,
        addresses: [{ region: '自定义园区测试', detail: '12号楼 304室', isDefault: true }],
      }),
    ).toEqual({ text: '自定义园区测试', isDemoLocation: false })
  })

  it('LC-3 已登录 + 无地址 → 占位「选择收货地址」且不标记演示', () => {
    expect(resolveLocationState({ isLoggedIn: true, addresses: [] })).toEqual({
      text: ADDRESS_PLACEHOLDER,
      isDemoLocation: false,
    })
    expect(resolveLocationState({ isLoggedIn: true })).toEqual({
      text: ADDRESS_PLACEHOLDER,
      isDemoLocation: false,
    })
  })

  it('LC-4 已登录 + 只有 detail（region 缺失）→ 用 detail', () => {
    expect(
      resolveLocationState({ isLoggedIn: true, addresses: [{ detail: '6号楼 302室' }] }),
    ).toEqual({ text: '6号楼 302室', isDemoLocation: false })
  })

  it('LC-5 已登录 + 无 isDefault 标记 → 取列表第一条', () => {
    expect(
      resolveLocationState({
        isLoggedIn: true,
        addresses: [{ region: '第一条地址' }, { region: '第二条地址' }],
      }),
    ).toEqual({ text: '第一条地址', isDemoLocation: false })
  })

  it('LC-6 已登录 + 地址字段全空 → 占位，不渲染空文案', () => {
    expect(
      resolveLocationState({ isLoggedIn: true, addresses: [{ region: '', detail: '' }] }),
    ).toEqual({ text: ADDRESS_PLACEHOLDER, isDemoLocation: false })
  })

  it('LC-7 读取失败 → 保留默认演示地址并标记为演示数据', () => {
    expect(LOCATION_LOAD_FAILED).toEqual({ text: DEMO_LOCATION, isDemoLocation: true })
  })
})
