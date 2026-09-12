<script setup lang="ts">
/**
 * 红包页（批次⑥/CHG-001 TODO-USER-028，契约 §3.8 + §3.10、PRD 7.16.1 红包页三行）
 * 视觉真源：docs/design/exports/用户端/11-天天必爆/01-红包页/（含 CHG-001 新增两区）
 *
 * 结构（自上而下，与设计稿一致）：
 * 1. 顶部红金渐变头（110px 渐变条）：返回 +「天天红包」（PRD 878 行：标题按设计稿）+ 右上占位说明入口
 * 2. 加量红包通栏（白底卡）：图标 +「加量红包省更多」+ 徽标「立省￥20起」+「多买多省 · 可与优惠券叠加」
 *    +「去购买 ›」→ 打开买红包浮窗（契约 §3.10 买套餐）
 * 3. 天天必爆活动卡（红金渐变，CHG-001 视觉例外）：标题 +「18.8」+「下单更省」+ 4 个奖池档位预览
 *    +「免费爆1次」主按钮 → 进入爆红包过渡态（TODO-USER-029 实现，本页先接线占位提示）
 * 4. 可用红包列表：真实券来自 `GET /me/coupons`（金额/门槛/范围/到期文案一律按接口返回展示，
 *    过期券灰化且不可选）；其后附 2 张**纯展示占位券**（品类券与「限非外卖配送」券，不入库、不可用，
 *    契约 §10.5 第 8 条 / TC-RBP-012）
 * 5. 「没有更多可用红包了」列表尾注 + 底部导航（MainLayout 按 meta.tab 渲染；TabBar 将本页归属「我的」）
 *
 * 口径说明（提请复核）：
 * - 「免费爆1次」的可爆性与免费次数：契约未提供「今日免费次数是否可用」的查询字段/接口，
 *   前端只能按「列表内是否存在 canBlast 券」判断「有无可爆券」，免费次数用尽由爆接口 409 告知
 *   （TODO-USER-029 处理）。此缺口已登记待办阻塞区，提请后端确认是否补查询字段。
 * - 设计稿顶栏的三点菜单在 PRD 无逐区行与交互定义，按仓库既有占位约定给「暂未开放」提示，不臆造流程。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { couponApi, storeApi } from '@/services/api'
import BlastOverlay from '@/components/BlastOverlay.vue'
import { couponExpiryText, formatMoneyCompact } from '@/services/normalizers'
import { useSessionStore } from '@/stores/sessionStore'
import { toast } from '@/utils/toast'
import type { CouponPackKey, CouponRecord } from '@/services/api/types'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()

const coupons = ref<CouponRecord[]>([])
const loading = ref(true)
const failed = ref(false)
/** 店铺名映射（scope=STORE 的券说明需要「限{店名}可用」；接口只给 storeId） */
const storeNames = ref<Record<string, string>>({})

/** 纯展示占位券（契约 §10.5 第 8 条：品类券与「限非外卖配送」券不入库、接口不返回、不可选用） */
const PLACEHOLDER_COUPONS = [
  {
    key: 'off-delivery',
    scope: '全平台',
    name: '通用红包',
    note: '限非外卖配送订单使用',
    amount: 8,
    threshold: 30,
    expiry: '今天 23:59 到期',
  },
  {
    key: 'category',
    scope: '品类',
    name: '下午茶狂欢红包',
    note: '限奶茶、甜品品类可用',
    amount: 12,
    threshold: 50,
    expiry: '还剩 5 天',
  },
]

/** 买红包浮窗（契约 §3.10 买套餐） */
const sheetOpen = ref(false)
const selectedPack = ref<CouponPackKey>('pack49')
const buying = ref(false)

/** 今日免费爆次数已用尽且无可爆券时，主按钮改为引导购买（PRD 878 行空态口径） */
const noBlastAvailable = ref(false)
const hasBlastable = computed(() => coupons.value.some((item) => item.canBlast))

const PACKS: Array<{ key: CouponPackKey; price: string; count: string; desc: string }> = [
  { key: 'pack49', price: '¥4.9', count: '4 张红包', desc: '3×满30减5 + 1×无门槛减5' },
  { key: 'pack99', price: '¥9.9', count: '8 张红包', desc: '6×满30减5 + 1×满40减10 + 1×无门槛减5' },
]

