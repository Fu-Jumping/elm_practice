<script setup lang="ts">
/**
 * 评价订单页 —— 批次⑩ TODO-USER-003（2026-09-11）
 * 设计真源：`docs/design/exports/用户端/08-评价/01-评价订单/`
 * 口径出处：PRD 7.7（星级 1-5 / 标签多选 / 文字 / 图片可选；同一订单只允许评价一次；提交后订单变为已完成）
 * + PRD 7.16.1 评价订单页三行（顶部栏、评价内容区、提交按钮）+ 契约 §6.2（POST /orders/{orderId}/review 与错误码）
 * 关键口径：
 * - 进入时校验：订单不存在/未完成/已评价 → 提示原因并返回订单列表（PRD 异常列）
 * - 星级默认未选、提交按钮默认不可提交；点提交先做表单检查再请求接口；请求中禁用；成功回订单列表；
 *   失败保留表单并允许重试（PRD 提交按钮行）
 * - 图片为可选字段：本批按设计稿渲染「添加图片」占位（上传属 TODO-USER-007，依赖契约 §10.1），点击给出批次⑧提示
 * - 标签取自设计稿（配送快/味道好/包装完整/分量足）；正文上限 200 字为课程口径（文档未定，前端 maxlength 与 mock 校验同值）
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { orderApi, reviewApi } from '@/services/api'
import { normalizeOrderDetail } from '@/services/normalizers'
import { useCatalogStore } from '@/stores/catalogStore'
import { toast } from '@/utils/toast'
import type { OrderDetail } from '@/services/api/types'

const route = useRoute()
const router = useRouter()
const catalogStore = useCatalogStore()

const orderId = typeof route.params.orderId === 'string' ? route.params.orderId : ''
const order = ref<OrderDetail | null>(null)
const blockTip = ref('')
const rating = ref(0)
const content = ref('')
const pickedTags = ref<string[]>([])
const submitting = ref(false)
const ratingTip = ref('')
const errorTip = ref('')

/** 评价标签（设计稿 08-评价/01-评价订单 四枚） */
const REVIEW_TAGS = ['配送快', '味道好', '包装完整', '分量足'] as const
/** 星级文案（设计稿给出五星「非常好」；其余档位为展示补充） */
const RATING_LABELS: Record<number, string> = { 1: '非常差', 2: '较差', 3: '一般', 4: '好', 5: '非常好' }
const MAX_CONTENT_LENGTH = 200

const storeName = computed(() => catalogStore.storeDetail?.name ?? order.value?.storeId ?? '')
const ratingLabel = computed(() => (rating.value > 0 ? RATING_LABELS[rating.value] ?? '' : ''))
const canSubmit = computed(() => rating.value > 0 && !submitting.value)

function blockAndBack(reason: string): void {
  blockTip.value = reason
  window.setTimeout(() => void router.replace({ name: 'orders' }), 400)
}

onMounted(async () => {
  if (!orderId) {
    blockAndBack('订单编号缺失，即将返回订单列表…')
    return
  }
  try {
    const record = await orderApi.getOrder(orderId)
    order.value = normalizeOrderDetail(record)
    void catalogStore.fetchStoreDetail(order.value.storeId).catch(() => undefined)
    if (order.value.status !== 'COMPLETED') {
      blockAndBack('订单未完成，暂不能评价，即将返回订单列表…')
      return
    }
    if (order.value.reviewed) {
      blockAndBack('该订单已评价，即将返回订单列表…')
    }
  } catch {
    blockAndBack('订单不存在或已删除，即将返回订单列表…')
  }
})

function pickRating(value: number): void {
  rating.value = value
  ratingTip.value = ''
}

function toggleTag(tag: string): void {
  const index = pickedTags.value.indexOf(tag)
  if (index >= 0) pickedTags.value.splice(index, 1)
  else pickedTags.value.push(tag)
}

/** 图片上传属 TODO-USER-007（批次⑧，依赖契约 §10.1）：本批仅占位提示 */
function onAddImage(): void {
  toast('图片上传将随批次⑧接入')
}

