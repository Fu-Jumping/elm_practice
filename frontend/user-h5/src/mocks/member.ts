/**
 * 会员域 mock（契约 §3.8 后端替身，批次⑥ TODO-USER-006）
 * **只提供只读查询**：会员标识由种子数据或后台标记，契约不提供开通与续费接口，
 * 故本域没有写接口——页面出现开通/续费调用即为越界（TC-MBR-005 的实质口径）。
 * `discountRate` 为演示值 0.95；契约未定义会员有效期字段，故不返回「有效期」数据。
 */
import type { MemberInfo } from '@/services/api/types'
import type { MockHandler } from './index'
import { ok } from './index'

export const MEMBER_SEED: MemberInfo = {
  memberOpened: true,
  discountRate: 0.95,
  discountDesc: '会员商品 95 折',
  activatedAt: '2026-09-01 10:00:00',
}

export const memberMocks: Record<string, MockHandler> = {
  'GET /me/member': () => ok({ ...MEMBER_SEED }),
}
