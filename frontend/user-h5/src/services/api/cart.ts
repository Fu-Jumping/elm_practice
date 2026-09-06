/**
 * 购物车域接口（契约 §3.4：指定店铺查询/加购；数量步进与删除属购物车弹层任务）
 */
import { request } from '@/services/http'
import type { CartLine } from './types'
import { endpoints } from './endpoints'

export function getCart(storeId: string): Promise<CartLine[]> {
  return request<CartLine[]>({ method: 'GET', url: endpoints.cart.list, params: { storeId } })
}

export function addCartItem(body: {
  storeId: string
  productId: string
  quantity: number
}): Promise<CartLine> {
  return request<CartLine>({ method: 'POST', url: endpoints.cart.add, data: body })
}
