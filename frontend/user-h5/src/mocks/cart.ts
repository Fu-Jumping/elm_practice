/**
 * 购物车域 mock（契约 §3.4：当前用户 + 店铺 + 商品 + **规格组合**唯一，同组合合并数量；
 * 后端重读价格与上下架状态；数量必须大于 0，超库存 409）
 * mock 内存态按店铺隔离（Map<storeId, CartLine[]>）；PATCH/DELETE 待购物车弹层任务接入
 * 规格口径（契约 §4.2，逐条对齐后端 `CartService.validatedSelection`，2026-09-15）：
 * - 无规格商品传了规格 → 400「该商品没有可选规格」
 * - 有规格商品未传规格 → 400「请选择商品规格」
 * - 有规格商品传了多于一个 → 400「每个商品请选择一个规格」
 * - 规格名不在商品可选列表 → 400「商品规格不存在」
 * - 行单价 = 基础价 + 已选规格价差；行唯一键 = 商品 + 规格名排序拼接的 specKey
 */
import type { CartLine, ProductSpecOption } from '@/services/api/types'
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
    const { storeId, productId, quantity, specOptions } = (data ?? {}) as {
      storeId?: string
      productId?: string
      quantity?: number
      specOptions?: ProductSpecOption[]
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
    // 规格校验与单价计算（逐条对齐后端 validatedSelection/unitPrice）
    const available = product.specOptions ?? []
    let selected: ProductSpecOption[] = []
    if (available.length === 0) {
      if (specOptions && specOptions.length > 0) return fail(400, 40000, '该商品没有可选规格')
    } else {
      if (!specOptions || specOptions.length === 0) return fail(400, 40000, '请选择商品规格')
      if (specOptions.length !== 1) return fail(400, 40000, '每个商品请选择一个规格')
      const picked = available.find((option) => option.name === specOptions[0]?.name)
      if (!picked) return fail(400, 40000, '商品规格不存在')
      selected = [{ name: picked.name, priceDelta: picked.priceDelta }]
    }
    const unitPrice = product.price + selected.reduce((sum, option) => sum + option.priceDelta, 0)
    const specKey = selected
      .map((option) => option.name)
      .sort()
      .join('|')

    const lines = cartByStore.get(storeId) ?? []
    // 行唯一范围＝用户 + 店铺 + 商品 + 规格组合（同商品不同规格不得错误合并）
    const existing = lines.find((line) => line.productId === productId && specKeyOf(line) === specKey)
    const mergedQuantity = (existing?.quantity ?? 0) + quantity
    if (mergedQuantity > product.stock) {
      return fail(409, 40902, '超出库存')
    }
    if (existing) {
      existing.quantity = mergedQuantity
      existing.unitPrice = unitPrice
      return ok<CartLine>({ ...existing })
    }
    const line: CartLine = {
      cartLineId: `l${lineSeq++}`,
      storeId,
      productId,
      name: product.name,
      unitPrice,
      quantity,
      ...(selected.length > 0 ? { specOptions: selected } : {}),
    }
    lines.push(line)
    cartByStore.set(storeId, lines)
    return ok<CartLine>({ ...line })
  },

  // 数量步进（契约 §3.4：数量必须大于 0，减到 0 由前端改为 DELETE；对齐后端 PATCH /cart/items/{id}）
  'PATCH /cart/items/:cartLineId': ({ params, data }) => {
    const { quantity } = (data ?? {}) as { quantity?: number }
    if (!quantity || quantity <= 0) {
      return fail(400, 40000, '数量必须大于 0')
    }
    const line = findLine(String(params?.cartLineId ?? ''))
    if (!line) return fail(404, 40400, '购物车行不存在')
    const product = findMockProduct(line.productId)
    if (product && quantity > product.stock) {
      return fail(409, 40902, '超出库存')
    }
    line.quantity = quantity
    return ok<CartLine>({ ...line })
  },

  'DELETE /cart/items/:cartLineId': ({ params }) => {
    for (const [storeId, lines] of cartByStore) {
      const index = lines.findIndex((line) => line.cartLineId === params?.cartLineId)
      if (index >= 0) {
        lines.splice(index, 1)
        return ok(null)
      }
    }
    return fail(404, 40400, '购物车行不存在')
  },
}

/** 按行 ID 查找购物车行（跨店内存态定位，改/删共用） */
function findLine(cartLineId: string): CartLine | undefined {
  for (const lines of cartByStore.values()) {
    const line = lines.find((item) => item.cartLineId === cartLineId)
    if (line) return line
  }
  return undefined
}

/** 行的规格组合键（无规格为空串，与后端 `specKey` 同口径：规格名排序后以 `|` 拼接） */
function specKeyOf(line: CartLine): string {
  return (line.specOptions ?? [])
    .map((option) => option.name)
    .sort()
    .join('|')
}
