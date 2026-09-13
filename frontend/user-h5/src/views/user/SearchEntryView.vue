<template>
  <div class="search-entry-page" data-testid="search-entry-page">
    <!-- 搜索栏（设计真源 03-搜索与商家列表/01-搜索页：占位「搜索商家、商品名称」+ 搜索按钮） -->
    <header class="se-header">
      <button class="se-back" type="button" aria-label="返回" data-testid="search-entry-back" @click="onBack">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 4.5L7.5 12L15 19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <input
        v-model="keyword"
        class="se-input"
        type="search"
        data-testid="search-entry-input"
        placeholder="搜索商家、商品名称"
        @keyup.enter="submit"
      />
      <button class="se-submit" type="button" data-testid="search-entry-submit" @click="submit">搜索</button>
    </header>

    <!-- 最近搜索（本机历史；无历史整区隐藏） -->
    <section v-if="history.length" class="se-section" data-testid="search-entry-recent">
      <h2 class="se-section-title">最近搜索</h2>
      <div class="se-tags">
        <button
          v-for="word in history"
          :key="word"
          class="se-tag"
          type="button"
          data-testid="search-entry-recent-word"
          @click="submitWord(word)"
        >
          {{ word }}
        </button>
      </div>
    </section>

    <!-- 热门搜索（契约无该接口 → 页面内置课程演示清单，带 HOT 标记，不得当作接口结果） -->
    <section class="se-section" data-testid="search-entry-hot">
      <h2 class="se-section-title">热门搜索</h2>
      <div class="se-tags">
        <button
          v-for="item in HOT_WORDS"
          :key="item.word"
          class="se-tag"
          type="button"
          data-testid="search-entry-hot-word"
          @click="submitWord(item.word)"
        >
          {{ item.word }}
          <span v-if="item.hot" class="se-hot-badge" data-testid="search-entry-hot-badge">HOT</span>
        </button>
      </div>
    </section>

    <!-- 底部促销条（设计稿为纯展示运营位，按占位口径不做交互、不接优惠数据） -->
    <div class="se-promo" data-testid="search-entry-promo">
      <p class="se-promo-title">配送优惠</p>
      <p class="se-promo-desc">今日最高立减50%</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { pushSearchHistory, readSearchHistory } from '@/utils/searchHistory'
import { toast } from '@/utils/toast'

const router = useRouter()
const keyword = ref('')
const history = ref<string[]>([])

/**
 * 热门词：设计真源 `docs/design/exports/用户端/03-搜索与商家列表/01-搜索页/` 的 8 个词，
 * 前 3 个带 HOT 标记；契约无热门词接口，故为**课程演示内置清单**（页面不把它当作接口结果）。
 */
const HOT_WORDS: Array<{ word: string; hot: boolean }> = [
  { word: '麻辣烫', hot: true },
  { word: '奶茶', hot: true },
  { word: '烧烤', hot: true },
  { word: '炸鸡', hot: false },
  { word: '寿司', hot: false },
  { word: '饺子', hot: false },
  { word: '面条', hot: false },
  { word: '沙拉', hot: false },
]

function loadHistory(): void {
  history.value = readSearchHistory()
}

onMounted(loadHistory)
onActivated(loadHistory)

/** 提交输入框关键词 */
function submit(): void {
  submitWord(keyword.value)
}

/** 提交某个词：空词提示且不跳转（PRD：空关键词不发起请求）；成功则写历史并进结果页 */
function submitWord(word: string): void {
  const next = word.trim()
  if (!next) {
    toast('请输入关键词')
    return
  }
  history.value = pushSearchHistory(next)
  void router.push({ name: 'search', query: { keyword: next } })
}

function onBack(): void {
  if (window.history.length > 1) router.back()
  else void router.push({ name: 'home' })
}
</script>

<style scoped>
.search-entry-page {
  min-height: 100%;
  background: var(--color-background);
}
.se-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-surface-white);
}
.se-back {
  flex: none;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: var(--color-text-primary);
  cursor: pointer;
}
.se-back svg {
  width: 20px;
  height: 20px;
}
.se-input {
  flex: 1;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--color-primary);
  border-radius: 17px;
  font-size: 14px;
}
.se-submit {
  flex: none;
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 17px;
  background: var(--color-primary);
  color: var(--color-surface-white);
  font-size: 14px;
  cursor: pointer;
}
.se-section {
  padding: 14px 12px 4px;
}
.se-section-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}
.se-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.se-tag {
  padding: 5px 12px;
  border: none;
  border-radius: 14px;
  background: var(--color-surface-white);
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
}
.se-hot-badge {
  margin-left: 4px;
  padding: 0 3px;
  border-radius: 3px;
  background: var(--color-primary);
  color: var(--color-surface-white);
  font-size: 9px;
  line-height: 12px;
  vertical-align: 1px;
}
.se-promo {
  margin: 16px 12px 0;
  padding: 14px 12px;
  border-radius: 8px;
  background: linear-gradient(90deg, #fff1e8, #ffe2d1);
}
.se-promo-title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--color-primary);
}
.se-promo-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
