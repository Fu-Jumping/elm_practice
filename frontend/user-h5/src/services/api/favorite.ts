/**
 * 商家收藏域接口（契约 §3.7，批次⑥ TODO-USER-006）
 * 列表 / 收藏（幂等）/ 取消收藏（取消未被收藏的商店按幂等 200，2026-09-10 定稿）
 * 权限收敛在后端：未登录 401、角色不符 403；前端只做跳登录的用户体验层处理
 */
import { request } from '@/services/http'
import type { FavoriteItem } from './types'
import { endpoints } from './endpoints'

/** 当前用户收藏商家列表（按收藏时间倒序） */
export function listFavorites(): Promise<FavoriteItem[]> {
  return request<FavoriteItem[]>({ method: 'GET', url: endpoints.favorite.list })
}

/** 收藏商家（重复收藏幂等，返回当前收藏，不产生重复记录） */
export function addFavorite(storeId: string): Promise<FavoriteItem> {
  return request<FavoriteItem>({
    method: 'POST',
    url: endpoints.favorite.add,
    data: { storeId },
  })
}

/** 取消收藏（未被收藏时幂等返回空对象；storeId 本身不存在返回 404） */
export function removeFavorite(storeId: string): Promise<Record<string, never>> {
  return request<Record<string, never>>({
    method: 'DELETE',
    url: endpoints.favorite.remove(storeId),
  })
}
