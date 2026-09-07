/**
 * 地址域 mock（契约 §3.3 后端替身：查询只返回当前用户地址，空则 []）
 * 种子对齐契约 §2 固定演示数据：默认地址 = 天津大学北洋园校区，12号楼 304室
 * 地址列表为模块级内存态并导出（与 cart mock 同风格），供测试隔离重灌与联调演示
 * 行为对齐 TC-ADR-001/003/004/007：
 * - POST 新增；PATCH 修改地址或默认状态（设默认后其他地址取消默认）
 * - DELETE 默认地址后把剩余地址中最近更新的一条设为默认，无剩余时默认为空
 * - 单查/PATCH/DELETE 不存在地址统一 404（防跨用户探测）
 */
import type { Address } from '@/services/api/types'
import type { MockHandler } from './index'
import { fail, ok } from './index'

/** 种子数据（测试 beforeEach 重灌用）：与 addressMockState 初始态保持同一份 */
export const ADDRESS_SEED: Address[] = [
  {
    addressId: 'da001',
    contactName: '张同学',
    contactSex: '男',
    contactPhone: '13800000001',
    region: '天津大学北洋园校区',
    detail: '12号楼 304室',
    label: '学校',
    isDefault: true,
  },
]

export const addressMockState: Address[] = ADDRESS_SEED.map((item) => ({ ...item }))

/** 最近更新序号（TC-ADR-004：删除默认后由"最近更新的一条"接替默认） */
const touchSeq = new Map<string, number>()
let seq = 0
function touch(addressId: string): void {
  touchSeq.set(addressId, ++seq)
}

let addressIdSeq = ADDRESS_SEED.length + 1

/** 新增/修改共用的字段级校验（对齐后端兜底规则的最小集） */
function validateAddressBody(data: Record<string, unknown>): string | null {
  const { contactName, contactPhone, region, detail } = data as Record<string, string>
  if (!contactName || !contactPhone || !region || !detail) {
    return '联系人、电话与地址不能为空'
  }
  return null
}

export const addressMocks: Record<string, MockHandler> = {
  'GET /me/addresses': () => {
    // 默认地址置顶（PRD 7.9），其余保持新增顺序；响应必须返回拷贝
    const sorted = [...addressMockState].sort(
      (a, b) => Number(b.isDefault) - Number(a.isDefault),
    )
    return ok<Address[]>(sorted.map((item) => ({ ...item })))
  },

  'POST /me/addresses': ({ data }) => {
    const body = (data ?? {}) as Record<string, unknown>
    const invalid = validateAddressBody(body)
    if (invalid) return fail(400, 40000, invalid)
    const address: Address = {
      addressId: `da${String(addressIdSeq++).padStart(3, '0')}`,
      contactName: String(body.contactName),
      contactSex: body.contactSex === '女' ? '女' : '男',
      contactPhone: String(body.contactPhone),
      region: String(body.region),
      detail: String(body.detail),
      label: body.label ? String(body.label) : undefined,
      isDefault: body.isDefault === true,
    }
    if (address.isDefault) {
      addressMockState.forEach((item) => (item.isDefault = false))
    }
    addressMockState.push(address)
    touch(address.addressId)
    return ok<Address>({ ...address })
  },

  'GET /me/addresses/:addressId': ({ params }) => {
    const address = addressMockState.find((item) => item.addressId === params?.addressId)
    if (!address) return fail(404, 40400, '地址不存在')
    return ok<Address>({ ...address })
  },

  'PATCH /me/addresses/:addressId': ({ params, data }) => {
    const address = addressMockState.find((item) => item.addressId === params?.addressId)
    if (!address) return fail(404, 40400, '地址不存在')
    const body = (data ?? {}) as Record<string, unknown>
    if (body.contactName !== undefined || body.contactPhone !== undefined) {
      // 携带联系信息的整表保存：走字段校验
      const merged = { ...address, ...body } as Record<string, unknown>
      const invalid = validateAddressBody(merged)
      if (invalid) return fail(400, 40000, invalid)
    }
    if (body.isDefault === true) {
      addressMockState.forEach((item) => (item.isDefault = false))
    }
    for (const key of ['contactName', 'contactSex', 'contactPhone', 'region', 'detail', 'label', 'isDefault'] as const) {
      if (body[key] !== undefined) {
        (address as unknown as Record<string, unknown>)[key] = body[key]
      }
    }
    touch(address.addressId)
    return ok<Address>({ ...address })
  },

  'DELETE /me/addresses/:addressId': ({ params }) => {
    const index = addressMockState.findIndex((item) => item.addressId === params?.addressId)
    if (index < 0) return fail(404, 40400, '地址不存在')
    const [removed] = addressMockState.splice(index, 1)
    // 删除默认地址：剩余中最近更新的一条自动设默认；无剩余时默认为空（TC-ADR-004）
    if (removed!.isDefault && addressMockState.length > 0) {
      const latest = [...addressMockState].sort(
        (a, b) => (touchSeq.get(b.addressId) ?? 0) - (touchSeq.get(a.addressId) ?? 0),
      )[0]!
      latest.isDefault = true
      touch(latest.addressId)
    }
    return ok(null)
  },
}
