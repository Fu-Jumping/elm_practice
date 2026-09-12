<script setup lang="ts">
/**
 * 会员权益页（批次⑥ TODO-USER-006，契约 §3.8 / PRD 7.16.1「会员权益页」两行）
 * 视觉真源：docs/design/exports/用户端/10-个人中心/03-会员权益/（390 宽）
 * - 顶部栏：返回 + 标题「会员权益」（56px、1px 底边线、标题 18px）
 * - 会员状态卡：暖色渐变（#fff3e0 → #ffe0b2 → #ffcc80）+ 1px 描边 #e4beb3、半径 8px、padding 15px；
 *   会员名 + 「当前状态：已开通/未开通」+ 折扣说明 + 续费按钮
 * - 核心权益三项（专享红包 / 免配送费 / 会员价）：点击展开本地说明，不请求接口（PRD 871 行）
 *
 * 口径与替换（均按 PRD 明示条款执行，已提请负责人复核）：
 * - 页面名「饿了么超级会员」→「轻量外卖超级会员」：不出现第三方品牌字样（与批次⑩ 105 的应用标题
 *   口径一致：设计稿英文/第三方名不作真源）
 * - 权益项按 PRD 871 行「专享红包、免配送费、会员价」固定课程文案；设计稿的「积分加速」「吃货豆」
 *   不实现（PRD：本期不建积分体系、不展示积分余额或兑换入口）
 * - 「有效期至」不渲染：契约 §3.8 会员对象无有效期字段，不得用设计稿旧日期（2024-12-31）冒充数据
 * - 续费按钮：PRD 871 行要求「只给演示反馈并明确提示为演示操作，不产生任何订单或状态变化」，
 *   本页点击仅 toast 演示提示、不调用任何接口（契约不提供开通/续费接口）
 *   ⚠️ 口径冲突提请复核：TC-MBR-005 写「页面不出现开通/续费入口」，与本行 PRD 表述冲突（详见 raw 留痕）
 * - 会员状态读取失败 → 显示暂无权益（PRD 871 行降级）；未登录 → 跳登录并带 redirect（PRD 870 行）
 */
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { memberApi } from '@/services/api'
import { useSessionStore } from '@/stores/sessionStore'
import { toast } from '@/utils/toast'
import type { MemberInfo } from '@/services/api/types'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()

const member = ref<MemberInfo | null>(null)
const failed = ref(false)
/** 当前展开的权益项（本地说明，按需展开；不请求接口） */
const expanded = ref('')

interface BenefitDef {
  key: string
  label: string
  detail: string
}

/** 权益项与说明为固定课程文案（PRD 871 行：权益项为固定课程说明文案） */
const benefits: BenefitDef[] = [
  { key: 'coupon', label: '专享红包', detail: '每月专享大额红包' },
  { key: 'delivery', label: '免配送费', detail: '无限次免配送费特权' },
  { key: 'member-price', label: '会员价', detail: '会员商品按会员价计价（与会员折扣不叠加）' },
]

function toggleBenefit(key: string): void {
  expanded.value = expanded.value === key ? '' : key
}

/** 会员折扣说明（接口 discountDesc 优先，缺失时按折扣率推文案，避免空值上屏） */
function discountText(info: MemberInfo): string {
  if (info.discountDesc) return info.discountDesc
  if (!info.memberOpened) return '开通后可享会员权益'
  return `会员商品 ${Math.round(info.discountRate * 100) / 10} 折`
}

onMounted(async () => {
  if (!sessionStore.isLoggedIn) {
    await sessionStore.checkLogin()
    if (!sessionStore.isLoggedIn) {
      void router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return
    }
  }
  try {
    member.value = await memberApi.getMember()
  } catch {
    // 会员状态读取失败显示暂无权益（PRD 871 行异常列）
    failed.value = true
  }
})

/**
 * 续费：本期不提供开通与续费能力，只给演示反馈（PRD 871 行）
 * 刻意不调用任何接口——本页只有只读查询，出现写调用即为越界
 */
function renew(): void {
  toast('权益已生效（演示操作，不产生任何订单或状态变化）')
}

function goBack(): void {
  if (window.history.length > 1) router.back()
  else void router.replace({ name: 'mine' })
}
</script>

