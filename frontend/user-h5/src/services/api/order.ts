/**
 * 订单域接口（契约 §3.5：从当前用户购物车创建订单；列表/详情待订单页任务接入）
 */
import { request } from '@/services/http'
import type { CreateOrderPayload, OrderCreated } from './types'
import { endpoints } from './endpoints'

export function createOrder(body: CreateOrderPayload): Promise<OrderCreated> {
  return request<OrderCreated>({ method: 'POST', url: endpoints.order.create, data: body })
}
