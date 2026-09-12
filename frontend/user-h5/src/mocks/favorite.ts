/**
 * 收藏域 mock（契约 §3.7 后端替身，批次⑥ TODO-USER-006）
 *
 * 行为逐条对齐契约 §3.7：
 * - 列表按收藏时间倒序；只能读写当前用户自己的收藏（mock 单用户内存态）
 * - `(userId, storeId)` 唯一：重复收藏**幂等返回当前收藏**，不产生重复记录
 * - `storeId` 不存在返回 404；缺 `storeId` 返回 400
 * - 取消**未被收藏**的商店按幂等 200 处理（返回空对象，2026-09-10 定稿）；`storeId` 本身不存在仍 404
 * - 商家关闭后收藏项保留并展示最新 `storeStatus`
 *
 * 字段补全（契约缺口，2026-09-12 登记）：PRD 7.16.1「我的收藏页-收藏商家列表」行要求卡片展示
 * **配送时长、距离、促销标签**，契约 §3.7 收藏对象最小集未含这三个字段；本替身按 `storeId`
 * 关联店铺数据补全（真实后端由后端 join 后返回），前端按「返回才展示、缺失即隐藏」渲染。
 */
import type { FavoriteItem } from '@/services/api/types'
import type { MockHandler } from './index'
import { fail, ok } from './index'
import { findMockStore } from './store'

/**
 * 种子（测试 beforeEach 重灌用）：契约 §3.7 收藏对象最小集。
 * 排序依据 `createdAt`（列表按收藏时间倒序）；m002 更新、m001 更早。
 */
export const FAVORITE_SEED: FavoriteItem[] = [
  {
    favoriteId: 'f001',
    storeId: 'm002',
    storeName: '肯德基宅急送',
    image: '/demo-images/store-m002.jpg',
    rating: 4.8,
    monthlySales: 3500,
    deliveryFee: 5,
    storeStatus: 'OPEN',
    createdAt: '2026-09-10 12:00:00',
  },
  {
    favoriteId: 'f002',
    storeId: 'm001',
    storeName: '老王小店',
    image: '/demo-images/store-m001.jpg',
    rating: 4.6,
    monthlySales: 1200,
    deliveryFee: 3,
    storeStatus: 'OPEN',
    createdAt: '2026-09-09 12:00:00',
  },
]

export const favoriteMockState: FavoriteItem[] = FAVORITE_SEED.map((item) => ({ ...item }))

let favoriteIdSeq = FAVORITE_SEED.length + 1

/** 关联店铺数据补全（店名/评分/月售/配送费/营业状态 + PRD 展示要求的时长、距离、促销标签） */
function enrich(favorite: FavoriteItem): FavoriteItem {
  const store = findMockStore(favorite.storeId)
  if (!store) return { ...favorite }
  return {
    ...favorite,
    storeName: store.name,
    image: store.image ?? favorite.image,
    rating: store.rating,
    monthlySales: store.monthlySales,
    deliveryFee: store.deliveryFee,
    storeStatus: store.status,
    deliveryMinutes: store.deliveryMinutes,
    distanceText: store.distanceText,
    couponTags: store.couponTags,
  }
}

export const favoriteMocks: Record<string, MockHandler> = {
  'GET /me/favorites': () =>
    ok(
      [...favoriteMockState]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((item) => enrich(item)),
    ),

  'POST /me/favorites': (ctx) => {
    const storeId = String((ctx.data as { storeId?: unknown } | undefined)?.storeId ?? '').trim()
    if (!storeId) return fail(400, 40000, 'storeId 不能为空')
    const store = findMockStore(storeId)
    if (!store) return fail(404, 40400, '商家不存在')
    // 重复收藏幂等：返回当前收藏，不产生重复记录（契约 §3.7、TC-FAV-003）
    const existing = favoriteMockState.find((item) => item.storeId === storeId)
    if (existing) return ok(enrich(existing))
    const favorite: FavoriteItem = {
      favoriteId: `f${String(favoriteIdSeq++).padStart(3, '0')}`,
      storeId,
      storeName: store.name,
      image: store.image,
      rating: store.rating,
      monthlySales: store.monthlySales,
      deliveryFee: store.deliveryFee,
      storeStatus: store.status,
      createdAt: new Date().toISOString(),
    }
    favoriteMockState.push(favorite)
    return ok(enrich(favorite))
  },

  'DELETE /me/favorites/:storeId': (ctx) => {
    const storeId = String(ctx.params?.storeId ?? '')
    // storeId 本身不存在 → 404（契约 §3.7）
    if (!findMockStore(storeId)) return fail(404, 40400, '商家不存在')
    const index = favoriteMockState.findIndex((item) => item.storeId === storeId)
    // 取消未被收藏的商店 → 幂等 200 空对象，不报错、不产生记录（2026-09-10 定稿）
    if (index >= 0) favoriteMockState.splice(index, 1)
    return ok({})
  },
}
