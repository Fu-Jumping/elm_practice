import { beforeEach, describe, expect, it } from 'vitest'
import { mockDispatch } from '../index'
import { clearMockCart } from '../cart'
import { BLAST_TIERS, COUPON_SEED, blastRandomState, couponMockState, formatDateTime, freeBlastState } from '../coupon'

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

/**
 * 爆红包替身（契约 §3.10 + §10.5 第 2~5 条）
 * RBM-1 档位池与权重：固定种子命中确定档位，权重合计 100（§10.5 第 2 条）
 * RBM-2 免费爆：新增一张（source=BLAST_OUT、canBlast=false、当天 23:59:59 到期），当日再爆 409（TC-RBP-003/004）
 * RBM-3 消耗券爆：替换式（同 couponId、门槛与金额同时更新、不新增行、canBlast 置终态）（TC-RBP-005）
 * RBM-4 爆出来的券再爆 409；未知 couponId 404；无免费次数且无可爆券 409（TC-RBP-006/009）
 */
describe('爆红包替身（契约 §3.10）', () => {
  beforeEach(() => {
    couponMockState.splice(0, couponMockState.length, ...COUPON_SEED.map((item) => ({ ...item })))
    freeBlastState.date = ''
    blastRandomState.fn = Math.random
  })

  it('RBM-1 档位池 10 档且权重合计 100；固定种子命中确定档位（§10.5 第 2 条、TC-RBP-007）', async () => {
    expect(BLAST_TIERS).toHaveLength(10)
    expect(BLAST_TIERS.reduce((sum, tier) => sum + tier.weight, 0)).toBe(100)
    blastRandomState.fn = () => 0 // 命中第 1 档（满30减5）
    const first = await mockDispatch({ method: 'POST', url: '/me/coupons/blast', data: {} })
    const firstData = first.payload.data as Record<string, unknown>
    expect(firstData.tierIndex).toBe(1)
    expect((firstData.coupon as Record<string, unknown>).amount).toBe(5)
    expect((firstData.coupon as Record<string, unknown>).threshold).toBe(30)
    expect(firstData.free).toBe(true)
    blastRandomState.fn = () => 0.999 // 命中第 10 档（满40减18.8）
    freeBlastState.date = '' // 再给一次免费机会用于断言末档
    const last = await mockDispatch({ method: 'POST', url: '/me/coupons/blast', data: {} })
    const lastData = last.payload.data as Record<string, unknown>
    expect(lastData.tierIndex).toBe(10)
    expect((lastData.coupon as Record<string, unknown>).amount).toBe(18.8)
  })

  it('RBM-2 免费爆新增一张且不消耗已购券；当日再爆 409（TC-RBP-003/004）', async () => {
    const before = couponMockState.length
    const res = await mockDispatch({ method: 'POST', url: '/me/coupons/blast', data: {} })
    expect(res.status).toBe(200)
    expect(couponMockState.length).toBe(before + 1)
    const blasted = couponMockState.find((item) => item.source === 'BLAST_OUT')!
    expect(blasted.canBlast).toBe(false)
    expect(blasted.validTo.endsWith('23:59:59')).toBe(true)
    // 已购券（SEED）未被消耗
    expect(couponMockState.filter((item) => item.source === 'SEED' && item.used).length).toBe(0)
    // 同日再爆 → 409
    const again = await mockDispatch({ method: 'POST', url: '/me/coupons/blast', data: {} })
    expect(again.status).toBe(409)
  })

  it('RBM-3 消耗券爆为替换式：同一行更新门槛/金额并置终态，不新增行（TC-RBP-005）', async () => {
    const pack = await mockDispatch({ method: 'POST', url: '/me/coupon-packs', data: { packKey: 'pack49' } })
    const target = (pack.payload.data as { coupons: Array<Record<string, unknown>> }).coupons[0]!
    const countBefore = couponMockState.length
    blastRandomState.fn = () => 0.999
    const res = await mockDispatch({
      method: 'POST',
      url: '/me/coupons/blast',
      data: { couponId: String(target.couponId) },
    })
    expect(res.status).toBe(200)
    expect(couponMockState.length).toBe(countBefore) // 替换式不新增行
    const updated = couponMockState.find((item) => item.couponId === target.couponId)!
    expect(updated.threshold).toBe(40)
    expect(updated.amount).toBe(18.8)
    expect(updated.canBlast).toBe(false)
    expect(updated.source).toBe('BLAST_OUT')
  })

  it('RBM-4 爆出的券再爆 409；未知 couponId 404；无免费次数且无可爆券 409（TC-RBP-006/009）', async () => {
    const free = await mockDispatch({ method: 'POST', url: '/me/coupons/blast', data: {} })
    const blastedId = String((free.payload.data as { coupon: { couponId: string } }).coupon.couponId)
    // 爆出来的券 canBlast=false → 再爆 409
    const reBlast = await mockDispatch({ method: 'POST', url: '/me/coupons/blast', data: { couponId: blastedId } })
    expect(reBlast.status).toBe(409)
    // 未知券 → 404
    const unknown = await mockDispatch({ method: 'POST', url: '/me/coupons/blast', data: { couponId: 'cp-none' } })
    expect(unknown.status).toBe(404)
    // 无免费次数（已用）且无可爆券 → 409
    const exhausted = await mockDispatch({ method: 'POST', url: '/me/coupons/blast', data: {} })
    expect(exhausted.status).toBe(409)
  })
})

