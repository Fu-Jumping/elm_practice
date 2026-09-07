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

/** 修改数量（契约 §3.4：quantity 必须大于 0；减到 0 由前端改发 deleteCartItem） */
export function patchCartItem(cartLineId: string, quantity: number): Promise<CartLine> {
  return request<CartLine>({
    method: 'PATCH',
    url: endpoints.cart.byId(cartLineId),
    data: { quantity },
  })
}

export function deleteCartItem(cartLineId: string): Promise<null> {
  return request<null>({ method: 'DELETE', url: endpoints.cart.byId(cartLineId) })
}
