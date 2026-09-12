import { beforeEach, describe, expect, it } from 'vitest'
import { mockDispatch } from '../index'
import { COUPON_SEED, couponMockState, formatDateTime } from '../coupon'

/**
 * 红包域 mock（契约 §3.8 + §3.10 后端替身行为，CHG-001）
 * CPM-1 列表 status 过滤按有效期窗口计算（契约 §3.8：status 只表达有效期窗口，used 独立回显）
 * CPM-2 买 pack49：生成 4 张（3×满30减5 + 1×无门槛减5，面额 ¥20），有效期 7 天（TC-RBP-001、§10.5 第 5/7 条）
 * CPM-3 买 pack99：生成 8 张（6×满30减5 + 1×满40减10 + 1×无门槛减5，面额 ¥45）（TC-RBP-002）
 * CPM-4 非法 packKey → 400；购买不产生支付记录（响应不含支付字段）（§10.5 第 6 条）
 */
describe('红包域 mock（契约 §3.8/§3.10 后端替身行为）', () => {
  beforeEach(() => {
    couponMockState.splice(0, couponMockState.length, ...COUPON_SEED.map((item) => ({ ...item })))
  })

  it('CPM-1 列表按有效期窗口计算 status 并支持过滤（§3.8）', async () => {
    couponMockState.push({
      ...COUPON_SEED[0]!,
      couponId: 'cp-old',
      name: '已过期红包',
      validTo: '2026-09-01 23:59:59',
    })
    const all = await mockDispatch({ method: 'GET', url: '/me/coupons' })
    expect(all.status).toBe(200)
    expect((all.payload.data as unknown[]).length).toBe(3)
    const available = await mockDispatch({ method: 'GET', url: '/me/coupons', params: { status: 'available' } })
    const availableList = available.payload.data as Array<Record<string, unknown>>
    expect(availableList.every((item) => item.status === 'available')).toBe(true)
    expect(availableList.some((item) => item.couponId === 'cp-old')).toBe(false)
    const expired = await mockDispatch({ method: 'GET', url: '/me/coupons', params: { status: 'expired' } })
    const expiredList = expired.payload.data as Array<Record<string, unknown>>
    expect(expiredList.map((item) => item.couponId)).toEqual(['cp-old'])
  })

  it('CPM-2 购买 pack49 生成 4 张、面额 ¥20、有效期 7 天（TC-RBP-001）', async () => {
    const res = await mockDispatch({ method: 'POST', url: '/me/coupon-packs', data: { packKey: 'pack49' } })
    expect(res.status).toBe(200)
    const data = res.payload.data as Record<string, unknown>
    expect(String(data.packId)).toBeTruthy()
    const coupons = data.coupons as Array<Record<string, unknown>>
    expect(coupons).toHaveLength(4)
    // 3×满30减5 + 1×无门槛减5 → 面额合计 5*3 + 5 = 20
    const faceValue = coupons.reduce((sum, item) => sum + Number(item.amount), 0)
    expect(faceValue).toBe(20)
    const noThreshold = coupons.filter((item) => Number(item.threshold) === 0)
    expect(noThreshold).toHaveLength(1)
    expect(coupons.filter((item) => Number(item.threshold) === 30)).toHaveLength(3)
    // 有效期 = 购买时刻 + 7 天（按天差断言，容忍毫秒误差）
    const daysDiff =
      (Date.parse(String(coupons[0]!.validTo).replace(' ', 'T')) - Date.now()) / (24 * 60 * 60 * 1000)
    expect(Math.abs(daysDiff - 7)).toBeLessThan(0.01)
    // 购买所得券可爆（source=PACK、canBlast=true）
    expect(coupons.every((item) => item.source === 'PACK' && item.canBlast === true)).toBe(true)
  })

  it('CPM-3 购买 pack99 生成 8 张、面额 ¥45（TC-RBP-002）', async () => {
    const res = await mockDispatch({ method: 'POST', url: '/me/coupon-packs', data: { packKey: 'pack99' } })
    expect(res.status).toBe(200)
    const coupons = (res.payload.data as Record<string, unknown>).coupons as Array<Record<string, unknown>>
    expect(coupons).toHaveLength(8)
    const faceValue = coupons.reduce((sum, item) => sum + Number(item.amount), 0)
    expect(faceValue).toBe(45)
    expect(coupons.filter((item) => Number(item.threshold) === 30 && Number(item.amount) === 5)).toHaveLength(6)
    expect(coupons.filter((item) => Number(item.threshold) === 40 && Number(item.amount) === 10)).toHaveLength(1)
    expect(coupons.filter((item) => Number(item.threshold) === 0 && Number(item.amount) === 5)).toHaveLength(1)
  })

  it('CPM-4 非法 packKey → 400，且响应不含支付字段（§10.5 第 6 条）', async () => {
    const bad = await mockDispatch({ method: 'POST', url: '/me/coupon-packs', data: { packKey: 'pack999' } })
    expect(bad.status).toBe(400)
    const missing = await mockDispatch({ method: 'POST', url: '/me/coupon-packs', data: {} })
    expect(missing.status).toBe(400)
    const ok = await mockDispatch({ method: 'POST', url: '/me/coupon-packs', data: { packKey: 'pack49' } })
    const data = ok.payload.data as Record<string, unknown>
    expect(Object.keys(data)).toEqual(['packId', 'packKey', 'coupons'])
    expect(JSON.stringify(data)).not.toContain('payment')
    expect(formatDateTime(new Date())).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })
})
