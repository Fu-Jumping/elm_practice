/**
 * 地址域接口（契约 §3.3：查询当前用户地址；新增/编辑/删除待地址管理页任务接入）
 */
import { request } from '@/services/http'
import type { Address } from './types'
import { endpoints } from './endpoints'

export function getAddresses(): Promise<Address[]> {
  return request<Address[]>({ method: 'GET', url: endpoints.address.list })
}
