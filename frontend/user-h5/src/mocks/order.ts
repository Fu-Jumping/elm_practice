/**
 * 订单域 mock（契约 §3.5 后端替身，P0 最小集）
 * 口径对齐后端职责（TC-ORD-001/003/004/005/013/015/016/021/022）：
 * - 缺 storeId/addressId → 400；addressId 不存在/不属于当前用户 → 按安全需要统一返回不存在（404）
 * - 金额后端重读购物车行计价：实付 = 商品小计 + 打包费 2.00；前端 expectedTotal 仅作一致性提示
 * - 创建成功持久化订单（含商品/地址/金额快照与创建时间）并清空该店购物车（TC-ORD-003）
 * - GET /orders 按创建时间倒序、支持 status 筛选（TC-ORD-013）；GET /orders/{orderId} 详情含明细（TC-ORD-016）
 * P0 订单状态仅 PROCESSING（创建即 PROCESSING，不流转）
 */
import { PACKAGING_FEE } from '@/services/normalizers'
import type { OrderAmounts, OrderDetail, OrderItemSnapshot, OrderSummary } from '@/services/api/types'
import { addressMockState } from './address'
import { clearMockCart, getMockCartSnapshot } from './cart'
import { findMockStore } from './store'
import type { MockHandler } from './index'
import { fail, ok } from './index'

/** 订单内存态（查询侧数据源；导出供测试隔离重灌，与 addressMockState 同风格） */
export type MockOrder = OrderDetail

export const ORDER_SEED: MockOrder[] = [
  {
    orderId: 'o0001',
    status: 'PROCESSING',
    storeId: 'm002',
    storeName: '肯德基宅急送',
    remark: '少放辣',
    addressSnapshot: {
      contactName: '张同学',
      contactPhone: '13800000001',
      region: '天津大学北洋园校区',
      detail: '12号楼 304室',
    },
    items: [{ productId: 'p101', name: '香辣鸡腿堡', unitPrice: 19.5, quantity: 2 }],
    amounts: { itemsTotal: 39, packagingFee: 2, payableAmount: 41 },
    createdAt: '2026-09-07T10:00:00',
  },
  {
    orderId: 'o0002',
    status: 'PROCESSING',
    storeId: 'm003',
    storeName: '麦当劳',
    remark: '',
    addressSnapshot: {
      contactName: '张同学',
      contactPhone: '13800000001',
      region: '天津大学北洋园校区',
      detail: '12号楼 304室',
    },
    items: [{ productId: 'p301', name: '巨无霸', unitPrice: 25.5, quantity: 1 }],
    amounts: { itemsTotal: 25.5, packagingFee: 2, payableAmount: 27.5 },
    createdAt: '2026-09-07T11:30:00',
  },
]

export const orderMockState: MockOrder[] = ORDER_SEED.map((item) => ({ ...item }))

let orderSeq = ORDER_SEED.length + 1

function toSummary(order: MockOrder): OrderSummary {
  const { orderId, status, storeId, storeName, amounts, createdAt } = order
  return { orderId, status, storeId, storeName, amounts, createdAt }
}

export const orderMocks: Record<string, MockHandler> = {
  'POST /orders': ({ data }) => {
    const { storeId, addressId, remark, expectedTotal } = (data ?? {}) as {
      storeId?: string
      addressId?: string
      remark?: string
      expectedTotal?: number
    }
    if (!storeId || !addressId) {
      return fail(400, 40000, '缺少店铺或收货地址')
    }
    // 地址归属校验：当前用户地址列表外的一律不存在（TC-ORD-005，防跨用户探测）
    const address = addressMockState.find((item) => item.addressId === addressId)
    if (!address) {
      return fail(404, 40400, '地址不存在')
    }
    // 后端重读购物车行计价（TC-ORD-013）：购物车为空时不能创建订单
    const lines = getMockCartSnapshot(storeId)
    if (lines.length === 0) {
      return fail(409, 40900, '购物车为空，无法创建订单')
    }
    const items: OrderItemSnapshot[] = lines.map((line) => ({
      productId: line.productId,
      name: line.name,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
    }))
    const itemsTotal = Number(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0).toFixed(2))
    const amounts: OrderAmounts = {
      itemsTotal,
      packagingFee: PACKAGING_FEE,
      payableAmount: Number((itemsTotal + PACKAGING_FEE).toFixed(2)),
    }
    void expectedTotal // 一致性提示字段：mock 后端不采信，仅后端计价口径生效

    const orderId = `o${String(orderSeq++).padStart(4, '0')}`
    const order: MockOrder = {
      orderId,
      status: 'PROCESSING',
      storeId,
      storeName: findMockStore(storeId)?.name ?? storeId,
      remark: remark ?? '',
      addressSnapshot: {
        contactName: address.contactName,
        contactPhone: address.contactPhone,
        region: address.region,
        detail: address.detail,
      },
      items,
      amounts,
      createdAt: new Date().toISOString(),
    }
    orderMockState.push(order)
    // 事务成功后清空该用户该店购物车（TC-ORD-003）
    clearMockCart(storeId)
    return ok({ orderId, payableAmount: amounts.payableAmount, remark: order.remark })
  },

  'GET /orders': ({ params }) => {
    const status = typeof params?.status === 'string' ? params.status : ''
    const filtered = status
      ? orderMockState.filter((order) => order.status === status)
      : [...orderMockState]
    // 按创建时间倒序（TC-ORD-013）
    const sorted = filtered.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    return ok<OrderSummary[]>(sorted.map(toSummary))
  },

  'GET /orders/:orderId': ({ params }) => {
    const order = orderMockState.find((item) => item.orderId === params?.orderId)
    if (!order) return fail(404, 40400, '订单不存在')
    return ok<OrderDetail>({ ...order, items: order.items.map((item) => ({ ...item })) })
  },
}
