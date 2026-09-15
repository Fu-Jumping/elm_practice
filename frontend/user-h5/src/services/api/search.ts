/**
 * 搜索域 api（契约 §3.6）：关键词搜索同时返回商家与商品汇总。
 * 页面只调用本模块，不直接拼路径、不解析原始响应（架构约定 §3.3）。
 */
import { request } from '@/services/http'
import { endpoints } from './endpoints'
import type { SearchResult, SearchSort } from './types'

export interface SearchParams {
  /** 关键词：匹配商家名或商品名；空关键词由前端拦截、不发起请求（契约 §3.6） */
  keyword: string
  /** 可选分类条件：来源为店铺自身 categories */
  categoryId?: string
  /** 排序：综合 / 销量 / 距离（默认综合） */
  sort?: SearchSort
  /** 分页：默认 page=1&size=10 */
  page?: number
  size?: number
}

/** 关键词搜索（契约 §3.6）：返回 { merchants, products } 两组分页列表 */
export function search(params: SearchParams): Promise<SearchResult> {
  return request<SearchResult>({
    method: 'GET',
    url: endpoints.search.query,
    params: {
      keyword: params.keyword,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.sort ? { sort: params.sort } : {}),
      ...(params.page ? { page: params.page } : {}),
      ...(params.size ? { size: params.size } : {}),
    },
  })
}

/** 联想候选（契约 §3.6 /search/suggest）：词条/店铺/商品三源，text 为补全文本 */
export interface SearchSuggestion {
  text: string
  source: 'term' | 'store' | 'product'
}

/** 输入联想（防抖由调用方负责）：空关键词返回空列表 */
export function suggest(keyword: string, limit = 8): Promise<{ suggestions: SearchSuggestion[] }> {
  return request<{ suggestions: SearchSuggestion[] }>({
    method: 'GET',
    url: endpoints.search.suggest,
    params: { keyword, limit },
  })
}

/** 热门词（契约 §3.6 /search/hot）：来自后端词条字典，前 3 名带 HOT 标记 */
export function hotWords(limit = 8): Promise<Array<{ word: string; hot: boolean }>> {
  return request<Array<{ word: string; hot: boolean }>>({
    method: 'GET',
    url: endpoints.search.hot,
    params: { limit },
  })
}
