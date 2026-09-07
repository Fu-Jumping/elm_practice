/**
 * 地址域接口（契约 §3.3：当前用户地址的增改删查）
 */
import { request } from '@/services/http'
import type { Address } from './types'
import { endpoints } from './endpoints'

export function getAddresses(): Promise<Address[]> {
  return request<Address[]>({ method: 'GET', url: endpoints.address.list })
}

export function addAddress(body: Omit<Address, 'addressId'>): Promise<Address> {
  return request<Address>({ method: 'POST', url: endpoints.address.add, data: body })
}

export function getAddress(addressId: string): Promise<Address> {
  return request<Address>({ method: 'GET', url: endpoints.address.byId(addressId) })
}

export function updateAddress(
  addressId: string,
  body: Partial<Omit<Address, 'addressId'>>,
): Promise<Address> {
  return request<Address>({ method: 'PATCH', url: endpoints.address.byId(addressId), data: body })
}

export function removeAddress(addressId: string): Promise<null> {
  return request<null>({ method: 'DELETE', url: endpoints.address.byId(addressId) })
}
