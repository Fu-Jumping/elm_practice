/**
 * 店铺浏览 store（架构约定 §3.4）：店铺列表/详情/分类/商品（浏览域数据）
 * 统一模式：state 含 loading / error；action 调 api 并返回结果；视图负责提示
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { storeApi } from '@/services/api'
import type { StoreListParams, StoreSummary } from '@/services/api/types'

export const useCatalogStore = defineStore('catalog', () => {
  const stores = ref<StoreSummary[]>([])
  const loading = ref(false)
  const error = ref('')

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

  return { stores, loading, error, fetchStores }
})