async function loadCoupons(): Promise<void> {
  loading.value = true
  failed.value = false
  try {
    coupons.value = await couponApi.listCoupons()
    void loadStoreNames()
  } catch {
    // 接口失败保留已展示结果并提供重试（PRD 878 行异常列）
    failed.value = true
  } finally {
    loading.value = false
  }
}

/** 店铺名映射（仅 scope=STORE 的券需要；失败时该行隐藏，不用演示值补齐） */
async function loadStoreNames(): Promise<void> {
  const storeIds = [...new Set(coupons.value.filter((item) => item.scope === 'STORE' && item.storeId).map((item) => item.storeId!))]
  if (storeIds.length === 0) return
  try {
    const stores = await storeApi.getStoreList()
    const map: Record<string, string> = {}
    for (const store of stores) map[store.storeId] = store.name
    storeNames.value = map
  } catch {
    storeNames.value = {}
  }
}

onMounted(async () => {
  if (!sessionStore.isLoggedIn) {
    await sessionStore.checkLogin()
    if (!sessionStore.isLoggedIn) {
      void router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return
    }
  }
  await loadCoupons()
})

/** 券卡适用范围说明：ALL → 全平台可用；STORE → 限{店名}可用（店名未知时隐藏该行） */
function scopeNote(coupon: CouponRecord): string {
  if (coupon.scope === 'ALL') return '全平台可用'
  const name = coupon.storeId ? storeNames.value[coupon.storeId] : ''
  return name ? `限${name}可用` : ''
}

function openSheet(): void {
  selectedPack.value = 'pack49'
  sheetOpen.value = true
}

function closeSheet(): void {
  if (buying.value) return
  sheetOpen.value = false
}

/** 确认购买：调接口生成对应张数并刷新列表（前端模拟付费，不落支付记录） */
async function confirmBuy(): Promise<void> {
  if (buying.value) return
  buying.value = true
  try {
    const purchase = await couponApi.buyPack(selectedPack.value)
    toast(`购买成功，已到账 ${purchase.coupons.length} 张红包`)
    sheetOpen.value = false
    await loadCoupons()
  } catch {
    // 失败原地提示并可重试（错误提示由 http 层统一 toast），浮窗不关闭
  } finally {
    buying.value = false
  }
}

/** 占位券点击：纯展示、不可选用（TC-RBP-012） */
function onPlaceholderClick(): void {
  toast('该红包为演示占位，本期不可用')
}

/** 爆红包浮层开关（TODO-USER-029） */
const blastOpen = ref(false)

/** 爆红包入口：无可爆且无免费次数时引导购买，否则打开浮层 */
function onBlast(): void {
  if (noBlastAvailable.value) {
    openSheet()
    return
  }
  blastOpen.value = true
}

/** 爆出成功后刷新券列表（新券进入列表） */
function onBlastDone(): void {
  void loadCoupons()
}

function goBack(): void {
  if (window.history.length > 1) router.back()
  else void router.replace({ name: 'mine' })
}
</script>

