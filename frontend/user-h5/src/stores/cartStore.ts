/**
 * 购物车 store（架构约定 §3.4，按店铺隔离）：行列表 + 数量/合计派生
 * 加购成功后重查购物车，保证数量/合计与后端口径一致
 * TODO(购物车弹层任务)：数量步进（PATCH，减到 0 改 DELETE）接入后补 changeQuantity/removeLine
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { cartApi } from '@/services/api'
import type { CartLine } from '@/services/api/types'

export const useCartStore = defineStore('cart', () => {
  const lines = ref<CartLine[]>([])
  const loading = ref(false)
  const error = ref('')

  /** 购物车商品总件数（PRD 购物车栏：商品数） */
  const totalCount = computed(() => lines.value.reduce((sum, line) => sum + line.quantity, 0))

  /** 合计金额 = Σ 单价 × 数量（两位小数展示在视图层走 formatMoney） */
  const totalAmount = computed(() => lines.value.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0))

  /** 加购进行中的商品（XA-05：前端禁用只发一次请求，防连点被防重拦截器取消） */
  const addingProductIds = ref<Set<string>>(new Set())

  /** 步进进行中的行（XA-05 同款：步进请求期间按钮禁用，防连点） */
  const steppingLineIds = ref<Set<string>>(new Set())

  /** 当前购物车所属店铺（TC-CRT-012 跨店提示检测用） */
  const currentCartStoreId = ref('')
  /** 跨店提示（待视图消费：A 店有商品时进入 B 店，提示独立结算） */
  const crossStoreHint = ref('')

  /** 取走并清空跨店提示（消费型读取，防重复提示） */
  function takeCrossStoreHint(): string {
    const hint = crossStoreHint.value
    crossStoreHint.value = ''
    return hint
  }

  function isAdding(productId: string): boolean {
    return addingProductIds.value.has(productId)
  }

  function isStepping(cartLineId: string): boolean {
    return steppingLineIds.value.has(cartLineId)
  }

  async function fetchCart(storeId: string): Promise<void> {
    loading.value = true
    error.value = ''
    const prevStoreId = currentCartStoreId.value
    const prevCount = totalCount.value
    try {
      lines.value = await cartApi.getCart(storeId)
      // TC-CRT-012：A 店有商品时进入 B 店 → 记录提示（A 店商品保留，B 店独立结算）
      if (prevCount > 0 && prevStoreId && prevStoreId !== storeId) {
        crossStoreHint.value = prevStoreId
      }
      currentCartStoreId.value = storeId
    } catch (err) {
      // 被防重拦截器取消的旧请求静默返回，不清空已有购物车行
      if ((err as { code?: string }).code === 'ERR_CANCELED') return
      lines.value = []
      error.value = err instanceof Error ? err.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  async function addItem(
    storeId: string,
    productId: string,
    quantity = 1,
  ): Promise<boolean> {
    // XA-05 防重复提交：同商品加购进行中直接忽略后续点击
    if (addingProductIds.value.has(productId)) return false
    addingProductIds.value.add(productId)
    try {
      const line = await cartApi.addCartItem({ storeId, productId, quantity })
      // 成功后本地 upsert 响应行（mock/后端均返回合并后的行），不再逐次 GET 重查
      const index = lines.value.findIndex((existing) => existing.cartLineId === line.cartLineId)
      if (index >= 0) lines.value.splice(index, 1, line)
      else lines.value.push(line)
      return true
    } catch (err) {
      if ((err as { code?: string }).code === 'ERR_CANCELED') return false
      // 失败原因（售罄/超库存/未登录等）由 http 层统一 toast；视图不重复提示
      error.value = err instanceof Error ? err.message : '加购失败'
      return false
    } finally {
      addingProductIds.value.delete(productId)
    }
  }

  /** 步进 -：数量减 1；减到 0 转删除请求（契约 §3.4：前端减到 0 改 DELETE，TC-CRT-005/006） */
  async function decrementLine(cartLineId: string): Promise<void> {
    if (steppingLineIds.value.has(cartLineId)) return
    const line = lines.value.find((item) => item.cartLineId === cartLineId)
    if (!line) return
    steppingLineIds.value.add(cartLineId)
    try {
      if (line.quantity <= 1) {
        await cartApi.deleteCartItem(cartLineId)
        lines.value = lines.value.filter((item) => item.cartLineId !== cartLineId)
      } else {
        const updated = await cartApi.patchCartItem(cartLineId, line.quantity - 1)
        const index = lines.value.findIndex((item) => item.cartLineId === cartLineId)
        if (index >= 0) lines.value.splice(index, 1, updated)
      }
    } catch (err) {
      if ((err as { code?: string }).code === 'ERR_CANCELED') return
      // 失败保留原数量（http 层已 toast）
      error.value = err instanceof Error ? err.message : '修改数量失败'
    } finally {
      steppingLineIds.value.delete(cartLineId)
    }
  }

  /** 步进 +：数量加 1（PATCH；XA-05 同款防重） */
  async function incrementLine(cartLineId: string): Promise<void> {
    if (steppingLineIds.value.has(cartLineId)) return
    const line = lines.value.find((item) => item.cartLineId === cartLineId)
    if (!line) return
    steppingLineIds.value.add(cartLineId)
    try {
      const updated = await cartApi.patchCartItem(cartLineId, line.quantity + 1)
      const index = lines.value.findIndex((item) => item.cartLineId === cartLineId)
      if (index >= 0) lines.value.splice(index, 1, updated)
    } catch (err) {
      if ((err as { code?: string }).code === 'ERR_CANCELED') return
      error.value = err instanceof Error ? err.message : '修改数量失败'
    } finally {
      steppingLineIds.value.delete(cartLineId)
    }
  }

  return {
    lines,
    loading,
    error,
    totalCount,
    totalAmount,
    isAdding,
    isStepping,
    takeCrossStoreHint,
    fetchCart,
    addItem,
    decrementLine,
    incrementLine,
  }
})
