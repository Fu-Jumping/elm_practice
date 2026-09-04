/**
 * 店铺域接口（契约 §3.2：列表/详情/分类/商品）
 */
import { request } from '@/services/http'
import type { Product, StoreCategory, StoreListParams, StoreSummary } from './types'
import { endpoints } from './endpoints'

export function getStoreList(params?: StoreListParams): Promise<StoreSummary[]> {
  return request<StoreSummary[]>({ method: 'GET', url: endpoints.store.list, params })
}

export function getStoreDetail(storeId: string): Promise<StoreSummary> {
  return request<StoreSummary>({ method: 'GET', url: endpoints.store.detail(storeId) })
}

export function getStoreCategories(storeId: string): Promise<StoreCategory[]> {
  return request<StoreCategory[]>({
    method: 'GET',
    url: endpoints.store.categories(storeId),
  })
}

export function getStoreProducts(storeId: string): Promise<Product[]> {
  return request<Product[]>({ method: 'GET', url: endpoints.store.products(storeId) })
}
