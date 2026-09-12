/**
 * 红包域 mock（契约 §3.8 + §3.10 后端替身，CHG-001）
 *
 * 骨架占位：种子与内存态先于失败测试入库（提交顺序 chore: 骨架 → test: 红 → feat: 实现），
 * 使红端为断言级而非文件级加载失败。
 *
 * 种子镜像后端 `backend/database/seed/seed.sql`（cp001 全场券、cp002 指定商家券），
 * 有效期按「相对当前时刻」生成，使页面的「今天 23:59 到期／还剩 N 天」文案可复现。
 */
import type { CouponPackKey, CouponRecord } from '@/services/api/types'
import type { MockHandler } from './index'
import { fail, ok } from './index'

/** 东八区 `yyyy-MM-dd HH:mm:ss`（契约 §3.8 时间格式） */
export function formatDateTime(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function daysFromNow(days: number): string {
  return formatDateTime(new Date(Date.now() + days * 24 * 60 * 60 * 1000))
}

/** 种子（测试 beforeEach 重灌用）：与后端 seed.sql 的 cp001/cp002 同口径 */
export const COUPON_SEED: CouponRecord[] = [
  {
    couponId: 'cp001',
    name: '满20减2红包',
    amount: 2,
    threshold: 20,
    scope: 'ALL',
    storeId: null,
    validFrom: daysFromNow(-1),
    validTo: daysFromNow(30),
    status: 'available',
    used: false,
    source: 'SEED',
    canBlast: false,
  },
  {
    couponId: 'cp002',
    name: '肯德基满40减5红包',
    amount: 5,
    threshold: 40,
    scope: 'STORE',
    storeId: 'm002',
    validFrom: daysFromNow(-1),
    validTo: daysFromNow(30),
    status: 'available',
    used: false,
    source: 'SEED',
    canBlast: false,
  },
]

export const couponMockState: CouponRecord[] = COUPON_SEED.map((item) => ({ ...item }))

/** 有效期窗口判定（镜像后端 `ViewMapper.coupon`：status 只表达有效期窗口，used 独立回显） */
function inWindow(coupon: CouponRecord, now: string): boolean {
  return coupon.validFrom <= now && coupon.validTo >= now
}

/** 列表视图：按窗口重算 status（不落库、不改 used），并在 status 过滤时返回子集 */
function viewOf(coupon: CouponRecord, now: string): CouponRecord {
  return { ...coupon, status: inWindow(coupon, now) ? 'available' : 'expired' }
}

let packSeq = 1
let packCouponSeq = 1

/** 套餐内容（契约 §10.5 第 7 条 / PRD 买红包浮窗行）：面额 pack49=¥20、pack99=¥45 */
const PACK_CONTENTS: Record<string, Array<{ threshold: number; amount: number }>> = {
  pack49: [
    { threshold: 30, amount: 5 },
    { threshold: 30, amount: 5 },
    { threshold: 30, amount: 5 },
    { threshold: 0, amount: 5 },
  ],
  pack99: [
    { threshold: 30, amount: 5 },
    { threshold: 30, amount: 5 },
    { threshold: 30, amount: 5 },
    { threshold: 30, amount: 5 },
    { threshold: 30, amount: 5 },
    { threshold: 30, amount: 5 },
    { threshold: 40, amount: 10 },
    { threshold: 0, amount: 5 },
  ],
}

export const couponMocks: Record<string, MockHandler> = {
  'GET /me/coupons': ({ params }) => {
    const now = formatDateTime(new Date())
    const status = typeof params?.status === 'string' ? params.status : ''
    let list = couponMockState.map((item) => viewOf(item, now))
    if (status === 'available' || status === 'expired') {
      list = list.filter((item) => item.status === status)
    }
    // 列表按到期时间升序（先到期的在前，与红包页「今天到期」在前的阅读顺序一致）
    list.sort((a, b) => a.validTo.localeCompare(b.validTo))
    return ok(list)
  },

  'POST /me/coupon-packs': ({ data }) => {
    const packKey = String((data as { packKey?: unknown } | undefined)?.packKey ?? '').trim()
    const contents = PACK_CONTENTS[packKey]
    if (!contents) return fail(400, 40000, '套餐不存在')
    const packId = `pk${String(packSeq++).padStart(3, '0')}`
    // 购买所得券：有效期 = 购买时刻 + 7 天；scope 一律 ALL；source=PACK、canBlast=true（可再爆）
    const validFrom = formatDateTime(new Date())
    const validTo = daysFromNow(7)
    const coupons: CouponRecord[] = contents.map((item) => ({
      couponId: `cpk${String(packCouponSeq++).padStart(4, '0')}`,
      name: item.threshold > 0 ? `满${item.threshold}减${item.amount}红包` : `无门槛减${item.amount}红包`,
      amount: item.amount,
      threshold: item.threshold,
      scope: 'ALL',
      storeId: null,
      validFrom,
      validTo,
      status: 'available',
      used: false,
      source: 'PACK',
      canBlast: true,
    }))
    couponMockState.push(...coupons.map((item) => ({ ...item })))
    // 前端模拟付费：不产生支付记录、响应不含任何支付字段（契约 §10.5 第 6 条）
    return ok({ packId, packKey: packKey as CouponPackKey, coupons })
  },
}