<template>
  <div class="coupon-page" data-testid="coupon-page">
    <!-- 顶部红金渐变头（设计稿：渐变条自顶部延伸，标题白色 20px） -->
    <header class="cp-header" data-testid="coupon-header">
      <button class="cp-back" type="button" aria-label="返回" @click="goBack">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 4.5L7.5 12L15 19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <span class="cp-title">天天红包</span>
      <button class="cp-more" type="button" aria-label="更多" @click="onPlaceholderClick">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="6" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="18" cy="12" r="1.6" fill="currentColor" />
        </svg>
      </button>
    </header>

    <main class="cp-main">
      <!-- 加量红包通栏（设计稿：白底半透明卡 +「去购买」） -->
      <section class="cp-promo" data-testid="promo-bar">
        <span class="cp-promo-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M4 8a2 2 0 012-2h12a2 2 0 012 2v1.5a2.5 2.5 0 000 5V16a2 2 0 01-2 2H6a2 2 0 01-2-2v-1.5a2.5 2.5 0 000-5z"
              fill="none"
              stroke="#ff5a1f"
              stroke-width="1.5"
            />
          </svg>
        </span>
        <div class="cp-promo-body">
          <p class="cp-promo-title-row">
            <span class="cp-promo-title">加量红包省更多</span>
            <span class="cp-promo-badge">立省￥20起</span>
          </p>
          <p class="cp-promo-sub">多买多省 · 可与优惠券叠加</p>
        </div>
        <button class="cp-promo-buy" type="button" data-testid="promo-buy-btn" @click="openSheet">
          去购买
          <span class="cp-promo-arrow" aria-hidden="true">›</span>
        </button>
      </section>

      <!-- 天天必爆活动卡（红金渐变，CHG-001 视觉例外） -->
      <section class="cp-blast" data-testid="blast-card">
        <p class="cp-blast-head">
          <span class="cp-blast-title">天天必爆</span>
          <span class="cp-blast-amount">18.8</span>
          <span class="cp-blast-title">下单更省</span>
        </p>
        <div class="cp-tiers">
          <div class="cp-tier" data-testid="blast-tier">
            <p class="cp-tier-amount"><span class="cp-tier-yen">¥</span>2</p>
            <p class="cp-tier-note">满30可用</p>
          </div>
          <div class="cp-tier" data-testid="blast-tier">
            <p class="cp-tier-amount"><span class="cp-tier-yen">¥</span>?</p>
            <p class="cp-tier-note">门槛随机</p>
          </div>
          <div class="cp-tier" data-testid="blast-tier">
            <p class="cp-tier-amount"><span class="cp-tier-yen">¥</span>18.8</p>
            <p class="cp-tier-note">门槛随机</p>
          </div>
          <div class="cp-tier cp-tier--gift" data-testid="blast-tier">
            <p class="cp-tier-amount">免单</p>
            <p class="cp-tier-note">惊喜好礼</p>
          </div>
        </div>
        <button class="cp-blast-btn" type="button" data-testid="blast-free-btn" @click="onBlast">
          {{ noBlastAvailable ? '去购买' : '免费爆1次' }}
        </button>
      </section>

      <p v-if="loading" class="cp-skeleton">红包加载中…</p>

      <template v-else>
        <!-- 真实券（来自 GET /me/coupons） -->
        <section
          v-for="coupon in coupons"
          :key="coupon.couponId"
          class="cp-card"
          data-testid="coupon-card"
          :data-expired="coupon.status === 'expired' ? 'true' : 'false'"
          @click="onPlaceholderClick"
        >
          <div class="cp-card-left">
            <p class="cp-card-amount" data-testid="coupon-amount">
              <span class="cp-card-yen">¥</span>{{ formatMoneyCompact(coupon.amount) }}
            </p>
            <p class="cp-card-threshold" data-testid="coupon-threshold">
              {{ coupon.threshold > 0 ? `满${formatMoneyCompact(coupon.threshold)}可用` : '无门槛' }}
            </p>
          </div>
          <div class="cp-card-right">
            <p class="cp-card-name-row">
              <span class="cp-card-scope" data-testid="coupon-scope">
                {{ coupon.scope === 'ALL' ? '全平台' : '商家' }}
              </span>
              <span class="cp-card-name">{{ coupon.name }}</span>
            </p>
            <p v-if="scopeNote(coupon)" class="cp-card-note" data-testid="coupon-note">
              {{ scopeNote(coupon) }}
            </p>
            <p class="cp-card-expiry" data-testid="coupon-expiry" :data-used="coupon.used ? 'true' : 'false'">
              {{ coupon.status === 'expired' ? '已失效' : couponExpiryText(coupon.validTo) }}
            </p>
          </div>
        </section>

        <!-- 纯展示占位券（品类券 /「限非外卖配送」券，不入库、不可点用） -->
        <section
          v-for="item in PLACEHOLDER_COUPONS"
          :key="item.key"
          class="cp-card cp-card--placeholder"
          data-testid="placeholder-coupon"
          @click="onPlaceholderClick"
        >
          <div class="cp-card-left">
            <p class="cp-card-amount"><span class="cp-card-yen">¥</span>{{ item.amount }}</p>
            <p class="cp-card-threshold">满{{ item.threshold }}可用</p>
          </div>
          <div class="cp-card-right">
            <p class="cp-card-name-row">
              <span class="cp-card-scope">{{ item.scope }}</span>
              <span class="cp-card-name">{{ item.name }}</span>
            </p>
            <p class="cp-card-note">{{ item.note }}</p>
            <p class="cp-card-expiry">{{ item.expiry }}</p>
          </div>
        </section>

        <p v-if="coupons.length === 0" class="cp-empty" data-testid="coupon-empty">暂无可用红包</p>
      </template>

      <p class="cp-list-end" data-testid="coupon-list-end">没有更多可用红包了</p>

      <p v-if="failed" class="cp-error" data-testid="coupon-error">
        红包加载失败
        <button class="cp-retry" type="button" @click="loadCoupons">重试</button>
      </p>
    </main>

    <!-- 爆红包全屏浮层（TODO-USER-029）：过渡态 → 结果卡 / 失败态 -->
    <BlastOverlay v-if="blastOpen" @close="blastOpen = false" @done="onBlastDone" />

    <!-- 买红包浮窗（40% 黑遮罩 + 底部白面板；两档套餐、无退款条款） -->
    <div v-if="sheetOpen" class="cp-mask" data-testid="buy-sheet" @click.self="closeSheet">
      <section class="cp-sheet">
        <header class="cp-sheet-head">
          <h2 class="cp-sheet-title">买红包</h2>
          <button class="cp-sheet-close" type="button" aria-label="关闭" @click="closeSheet">×</button>
        </header>
        <button
          v-for="pack in PACKS"
          :key="pack.key"
          class="cp-pack"
          type="button"
          data-testid="pack-option"
          :data-pack-key="pack.key"
          :aria-pressed="selectedPack === pack.key"
          @click="selectedPack = pack.key"
        >
          <span class="cp-pack-price">{{ pack.price }}</span>
          <span class="cp-pack-body">
            <span class="cp-pack-count">{{ pack.count }}</span>
            <span class="cp-pack-desc">{{ pack.desc }}</span>
          </span>
          <span class="cp-pack-check" :class="{ 'is-on': selectedPack === pack.key }">✓</span>
        </button>
        <p class="cp-sheet-note">
          模拟付费，仅用于课程演示：不产生真实资金流水、不落支付记录；购买券有效期 7 天
        </p>
        <div class="cp-sheet-actions">
          <button class="cp-sheet-cancel" type="button" data-testid="pack-cancel-btn" @click="closeSheet">
            再想想
          </button>
          <button
            class="cp-sheet-confirm"
            type="button"
            data-testid="pack-confirm-btn"
            :disabled="buying"
            @click="confirmBuy"
          >
            {{ buying ? '处理中…' : '确认购买' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* 红包模块为活动场景视觉例外，保留红金渐变（契约 §10.5 第 10 条） */
.coupon-page {
  min-height: 100vh;
  background: #f9f9f9;
  padding-bottom: 84px;
}

/* 顶部渐变头（设计稿：180deg 红金渐变自顶部向下淡出） */
.cp-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 110px;
  padding: 12px;
  background-image: linear-gradient(
    180deg,
    #e6002a 0%,
    #ff1e3b 25%,
    #ff4425 50%,
    #ff5a1f99 72%,
    #f8f9ff1a 90%,
    #f8f9ff00 100%
  );
}

.cp-back,
.cp-more {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: #fff;
}

.cp-back svg,
.cp-more svg {
  width: 22px;
  height: 22px;
}

.cp-title {
  font-size: 20px;
  font-weight: 500;
  line-height: 30px;
  letter-spacing: 0.5px;
  color: #fff;
}

.cp-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 12px 12px;
  /* 内容整体上浮，压在渐变头上（设计稿通栏 margin-top 为负） */
  margin-top: -38px;
}

