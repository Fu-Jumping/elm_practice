/**
 * 店铺浏览 store（架构约定 §3.4）：店铺列表/详情/分类/商品（浏览域数据）
 * 统一模式：state 含 loading / error；action 调 api 并返回结果；视图负责提示
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { storeApi } from '@/services/api'
import type { Product, StoreCategory, StoreListParams, StoreSummary } from '@/services/api/types'

export const useCatalogStore = defineStore('catalog', () => {
  const stores = ref<StoreSummary[]>([])
  const loading = ref(false)
  const error = ref('')

  // ---- 店铺详情域（商家详情页）：详情 + 分类 + 商品 ----
  const storeDetail = ref<StoreSummary | null>(null)
  const detailLoading = ref(false)
  /** 详情错误：含 BizError 状态码，404 视为商家不存在 */
  const detailError = ref<{ message: string; status: number } | null>(null)
  const categories = ref<StoreCategory[]>([])
  const products = ref<Product[]>([])
  const productsLoading = ref(false)

  async function fetchStoreDetail(storeId: string): Promise<void> {
    detailLoading.value = true
    detailError.value = null
    try {
      storeDetail.value = await storeApi.getStoreDetail(storeId)
    } catch (err) {
      // 被防重拦截器取消的旧请求静默返回，不清空已有数据（2026-09-07 竞态修复：快速切换店铺商品被清空）
      if ((err as { code?: string }).code === 'ERR_CANCELED') return
      storeDetail.value = null
      const status = (err as { status?: number }).status ?? 0
      detailError.value = {
        message: err instanceof Error ? err.message : '加载失败',
        status,
      }
    } finally {
      detailLoading.value = false
    }
  }

  async function fetchStoreCategories(storeId: string): Promise<void> {
    try {
      categories.value = await storeApi.getStoreCategories(storeId)
    } catch (err) {
      // 被取消的旧请求静默返回，不清空已有分类（竞态修复同上）
      if ((err as { code?: string }).code === 'ERR_CANCELED') return
      categories.value = []
    }
  }

  async function fetchStoreProducts(storeId: string): Promise<void> {
    productsLoading.value = true
    try {
      products.value = await storeApi.getStoreProducts(storeId)
    } catch (err) {
      // 被取消的旧请求静默返回，不清空已有商品（竞态修复：快速切换店铺商品被清空）
      if ((err as { code?: string }).code === 'ERR_CANCELED') return
      products.value = []
    } finally {
      productsLoading.value = false
    }
  }

  async function fetchStores(params?: StoreListParams): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      stores.value = await storeApi.getStoreList(params)
    } catch (err) {
      // 空态/错误态由视图渲染，不写死兜底数据（架构约定 §7.2）
      stores.value = []
      error.value = err instanceof Error ? err.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  return {
    stores,
    loading,
    error,
    fetchStores,
    storeDetail,
    detailLoading,
    detailError,
    categories,
    products,
    productsLoading,
    fetchStoreDetail,
    fetchStoreCategories,
    fetchStoreProducts,
  }
})
