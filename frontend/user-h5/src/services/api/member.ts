/**
 * 会员域接口（契约 §3.8，批次⑥ TODO-USER-006）
 * **本期只读**：会员标识由种子数据或后台标记，契约不提供开通与续费接口，
 * 因此本模块只有查询一个方法（页面不得出现开通/续费调用）。
 */
import { request } from '@/services/http'
import type { MemberInfo } from './types'
import { endpoints } from './endpoints'

/** 当前用户会员标识与权益说明 */
export function getMember(): Promise<MemberInfo> {
  return request<MemberInfo>({ method: 'GET', url: endpoints.member.me })
}
