/**
 * 红包域接口（契约 §3.8 + CHG-001 §3.10，批次⑥/CHG-001 前端）
 * 列表（available/expired）/ 当前订单可用红包 / 买套餐 / 爆一次
 * 口径：金额与门槛一律按后端返回展示，前端不自行计算；一单一红包在确认订单页选用 `couponId`。
 */
import { request } from '@/services/http'
import type { CouponBlastResult, CouponPackKey, CouponPackPurchase, CouponRecord } from './types'
import { endpoints } from './endpoints'

/** 当前用户红包列表（`status` 只表达有效期窗口；不传则返回全部） */
export function listCoupons(status?: 'available' | 'expired'): Promise<CouponRecord[]> {
  return request<CouponRecord[]>({
    method: 'GET',
    url: endpoints.coupon.list,
    params: status ? { status } : undefined,
  })
}

/** 当前订单可用红包（门槛 ≤ amount 且适用范围匹配、未使用、在有效期内） */
export function listAvailableCoupons(params: {
  storeId: string
  amount: number
}): Promise<CouponRecord[]> {
  return request<CouponRecord[]>({
    method: 'GET',
    url: endpoints.coupon.available,
    params: { storeId: params.storeId, amount: params.amount },
  })
}

/** 购买红包套餐（前端模拟付费：不产生支付记录、不新增支付表；有效期 7 天） */
export function buyPack(packKey: CouponPackKey): Promise<CouponPackPurchase> {
  return request<CouponPackPurchase>({
    method: 'POST',
    url: endpoints.coupon.packs,
    data: { packKey },
  })
}

/**
 * 爆一次（CHG-001 §3.10）：不传 `couponId` 用当日免费次数（不消耗券）；
 * 传则消耗并**替换**该券（阈值与金额同时可能变化，不新增行）
 */
export function blastCoupon(couponId?: string): Promise<CouponBlastResult> {
  return request<CouponBlastResult>({
    method: 'POST',
    url: endpoints.coupon.blast,
    data: couponId ? { couponId } : {},
  })
}
