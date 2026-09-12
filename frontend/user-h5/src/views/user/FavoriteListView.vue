<script setup lang="ts">
/**
 * 我的收藏页（批次⑥ TODO-USER-006，契约 §3.7 / PRD 7.16.1「我的收藏页」三行）
 * 视觉真源：docs/design/exports/用户端/10-个人中心/02-我的收藏/（390 宽）
 * - 顶部栏：返回 + 标题「我的收藏」（56px、1px 底边线、标题 20px）
 * - 收藏商家列表：白底通栏卡（padding 10px 12px、缩略图 80×80、卡片间距 12px）；
 *   店名 18px、评分 14px 品牌橙、月售/时长与距离 12px 次要色、促销标签胶囊
 * - 取消收藏：先二次确认再调接口，成功后刷新列表（PRD 873 行）
 * - 空收藏：空态提示 + 去逛逛入口（TC-FAV-006）；未登录：跳登录并带 redirect
 * 底部导航由 MainLayout 按 route.meta.tab 渲染（TabBar 把本页归属「我的」高亮，见组件注释）
 * 口径：促销标签/配送时长/距离为 PRD 873 行展示要求，契约 §3.7 收藏对象尚未含这三个字段，
 * 按「接口返回才展示、缺失即隐藏」渲染，不使用演示值补齐（缺口已在 types.ts 登记）
 */
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StoreCover from '@/components/StoreCover.vue'
import { favoriteApi } from '@/services/api'
import { formatMoney } from '@/services/normalizers'
import { useSessionStore } from '@/stores/sessionStore'
import { toast } from '@/utils/toast'
import type { FavoriteItem } from '@/services/api/types'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()

const favorites = ref<FavoriteItem[]>([])
const loading = ref(true)
const failed = ref(false)
/** 取消收藏进行中的店铺集合：请求期禁用该卡按钮，重复点击只产生一次请求（PRD 873 行） */
const removing = ref<string[]>([])

async function loadFavorites(): Promise<void> {
  loading.value = true
  failed.value = false
  try {
    favorites.value = await favoriteApi.listFavorites()
  } catch {
    // 接口失败保留已展示结果并提供重试（PRD 873 行异常列）
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 登录校验先行（PRD 872 行「会话失效跳登录」；与确认订单页同款处理，兼顾直接挂载与路由守卫）
  if (!sessionStore.isLoggedIn) {
    await sessionStore.checkLogin()
    if (!sessionStore.isLoggedIn) {
      void router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return
    }
  }
  await loadFavorites()
})

/** 取消收藏：二次确认 → 调接口 → 刷新列表（成功后卡片从列表移除） */
async function unfavorite(item: FavoriteItem): Promise<void> {
  if (removing.value.includes(item.storeId)) return
  if (!window.confirm(`确定取消收藏「${item.storeName}」吗？`)) return
  removing.value.push(item.storeId)
  try {
    await favoriteApi.removeFavorite(item.storeId)
    toast('已取消收藏')
    await loadFavorites()
  } catch {
    // 失败提示由 http 层统一 toast，列表保持原状（用户可重试）
  } finally {
    removing.value = removing.value.filter((storeId) => storeId !== item.storeId)
  }
}

function goStore(storeId: string): void {
  void router.push({ name: 'store-detail', params: { storeId } })
}

function goHome(): void {
  void router.push({ name: 'home' })
}

function goBack(): void {
  if (window.history.length > 1) router.back()
  else void router.replace({ name: 'mine' })
}
</script>