/**
 * 可用券查询与下单选用（契约 §3.8、TC-CPN-002/003/004）
 * CPM-5 可用券过滤：门槛基数=商品小计、适用范围（ALL/STORE 匹配店铺）、已用与过期不返回
 * CPM-6 下单选用：券金额入快照并核销；门槛不足 400、他人/不存在券 404、已用或过期 409、一次两个红包 400
 */
describe('可用红包查询与下单选用（契约 §3.8）', () => {
  beforeEach(() => {
    couponMockState.splice(0, couponMockState.length, ...COUPON_SEED.map((item) => ({ ...item })))
    freeBlastState.date = ''
    clearMockCart('m002')
  })

  it('CPM-5 可用券按门槛（商品小计）与适用范围过滤，已用/过期不返回（TC-CPN-003）', async () => {
    // 小计 39（< cp002 门槛 40）→ 只返回 cp001
    const small = await mockDispatch({
      method: 'GET',
      url: '/me/coupons/available',
      params: { storeId: 'm002', amount: 39 },
    })
    const smallList = small.payload.data as Array<Record<string, unknown>>
    expect(smallList.map((item) => item.couponId)).toEqual(['cp001'])
    // 小计 45 → 两张都可用（面额大者在前）
    const big = await mockDispatch({
      method: 'GET',
      url: '/me/coupons/available',
      params: { storeId: 'm002', amount: 45 },
    })
    expect((big.payload.data as unknown[]).map((item) => (item as Record<string, unknown>).couponId)).toEqual([
      'cp002',
      'cp001',
    ])
    // 换店（m003）→ 指定商家券不适用
    const otherStore = await mockDispatch({
      method: 'GET',
      url: '/me/coupons/available',
      params: { storeId: 'm003', amount: 45 },
    })
    expect((otherStore.payload.data as Array<Record<string, unknown>>).map((item) => item.couponId)).toEqual([
      'cp001',
    ])
    // 已用 / 过期不返回
    couponMockState.find((item) => item.couponId === 'cp001')!.used = true
    couponMockState.push({ ...COUPON_SEED[0]!, couponId: 'cp-old', validTo: '2026-09-01 23:59:59' })
    const filtered = await mockDispatch({
      method: 'GET',
      url: '/me/coupons/available',
      params: { storeId: 'm003', amount: 99 },
    })
    expect(filtered.payload.data).toEqual([])
  })

  it('CPM-6 下单选用红包：金额入快照并核销；异常分支按契约拒绝（TC-CPN-002/003/004）', async () => {
    const add = await mockDispatch({
      method: 'POST',
      url: '/cart/items',
      data: { storeId: 'm002', productId: 'p101', quantity: 2 },
    })
    expect(add.status).toBe(200)
    const ok = await mockDispatch({
      method: 'POST',
      url: '/orders',
      data: { storeId: 'm002', addressId: 'da001', couponId: 'cp001' },
    })
    expect(ok.status).toBe(200)
    const order = ok.payload.data as Record<string, unknown>
    // 39 − 满减 2 − 红包 2 + 配送费 5 − 配送费优惠 5 + 打包费 2 = 37.00
    expect(order.couponAmount).toBe(2)
    expect(order.total).toBe(37)
    expect(couponMockState.find((item) => item.couponId === 'cp001')!.used).toBe(true)
    // 已用券再次选用 → 409
    await mockDispatch({ method: 'POST', url: '/cart/items', data: { storeId: 'm002', productId: 'p101', quantity: 2 } })
    const reused = await mockDispatch({
      method: 'POST',
      url: '/orders',
      data: { storeId: 'm002', addressId: 'da001', couponId: 'cp001' },
    })
    expect(reused.status).toBe(409)
    // 一次两个红包 → 400（TC-CPN-004）
    const two = await mockDispatch({
      method: 'POST',
      url: '/orders',
      data: { storeId: 'm002', addressId: 'da001', couponId: ['cp002', 'cp001'] },
    })
    expect(two.status).toBe(400)
    // 门槛不足（cp002 需满 40，小计 39）→ 400（TC-CPN-003）
    const belowThreshold = await mockDispatch({
      method: 'POST',
      url: '/orders',
      data: { storeId: 'm002', addressId: 'da001', couponId: 'cp002' },
    })
    expect(belowThreshold.status).toBe(400)
    // 不存在/他人券 → 404（TC-CPN-006）
    const unknown = await mockDispatch({
      method: 'POST',
      url: '/orders',
      data: { storeId: 'm002', addressId: 'da001', couponId: 'cp-none' },
    })
    expect(unknown.status).toBe(404)
    // 指定商家券跨店使用 → 400（cp002 限 m002，此处下单 m003）
    await mockDispatch({ method: 'POST', url: '/cart/items', data: { storeId: 'm003', productId: 'p204', quantity: 2 } })
    const wrongStore = await mockDispatch({
      method: 'POST',
      url: '/orders',
      data: { storeId: 'm003', addressId: 'da001', couponId: 'cp002' },
    })
    expect(wrongStore.status).toBe(400)
  })
})
