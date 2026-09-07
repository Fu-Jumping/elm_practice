/**
 * 购物车域 mock（契约 §3.4：当前用户 + 店铺 + 商品唯一，同商品合并数量；
 * 后端重读价格与上下架状态；数量必须大于 0，超库存 409）
 * mock 内存态按店铺隔离（Map<storeId, CartLine[]>）；PATCH/DELETE 待购物车弹层任务接入
 */
import type { CartLine } from '@/services/api/types'
import type { MockHandler } from './index'
import { fail, ok } from './index'
import { findMockProduct } from './store'

const cartByStore = new Map<string, CartLine[]>()
let lineSeq = 1

/** 清空指定店铺购物车（订单域 mock 创建成功后调用，对齐 TC-ORD-003：事务成功后清空该店购物车） */
export function clearMockCart(storeId: string): void {
  cartByStore.delete(storeId)
}

/** 只读快照（订单域 mock 计价用：后端重读购物车行价格与数量，TC-ORD-013） */
export function getMockCartSnapshot(storeId: string): CartLine[] {
  return (cartByStore.get(storeId) ?? []).map((line) => ({ ...line }))
}

export const cartMocks: Record<string, MockHandler> = {
  'GET /cart': ({ params }) => {
    const storeId = String(params?.storeId ?? '')
    // 响应必须返回拷贝（真实后端经 JSON 序列化每次都是新对象）；
    // 返回内部裸引用会让响应式更新因"新旧代理同源"而静默失效（2026-09-06 加购不刷新缺陷根因）
    return ok<CartLine[]>((cartByStore.get(storeId) ?? []).map((line) => ({ ...line })))
  },

  'POST /cart/items': ({ data }) => {
    const { storeId, productId, quantity } = (data ?? {}) as {
      storeId?: string
      productId?: string
      quantity?: number
    }
    if (!storeId || !productId || !quantity || quantity <= 0) {
      return fail(400, 40000, '加购参数不合法')
    }
    // 后端重读商品价格与上下架状态（契约 §3.4）
    const product = findMockProduct(productId)
    if (!product || product.storeId !== storeId) {
      return fail(404, 40400, '商品不存在')
    }
    if (!product.onSale || product.stock <= 0) {
      return fail(409, 40901, '商品已售罄或已下架')
    }
    const lines = cartByStore.get(storeId) ?? []
    const existing = lines.find((line) => line.productId === productId)
    const mergedQuantity = (existing?.quantity ?? 0) + quantity
    if (mergedQuantity > product.stock) {
      return fail(409, 40902, '超出库存')
    }
    if (existing) {
      existing.quantity = mergedQuantity
      return ok<CartLine>({ ...existing })
    }
    const line: CartLine = {
      cartLineId: `l${lineSeq++}`,
      storeId,
      productId,
      name: product.name,
      unitPrice: product.price,
      quantity,
    }
    lines.push(line)
    cartByStore.set(storeId, lines)
    return ok<CartLine>({ ...line })
  },
}
