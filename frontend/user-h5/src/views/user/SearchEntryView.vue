<template>
  <div class="search-entry-page" data-testid="search-entry-page">
    <!-- 搜索栏（设计真源 03-搜索与商家列表/01-搜索页：占位「搜索商家、商品名称」+ 搜索按钮） -->
    <header class="se-header">
      <button class="se-back" type="button" aria-label="返回" data-testid="search-entry-back" @click="onBack">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 4.5L7.5 12L15 19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <div class="se-input-wrap">
        <input
          v-model="keyword"
          class="se-input"
          type="search"
          data-testid="search-entry-input"
          placeholder="搜索商家、商品名称"
          @keyup.enter="submit"
          @keyup.esc="closeSuggest"
          @input="onInput"
          @focus="onInput"
        />
        <!-- 联想下拉（契约 §3.6 /search/suggest：词条/店铺/商品三源，点击即搜） -->
        <ul v-if="showSuggest" class="se-suggest" data-testid="search-suggest-list">
          <li v-if="!suggestions.length" class="se-suggest-empty">无联想词，回车直接搜索</li>
          <li v-for="(item, i) in suggestions" :key="item.text + item.source">
            <button
              type="button"
              class="se-suggest-item"
              :data-testid="`search-suggest-item-${i}`"
              @mousedown.prevent="pickSuggestion(item.text)"
            >
              <span class="se-suggest-text">{{ item.text }}</span>
              <span class="se-suggest-source" :data-source="item.source">{{ sourceLabel(item.source) }}</span>
            </button>
          </li>
        </ul>
      </div>
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

    <!-- 热门搜索（契约 §3.6 /search/hot：来自后端词条字典，前 3 带 HOT；接口失败回落设计稿内置清单） -->
    <section class="se-section" data-testid="search-entry-hot">
      <h2 class="se-section-title">热门搜索</h2>
      <div class="se-tags">
        <button
          v-for="item in hotList"
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
import { searchApi, type SearchSuggestion } from '@/services/api'
import { pushSearchHistory, readSearchHistory } from '@/utils/searchHistory'
import { toast } from '@/utils/toast'

const router = useRouter()
const keyword = ref('')
const history = ref<string[]>([])

/** 热门词回落清单：设计真源 8 词（仅当 /search/hot 请求失败时使用，保证页面可用） */
const FALLBACK_HOT: Array<{ word: string; hot: boolean }> = [
  { word: '麻辣烫', hot: true },
  { word: '奶茶', hot: true },
  { word: '烧烤', hot: true },
  { word: '炸鸡', hot: false },
  { word: '寿司', hot: false },
  { word: '饺子', hot: false },
  { word: '面条', hot: false },
  { word: '沙拉', hot: false },
]
const hotList = ref<Array<{ word: string; hot: boolean }>>(FALLBACK_HOT)

const suggestions = ref<SearchSuggestion[]>([])
const showSuggest = ref(false)
let suggestTimer: ReturnType<typeof setTimeout> | undefined

/** 联想来源标签（词条=同义重映射词，店铺/商品=目录名补全） */
function sourceLabel(source: SearchSuggestion['source']): string {
  if (source === 'term') return '词条'
  if (source === 'store') return '店铺'
  return '商品'
}

/** 输入联想：250ms 防抖调 /search/suggest；空词收起（PRD：空关键词不发搜索请求，联想同理） */
function onInput(): void {
  if (suggestTimer) clearTimeout(suggestTimer)
  const q = keyword.value.trim()
  if (!q) {
    suggestions.value = []
    showSuggest.value = false
    return
  }
  suggestTimer = setTimeout(async () => {
    try {
      const res = await searchApi.suggest(q)
      suggestions.value = res.suggestions
      showSuggest.value = true
    } catch {
      suggestions.value = []
      showSuggest.value = false
    }
  }, 250)
}

function closeSuggest(): void {
  showSuggest.value = false
}

/** 点联想词直接进结果页（等价于补全输入并提交） */
function pickSuggestion(text: string): void {
  showSuggest.value = false
  submitWord(text)
}

async function loadHot(): Promise<void> {
  try {
    hotList.value = await searchApi.hotWords()
  } catch {
    hotList.value = FALLBACK_HOT
  }
}

function loadHistory(): void {
  history.value = readSearchHistory()
}

onMounted(() => {
  loadHistory()
  void loadHot()
})
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
.se-input-wrap {
  position: relative;
  flex: 1;
}
.se-input {
  width: 100%;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--color-primary);
  border-radius: 17px;
  font-size: 14px;
}
.se-suggest {
  position: absolute;
  top: 38px;
  left: 0;
  right: 0;
  z-index: 30;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: var(--color-surface-white);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.se-suggest-empty {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--color-text-tertiary);
}
.se-suggest-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
}
.se-suggest-item:active {
  background: #fff5ef;
}
.se-suggest-text {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-primary);
}
.se-suggest-source {
  font-size: 10px;
  color: var(--color-text-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  padding: 0 4px;
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