async function onSubmit(): Promise<void> {
  if (submitting.value) return
  if (!canSubmit.value) {
    ratingTip.value = '请先选择星级'
    return
  }
  submitting.value = true
  ratingTip.value = ''
  errorTip.value = ''
  try {
    // 未选图片时不传 images 字段（图片为可选字段，契约 §6.2）
    await reviewApi.submitReview(orderId, {
      rating: rating.value,
      content: content.value,
      tags: [...pickedTags.value],
    })
    toast('评价成功')
    void router.replace({ name: 'orders' })
  } catch (err) {
    // 失败保留表单并允许重试（PRD 提交按钮行）
    errorTip.value = err instanceof Error ? err.message : '评价提交失败，请重试'
  } finally {
    submitting.value = false
  }
}

function goBack(): void {
  void router.push({ name: 'orders' })
}
</script>

<template>
  <div class="review-page">
    <div v-if="blockTip" class="rv-block" data-testid="review-block-tip">{{ blockTip }}</div>

    <template v-else-if="order">
      <div data-testid="review-order">
        <header class="rv-appbar">
          <button class="rv-back" type="button" aria-label="返回" data-testid="back-btn" @click="goBack">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 4.5L7.5 12L15 19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
          <p class="rv-appbar-title">评价订单</p>
        </header>

        <main class="rv-main">
          <!-- 商家与打分区 -->
          <section class="rv-card rv-merchant">
            <span class="rv-merchant-badge" aria-hidden="true">{{ storeName.slice(0, 1) }}</span>
            <p class="rv-store-name">{{ storeName }}</p>
            <p class="rv-score-tip">为本次服务打分</p>
            <div class="rv-stars">
              <button
                v-for="star in 5"
                :key="star"
                class="rv-star"
                :class="{ 'is-active': star <= rating }"
                type="button"
                :aria-label="`${star} 星`"
                :aria-pressed="star <= rating ? 'true' : 'false'"
                data-testid="star-btn"
                @click="pickRating(star)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"
                    :fill="star <= rating ? 'currentColor' : 'none'"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>
            <p class="rv-rating-label" data-testid="rating-label">{{ ratingLabel }}</p>
            <p v-if="ratingTip" class="rv-tip" data-testid="rating-tip">{{ ratingTip }}</p>
          </section>

          <!-- 已购商品（订单快照） -->
          <section class="rv-card rv-items">
            <div v-for="item in order.items" :key="item.productId" class="rv-item" data-testid="review-item">
              <span class="rv-item-thumb" aria-hidden="true" />
              <span class="rv-item-name">{{ item.name }}</span>
              <span class="rv-item-qty">x{{ item.quantity }}</span>
            </div>
          </section>

          <!-- 评价标签（多选） -->
          <section class="rv-card">
            <p class="rv-section-title">评价标签</p>
            <div class="rv-tags">
              <button
                v-for="tag in REVIEW_TAGS"
                :key="tag"
                class="rv-tag"
                :class="{ 'is-active': pickedTags.includes(tag) }"
                type="button"
                :aria-pressed="pickedTags.includes(tag) ? 'true' : 'false'"
                data-testid="review-tag"
                @click="toggleTag(tag)"
              >
                {{ tag }}
              </button>
            </div>
          </section>

          <!-- 文字与图片 -->
          <section class="rv-card rv-comment">
            <textarea
              v-model="content"
              class="rv-textarea"
              data-testid="review-content"
              :maxlength="MAX_CONTENT_LENGTH"
              placeholder="说说本次用餐体验，分享给更多想吃的朋友吧"
            />
            <button class="rv-add-image" type="button" data-testid="add-image" @click="onAddImage">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.4" />
                <circle cx="9" cy="10.5" r="1.6" fill="currentColor" />
                <path d="M5 17l4.5-4.5 3 3 3-2.5L19 17" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
              </svg>
              <span>添加图片</span>
            </button>
            <p class="rv-image-hint">图片可选，最多 3 张（上传随批次⑧接入）</p>
          </section>

          <p v-if="errorTip" class="rv-error" data-testid="review-error-tip" role="alert">{{ errorTip }}</p>
        </main>
      </div>

      <footer class="rv-footer">
        <button
          class="rv-submit"
          :class="{ 'is-disabled': !canSubmit }"
          type="button"
          data-testid="submit-review-btn"
          :aria-disabled="canSubmit ? 'false' : 'true'"
          :disabled="submitting"
          @click="onSubmit"
        >
          {{ submitting ? '提交中…' : '提交评价' }}
        </button>
      </footer>
    </template>

    <p v-else class="rv-block">评价信息加载中…</p>
  </div>