/* 加量红包通栏 */
.cp-promo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(2px);
}

.cp-promo-icon svg {
  width: 20px;
  height: 19px;
}

.cp-promo-body {
  flex: 1;
  min-width: 0;
}

.cp-promo-title-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cp-promo-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1c1c;
}

/* 徽标（设计稿：10px 橙字 + 浅橙底） */
.cp-promo-badge {
  padding: 1px 4px;
  border-radius: 2px;
  background: rgba(255, 90, 31, 0.12);
  font-size: 10px;
  font-weight: 500;
  color: #ff5a1f;
}

.cp-promo-sub {
  margin-top: 2px;
  font-size: 12px;
  color: #666;
}

.cp-promo-buy {
  flex: none;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  border: 1px solid #ff5a1f;
  border-radius: 16px;
  background: #fff;
  color: #ff5a1f;
  font-size: 13px;
  font-weight: 600;
}

.cp-promo-arrow {
  font-size: 15px;
  line-height: 1;
}

/* 天天必爆活动卡（设计稿：红金渐变 16px 圆角 + 4 档奖池 + 白色主按钮） */
.cp-blast {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 12px 12px;
  border-radius: 16px;
  background-image: linear-gradient(160.04deg, #e60039 -0.06%, #ff1e36 27.97%, #ff5024 65.02%, #ff732e 100.06%);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}

.cp-blast-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.cp-blast-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.cp-blast-amount {
  font-size: 30px;
  font-weight: 700;
  color: #ffe08a;
}

.cp-tiers {
  display: flex;
  gap: 6px;
}

.cp-tier {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  background: #fff8ee;
}

.cp-tier-amount {
  font-size: 16px;
  font-weight: 700;
  color: #ff1e36;
}

.cp-tier-yen {
  font-size: 11px;
}

.cp-tier-note {
  font-size: 10px;
  color: #8d6e63;
}

.cp-tier--gift .cp-tier-amount {
  color: #b06a00;
}

.cp-blast-btn {
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: #fff;
  color: #e60039;
  font-size: 16px;
  font-weight: 700;
}

/* 红包卡（设计稿：橙色渐变 + 左侧金额区带分隔线） */
.cp-card {
  display: flex;
  align-items: stretch;
  border-radius: 8px;
  overflow: hidden;
  background-image: linear-gradient(90deg, #ff5a1f 0%, #ff7a45 100%);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
}

.cp-card--placeholder {
  opacity: 0.85;
}

.cp-card[data-expired='true'] {
  filter: grayscale(0.7);
  opacity: 0.6;
}

.cp-card-left {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 122px;
  border-right: 1px solid rgba(255, 234, 167, 0.4);
  padding: 12px 0;
}

.cp-card-amount {
  font-size: 26px;
  font-weight: 700;
  color: #fff;
}

.cp-card-yen {
  font-size: 14px;
}

.cp-card-threshold {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.cp-card-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
}

.cp-card-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cp-card-scope {
  flex: none;
  padding: 1px 5px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  font-size: 10px;
  font-weight: 500;
  color: #fff;
}

.cp-card-name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.cp-card-note {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
}

.cp-card-expiry {
  margin-top: auto;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
}

.cp-skeleton,
.cp-empty,
.cp-error {
  padding: 12px;
  font-size: 14px;
  color: #999;
}

.cp-retry {
  margin-left: 8px;
  border: none;
  background: none;
  color: #ff5a1f;
  font-size: 14px;
}

.cp-list-end {
  padding: 8px 0 4px;
  text-align: center;
  font-size: 12px;
  color: #999;
}

/* 买红包浮窗 */
.cp-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.4);
}

.cp-sheet {
  width: 100%;
  padding: 16px;
  border-radius: 8px 8px 0 0;
  background: #fff;
}

.cp-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cp-sheet-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1c1c;
}

