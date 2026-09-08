import { beforeEach, describe, expect, it } from 'vitest'
import { mockDispatch } from '../index'
import { ADDRESS_SEED, addressMockState } from '../address'

/**
 * 地址增改删 mock 行为测试 M5–M8（2026-09-07 第二批，口径来自 TDD 规划矩阵，AI 辅助脚手架）
 * M5 POST /me/addresses 新增成功（TC-ADR-001）
 * M6 PATCH 设为默认后其他地址取消默认（TC-ADR-003）
 * M7 DELETE 默认地址 → 剩余最近更新一条自动设默认；删光后默认为空（TC-ADR-004）
 * M8 单查/PATCH/DELETE 不存在地址 → 统一 404（TC-ADR-007，防跨用户探测）
 * 口径：契约 §3.3（GET 单条用于编辑回显；PATCH 修改地址或默认状态）
 */
describe('地址增改删 mock（契约 §3.3 后端替身行为）', () => {
  beforeEach(() => {
    addressMockState.splice(0, addressMockState.length, ...ADDRESS_SEED.map((item) => ({ ...item })))
  })

  const NEW_ADDRESS = {
    contactName: '李同学',
    contactSex: '女' as const,
    contactPhone: '13900000000',
    region: '天津大学北洋园校区',
    detail: '11号楼 502室',
    label: '家',
    isDefault: false,
  }

  it('M5 新增地址成功：返回新地址且列表数量 +1（TC-ADR-001）', async () => {
    const res = await mockDispatch({ method: 'POST', url: '/me/addresses', data: NEW_ADDRESS })
    expect(res.status).toBe(200)
    const created = res.payload.data as Record<string, unknown>
    expect(String(created.addressId)).toBeTruthy()

    const list = await mockDispatch({ method: 'GET', url: '/me/addresses' })
    const addresses = list.payload.data as Array<Record<string, unknown>>
    expect(addresses).toHaveLength(2)
    expect(addresses.some((item) => item.contactName === '李同学')).toBe(true)
  })

  it('M6 设为默认后其他地址取消默认，仅一条默认（TC-ADR-003）', async () => {
    // 先新增第二地址，再把它设为默认
    const add = await mockDispatch({ method: 'POST', url: '/me/addresses', data: NEW_ADDRESS })
    const added = add.payload.data as Record<string, unknown>
    const patch = await mockDispatch({
      method: 'PATCH',
      url: `/me/addresses/${String(added.addressId)}`,
      data: { isDefault: true },
    })
    expect(patch.status).toBe(200)

    const list = await mockDispatch({ method: 'GET', url: '/me/addresses' })
    const addresses = list.payload.data as Array<Record<string, unknown>>
    const defaults = addresses.filter((item) => item.isDefault === true)
    expect(defaults).toHaveLength(1)
    expect(defaults[0]!.contactName).toBe('李同学')
  })

  it('M7 删除默认地址 → 最近更新的剩余地址自动设默认；删光后默认为空（TC-ADR-004）', async () => {
    // 新增的 da002 即"最近更新"的一条；删除原默认 da001 后应由 da002 接替
    const add = await mockDispatch({ method: 'POST', url: '/me/addresses', data: NEW_ADDRESS })
    const added = add.payload.data as Record<string, unknown>
    const del = await mockDispatch({ method: 'DELETE', url: '/me/addresses/da001' })
    expect(del.status).toBe(200)

    const list = await mockDispatch({ method: 'GET', url: '/me/addresses' })
    const addresses = list.payload.data as Array<Record<string, unknown>>
    expect(addresses).toHaveLength(1)
    expect(addresses[0]!.addressId).toBe(String(added.addressId))
    expect(addresses[0]!.isDefault).toBe(true)

    // 删光：无剩余地址时默认为空
    await mockDispatch({ method: 'DELETE', url: `/me/addresses/${String(added.addressId)}` })
    const empty = await mockDispatch({ method: 'GET', url: '/me/addresses' })
    expect(empty.payload.data).toEqual([])
  })

  it('M8 单查/PATCH/DELETE 不存在地址 → 404 且提示地址不存在（TC-ADR-007）', async () => {
    const get = await mockDispatch({ method: 'GET', url: '/me/addresses/da999' })
    expect(get.status).toBe(404)
    expect(get.payload.message).toContain('地址不存在')

    const patch = await mockDispatch({
      method: 'PATCH',
      url: '/me/addresses/da999',
      data: { isDefault: true },
    })
    expect(patch.status).toBe(404)

    const del = await mockDispatch({ method: 'DELETE', url: '/me/addresses/da999' })
    expect(del.status).toBe(404)
  })
})
