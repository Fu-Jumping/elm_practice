/**
 * 订单域接口（契约 §3.5：创建/列表/详情；明细含在详情，P0）
 * 2026-09-07 联调对齐：返回后端真实形状 OrderRecord（扁平金额字段），由 normalizers 归一为视图模型
 * 2026-09-15 新增计价预览（CHG-006）：确认订单页下单前展示后端七步计价结果（SRS §5.6）
 */
import { request } from '@/services/http'
import type { CreateOrderPayload, OrderAmountSnapshot, OrderPreviewPayload, OrderRecord } from './types'
import { endpoints } from './endpoints'

/**
 * 计价预览（契约 §3.5 `POST /orders/preview`）：只读——不落订单、不清购物车、不扣库存；
 * 购物车由服务端按登录态读取，请求只传 storeId，空购物车返回 400。
 */
export function previewOrder(body: OrderPreviewPayload): Promise<OrderAmountSnapshot> {
  return request<OrderAmountSnapshot>({ method: 'POST', url: endpoints.order.preview, data: body })
}

export function createOrder(body: CreateOrderPayload): Promise<OrderRecord> {
  return request<OrderRecord>({ method: 'POST', url: endpoints.order.create, data: body })
}

/** 订单列表：按创建时间倒序；status 可选筛选（P0 仅 PROCESSING 有值） */
export function listOrders(status?: string): Promise<OrderRecord[]> {
  return request<OrderRecord[]>({
    method: 'GET',
    url: endpoints.order.list,
    params: status ? { status } : undefined,
  })
}

export function getOrder(orderId: string): Promise<OrderRecord> {
  return request<OrderRecord>({ method: 'GET', url: endpoints.order.detail(orderId) })
}

/** 接入已经存在的后端模拟支付；金额与状态全部使用服务端结果。 */
export function payOrder(orderId: string, success: boolean): Promise<OrderRecord> {
  return request<OrderRecord>({ method: 'POST', url: endpoints.order.payment(orderId), data: { success } })
}

/**
 * 用户取消订单（契约 §3.5，批次⑩ TODO-USER-002）
 * reason 必填 1–50 字；仅待支付/待接单可取消，COOKING 及之后返回 409；重复取消幂等返回当前订单。
 */
export function cancelOrder(orderId: string, reason: string): Promise<OrderRecord> {
  return request<OrderRecord>({ method: 'POST', url: endpoints.order.cancel(orderId), data: { reason } })
}