<template>
  <div class="member-page" data-testid="member-page">
    <header class="mb-header">
      <button class="mb-back" type="button" aria-label="返回" @click="goBack">
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
      <span class="mb-title">会员权益</span>
      <span class="mb-header-slot" />
    </header>

    <main class="mb-main">
      <section v-if="member" class="mb-hero" data-testid="member-hero">
        <p class="mb-hero-name">轻量外卖超级会员</p>
        <p class="mb-hero-status" data-testid="member-status">
          当前状态：{{ member.memberOpened ? '已开通' : '未开通' }}
        </p>
        <p class="mb-hero-desc">{{ discountText(member) }}</p>
        <button class="mb-renew" type="button" data-testid="member-renew-btn" @click="renew">
          立即续费
        </button>
      </section>

      <section v-else class="mb-fallback" data-testid="member-fallback">
        <p class="mb-fallback-title">暂无权益</p>
        <p class="mb-fallback-desc">会员状态读取失败，请稍后再试</p>
      </section>

      <h2 class="mb-heading">核心权益</h2>
      <section class="mb-benefits">
        <button
          v-for="benefit in benefits"
          :key="benefit.key"
          class="mb-benefit"
          type="button"
          data-testid="benefit-item"
          :aria-expanded="expanded === benefit.key"
          @click="toggleBenefit(benefit.key)"
        >
          <span class="mb-benefit-label">{{ benefit.label }}</span>
          <span class="mb-benefit-arrow" aria-hidden="true">›</span>
          <span v-if="expanded === benefit.key" class="mb-benefit-detail" data-testid="benefit-detail">
            {{ benefit.detail }}
          </span>
        </button>
      </section>

      <h2 class="mb-heading">权益详情</h2>
      <section class="mb-details">
        <p v-for="benefit in benefits" :key="benefit.key" class="mb-detail-row">
          {{ benefit.detail }}
        </p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.member-page {
  min-height: 100vh;
  background: #f9f9f9;
}

/* 顶部栏（设计稿：白底 56px、1px 底边线、标题 18px） */
.mb-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 12px;
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
}

.mb-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 12px;
  background: none;
  color: #1a1c1c;
}

.mb-back svg {
  width: 20px;
  height: 20px;
}

.mb-title {
  font-size: 18px;
  font-weight: 500;
  line-height: 24px;
  color: #1a1c1c;
}

.mb-header-slot {
  width: 32px;
}

/* 内容区（设计稿：padding 12px、卡间距 12px） */
.mb-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

/* 会员状态卡（设计稿：暖色渐变 + 1px 描边 #e4beb3 + 半径 8px + padding 15px） */
.mb-hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 15px;
  border: 1px solid #e4beb3;
  border-radius: 8px;
  background-image: linear-gradient(100.93deg, #fff3e0 -23.82%, #ffe0b2 50%, #ffcc80 123.82%);
}

.mb-hero-name {
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
  color: #5b4038;
}

.mb-hero-status {
  margin-top: 4px;
  font-size: 14px;
  line-height: 20px;
  color: #8d6e63;
}

.mb-hero-desc {
  margin-top: 2px;
  font-size: 12px;
  line-height: 16px;
  color: #8d6e63;
}

/* 续费按钮：按设计系统口径用品牌橙实心（设计稿的 #ff5a1f→#ae3200 渐变含深色锚点，不直接用作主色） */
.mb-renew {
  margin-top: 12px;
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  background: #ff5a1f;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.mb-fallback {
  padding: 24px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fff;
}

.mb-fallback-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1c1c;
}

.mb-fallback-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}

.mb-heading {
  padding-left: 12px;
  font-size: 18px;
  font-weight: 500;
  line-height: 24px;
  color: #1a1c1c;
}

.mb-benefits,
.mb-details {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  background: #fff;
}

.mb-benefit {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 14px 12px;
  border: none;
  border-bottom: 1px solid #f0f0f0;
  background: none;
  text-align: left;
}

.mb-benefit:last-child {
  border-bottom: none;
}

.mb-benefit-label {
  font-size: 14px;
  color: #1a1c1c;
}

.mb-benefit-arrow {
  margin-left: auto;
  font-size: 18px;
  color: #999;
}

.mb-benefit-detail {
  flex-basis: 100%;
  padding-top: 6px;
  font-size: 12px;
  line-height: 16px;
  color: #666;
}

.mb-detail-row {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #666;
}

.mb-detail-row:last-child {
  border-bottom: none;
}
</style>