.cp-sheet-close {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  font-size: 22px;
  line-height: 1;
  color: #999;
}

.cp-pack {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fff;
  text-align: left;
}

.cp-pack[aria-pressed='true'] {
  border-color: #ff5a1f;
  background: rgba(255, 90, 31, 0.04);
}

.cp-pack-price {
  flex: none;
  font-size: 20px;
  font-weight: 700;
  color: #ff5a1f;
}

.cp-pack-body {
  flex: 1;
  min-width: 0;
}

.cp-pack-count {
  display: block;
  font-size: 14px;
  color: #1a1c1c;
}

.cp-pack-desc {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: #666;
}

.cp-pack-check {
  flex: none;
  width: 18px;
  height: 18px;
  border: 1px solid #e5e5e5;
  border-radius: 50%;
  color: transparent;
  font-size: 12px;
  text-align: center;
  line-height: 18px;
}

.cp-pack-check.is-on {
  border-color: #ff5a1f;
  background: #ff5a1f;
  color: #fff;
}

.cp-sheet-note {
  margin-top: 12px;
  font-size: 12px;
  line-height: 16px;
  color: #999;
}

.cp-sheet-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.cp-sheet-cancel,
.cp-sheet-confirm {
  flex: 1;
  padding: 12px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
}

.cp-sheet-cancel {
  border: 1px solid #e5e5e5;
  background: #fff;
  color: #666;
}

.cp-sheet-confirm {
  border: none;
  background: #ff5a1f;
  color: #fff;
}

.cp-sheet-confirm:disabled {
  opacity: 0.5;
}
</style>
