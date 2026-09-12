/**
 * 红包域 mock（契约 §3.8 + §3.10 后端替身，CHG-001）
 *
 * 骨架占位：种子与内存态先于失败测试入库（提交顺序 chore: 骨架 → test: 红 → feat: 实现），
 * 使红端为断言级而非文件级加载失败。
 *
 * 种子镜像后端 `backend/database/seed/seed.sql`（cp001 全场券、cp002 指定商家券），
 * 有效期按「相对当前时刻」生成，使页面的「今天 23:59 到期／还剩 N 天」文案可复现。
 */
import type { CouponRecord } from '@/services/api/types'
import type { MockHandler } from './index'

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

export const couponMocks: Record<string, MockHandler> = {}