<template>
  <div class="favorite-page" data-testid="favorite-page">
    <header class="fav-header" data-testid="favorite-header">
      <button class="fav-back" type="button" aria-label="返回" @click="goBack">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M15 4.5L7.5 12L15 19.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <span class="fav-title">我的收藏</span>
      <span class="fav-header-slot" />
    </header>

    <main class="fav-main">
      <p v-if="loading" class="fav-skeleton" data-testid="favorite-loading">加载中…</p>

      <template v-else-if="favorites.length">
        <article
          v-for="item in favorites"
          :key="item.favoriteId"
          class="fav-card"
          data-testid="favorite-card"
        >
          <button class="fav-thumb" type="button" @click="goStore(item.storeId)">
            <StoreCover class="fav-thumb-cover" :name="item.storeName" :image="item.image" />
          </button>
          <div class="fav-body">
            <button class="fav-name-row" type="button" @click="goStore(item.storeId)">
              <span class="fav-name">{{ item.storeName }}</span>
              <span class="fav-rating">{{ item.rating.toFixed(1) }}</span>
            </button>
            <p class="fav-meta-row">
              <span class="fav-meta">月售{{ item.monthlySales }}+</span>
              <span v-if="item.deliveryMinutes || item.distanceText" class="fav-meta">
                {{ item.deliveryMinutes }}分钟 | {{ item.distanceText }}
              </span>
            </p>
            <div class="fav-bottom-row">
              <div class="fav-tags">
                <span v-for="tag in item.couponTags ?? []" :key="tag" class="fav-tag">{{ tag }}</span>
                <span v-if="item.storeStatus === 'CLOSED' || item.storeStatus === 'TEMPORARILY_CLOSED'" class="fav-tag fav-tag--closed">
                  休息中
                </span>
              </div>
              <button
                class="fav-remove"
                type="button"
                data-testid="unfavorite-btn"
                :disabled="removing.includes(item.storeId)"
                @click="unfavorite(item)"
              >
                {{ removing.includes(item.storeId) ? '处理中' : '取消收藏' }}
              </button>
            </div>
          </div>
        </article>
      </template>

      <section v-else class="fav-empty" data-testid="favorite-empty">
        <p class="fav-empty-text">暂无收藏，去逛逛喜欢的商家吧</p>
        <button class="fav-empty-go" type="button" data-testid="favorite-empty-go" @click="goHome">
          去逛逛
        </button>
      </section>

      <p v-if="failed" class="fav-failed" data-testid="favorite-error">
        加载失败，请重试
        <button class="fav-retry" type="button" @click="loadFavorites">重试</button>
      </p>
    </main>
  </div>
</template>

<style scoped>
.favorite-page {
  min-height: 100vh;
  background: #f9f9f9;
  /* 底部导航由 MainLayout 渲染（约 84px），避免内容被遮挡 */
  padding-bottom: 84px;
}

/* 顶部栏（设计稿：56px、1px 底边线、页面底色，标题 20px/28） */
.fav-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 12px;
  background: #f9f9f9;
  border-bottom: 1px solid #e5e5e5;
}

.fav-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: #1a1c1c;
}

.fav-back svg {
  width: 20px;
  height: 20px;
}

.fav-title {
  font-size: 20px;
  font-weight: 500;
  line-height: 28px;
  color: #1a1c1c;
}

.fav-header-slot {
  width: 32px;
}

/* 列表（设计稿：上下 12px 内边距、卡片间距 12px） */
.fav-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0;
}

.fav-skeleton,
.fav-failed {
  padding: 12px;
  font-size: 14px;
  color: #999;
}

.fav-retry {
  margin-left: 8px;
  border: none;
  background: none;
  color: #ff5a1f;
  font-size: 14px;
}

/* 商家卡（设计稿：白底、padding 10px 12px、图文间距 8px、缩略图 80×80） */
.fav-card {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
}

.fav-thumb {
  flex: none;
  width: 80px;
  height: 80px;
  padding: 0;
  margin: 0;
  overflow: hidden;
  border: none;
  border-radius: 4px;
  background: #f2f2f2;
}

.fav-thumb-cover {
  display: block;
  width: 100%;
  height: 100%;
}

.fav-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.fav-name-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 0;
  border: none;
  background: none;
  text-align: left;
}

.fav-name {
  overflow: hidden;
  font-size: 18px;
  font-weight: 500;
  line-height: 24px;
  color: #1a1c1c;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.fav-rating {
  flex: none;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  color: #ff5a1f;
}

.fav-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.fav-meta {
  font-size: 12px;
  line-height: 16px;
  color: #666;
}

.fav-bottom-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
}

.fav-tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* 促销标签（设计稿：1px 描边 #ffb59e、半径 2px、浅橙底） */
.fav-tag {
  padding: 1px 3px;
  border: 1px solid #ffb59e;
  border-radius: 2px;
  background: rgba(255, 219, 208, 0.2);
  font-size: 10px;
  font-weight: 500;
  line-height: 14px;
  color: #666;
}

.fav-tag--closed {
  border-color: #e5e5e5;
  background: #f5f5f5;
}

.fav-remove {
  flex: none;
  padding: 4px 10px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  color: #666;
}

.fav-remove:disabled {
  opacity: 0.5;
}

.fav-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 12px;
}

.fav-empty-text {
  font-size: 14px;
  color: #999;
}

.fav-empty-go {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  background: #ff5a1f;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}
</style>