</template>

<style scoped>
.review-page {
  min-height: 100vh;
  /* 设计稿 .frame5：页面底色 #f7f7f7 + 底部为固定提交栏预留 */
  padding-bottom: 84px;
  background: #f7f7f7;
}

.rv-appbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  background: #f7f7f7;
}

.rv-back {
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  padding: 0;
  color: var(--color-primary);
}

.rv-back svg {
  width: 18px;
  height: 18px;
}

.rv-appbar-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
  color: var(--color-primary);
}

.rv-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 12px 12px;
}

.rv-card {
  padding: 16px;
  border-radius: 8px;
  background: #ffffff;
}

.rv-merchant {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rv-merchant-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 12px;
  border-radius: 12px;
  background: #1f1f1f;
  font-size: 26px;
  font-weight: 600;
  color: #ffffff;
}

.rv-store-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 26px;
  color: #1a1c1c;
}

.rv-score-tip {
  margin: 4px 0 12px;
  font-size: 13px;
  line-height: 20px;
  color: #666666;
}

.rv-stars {
  display: flex;
  gap: 10px;
}

.rv-star {
  border: none;
  background: none;
  padding: 0;
  color: #e5e5e5;
}

.rv-star.is-active {
  color: var(--color-primary);
}

.rv-star svg {
  width: 32px;
  height: 32px;
}

.rv-rating-label {
  margin: 8px 0 0;
  min-height: 20px;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: var(--color-primary);
}

.rv-tip {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: #999999;
}

.rv-items {
  display: flex;
  gap: 12px;
  overflow-x: auto;
}

.rv-item {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 96px;
}

.rv-item-thumb {
  width: 96px;
  height: 68px;
  border-radius: 8px;
  /* 商品图占位（接口 image 缺失时保持设计稿尺寸） */
  background: #f6f7f9;
}

.rv-item-name {
  margin-top: 6px;
  font-size: 13px;
  line-height: 18px;
  color: #1a1c1c;
}

.rv-item-qty {
  font-size: 12px;
  line-height: 18px;
  color: var(--color-primary);
}

.rv-section-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 500;
  line-height: 22px;
  color: #1a1c1c;
}

.rv-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.rv-tag {
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background: #ffffff;
  padding: 7px 14px;
  font-size: 13px;
  line-height: 20px;
  color: #1a1c1c;
}

.rv-tag.is-active {
  border-color: var(--color-primary);
  background: #ffdbd0;
  color: var(--color-primary);
}

.rv-comment {
  display: flex;
  flex-direction: column;
}

.rv-textarea {
  width: 100%;
  min-height: 120px;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 14px;
  line-height: 22px;
  color: #1a1c1c;
  resize: none;
}

.rv-textarea::placeholder {
  color: #999999;
}

.rv-add-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 88px;
  height: 88px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  background: #ffffff;
  font-size: 12px;
  line-height: 18px;
  color: #999999;
}

.rv-add-image svg {
  width: 24px;
  height: 24px;
}

.rv-image-hint {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: #999999;
}

.rv-error {
  margin: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--color-error);
}

/* 底部固定提交栏（设计稿 .footerStickyPrimaryB） */
.rv-footer {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  padding: 12px;
  border-top: 1px solid #e5e5e5;
  background: #ffffff;
}

.rv-submit {
  width: 100%;
  border: none;
  border-radius: 4px;
  background: var(--color-primary);
  padding: 13px 16px;
  font-size: 16px;
  font-weight: 500;
  line-height: 20px;
  color: #ffffff;
}

/* 未选星级时置灰但仍可点击 → 点击给出必填提示 */
.rv-submit.is-disabled {
  background: #ffd2c2;
}

.rv-submit:disabled {
  opacity: 0.6;
}

.rv-block {
  padding: 40px 12px;
  text-align: center;
  font-size: 14px;
  color: #999999;
}
</style>
