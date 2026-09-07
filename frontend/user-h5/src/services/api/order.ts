/**
 * 订单域接口（契约 §3.5：创建/列表/详情；明细含在详情，P0）
 */
import { request } from '@/services/http'
import type { CreateOrderPayload, OrderCreated, OrderDetail, OrderSummary } from './types'
import { endpoints } from './endpoints'

export function createOrder(body: CreateOrderPayload): Promise<OrderCreated> {
  return request<OrderCreated>({ method: 'POST', url: endpoints.order.create, data: body })
}

/** 订单列表：按创建时间倒序；status 可选筛选（P0 仅 PROCESSING 有值） */
export function listOrders(status?: string): Promise<OrderSummary[]> {
  return request<OrderSummary[]>({
    method: 'GET',
    url: endpoints.order.list,
    params: status ? { status } : undefined,
  })
}

export function getOrder(orderId: string): Promise<OrderDetail> {
  return request<OrderDetail>({ method: 'GET', url: endpoints.order.detail(orderId) })
}
