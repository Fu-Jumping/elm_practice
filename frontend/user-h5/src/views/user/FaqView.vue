<script setup lang="ts">
/**
 * 常见问题页（PRD 7.16.1「常见问题页-顶部栏 / 常见问题解答区」两行，设置与 FAQ P2 的问答页）
 * 视觉真源：docs/design/exports/用户端/09-消息与客服/04-常见问题/（390 宽）
 * - 顶部栏：返回 + 标题「常见问题」（56px、1px 底边线）
 * - 解答区：标题「常见问题解答」+ 说明文字 + 5 条折叠项，**默认全部收起**，
 *   点击仅本地展开/收起，不发请求（PRD 字段列：不来自接口、不随用户或订单数据变化）
 * - 底部「联系在线客服」为不可交互占位：平台客服已移出项目范围（PRD 交互列），点击提示「暂未开放」
 * - 整页静态帮助内容，不请求业务接口；未登录可浏览
 * 品牌口径：设计稿标题色 #ae3200 按设计系统「primary 令牌不直接用作界面主色」改用品牌橙 #ff5a1f
 * （与 OrderPayView / MemberView 同一处理）；第三方品牌名不出现在本工程
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from '@/utils/toast'

const router = useRouter()

/**
 * 静态问答内容（PRD 870 行字段列：前端固定文案）
 * 文案取自设计稿 04-常见问题/code.html；按 PRD「静态帮助口径展示，不代表已实现能力」，
 * 内容不随本项目实现范围改写（平台客服不参与，仅底部按钮按占位处理）。
 */
const FAQ_ITEMS: ReadonlyArray<{ key: string; question: string; answer: string }> = [
  {
    key: 'address',
    question: '如何修改收货地址?',
    answer:
      '您可以在提交订单前修改收货地址。如果是已经提交但商家尚未接单的订单，您可以尝试取消订单后重新下单并选择正确的地址。如果商家已经接单，建议您尽快通过订单页面的联系方式联系商家协商修改送餐地址。',
  },
  {
    key: 'coupon',
    question: '优惠券如何使用?',
    answer:
      '在结算页面，系统会自动为您推荐并选中当前可用的最大面额优惠券。如果您想使用其他优惠券，可以点击“红包/抵用券”选项进入选择页面手动勾选。请注意，部分优惠券可能存在使用门槛或特定商家/商品限制。',
  },
  {
    key: 'refund',
    question: '如何申请退款?',
    answer:
      '对于未接单的订单，您可以直接在订单详情页点击“取消订单”自动退款。若商家已接单，需点击“申请退款”，填写退款原因后提交，等待商家审核。若商家拒绝退款，您可以申请客服介入处理。',
  },
  {
    key: 'delivery',
    question: '配送超时怎么办?',
    answer:
      '如果您购买了“准时达”或“超时赔”服务，超出承诺时间后，系统会自动向您的账户发放赔付红包。如果没有购买相关服务，您可以在订单页催单，或直接联系骑手了解配送进度。严重超时也可申请退款。',
  },
  {
    key: 'contact',
    question: '如何联系客服?',
    answer:
      '您可以在 APP“我的”页面找到客服入口，点击进入后可以查看更多自助服务，或输入“人工客服”直接与人工客服建立连接。您也可以在具体订单详情页中找到联系客服的入口。',
  },
]

/** 展开项（空集合 = 全部收起，PRD：默认全部收起） */
const expandedKeys = ref<string[]>([])

function isExpanded(key: string): boolean {
  return expandedKeys.value.includes(key)
}

/** 点击条目仅本地展开/收起，不发请求（PRD 交互列） */
function toggle(key: string): void {
  expandedKeys.value = isExpanded(key)
    ? expandedKeys.value.filter((item) => item !== key)
    : [...expandedKeys.value, key]
}

/** 联系在线客服：不可交互占位（PRD：平台客服已移出项目范围，点击提示暂未开放） */
function onContactSupport(): void {
  toast('暂未开放')
}

function goBack(): void {
  if (window.history.length > 1) router.back()
  else void router.replace({ name: 'mine' })
}
</script>

<template>
  <div class="faq-page" data-testid="faq-page">
    <header class="faq-header" data-testid="faq-header">
      <button class="faq-back" type="button" aria-label="返回" data-testid="faq-back" @click="goBack">
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
      <span class="faq-title">常见问题</span>
      <span class="faq-header-slot" />
    </header>

    <main class="faq-main">
      <section class="faq-intro">
        <p class="faq-intro-title">常见问题解答</p>
        <p class="faq-intro-desc">
          请查看以下常见问题，如果您的问题没有得到解决，可以联系在线客服。
        </p>
      </section>

      <section class="faq-accordion" data-testid="faq-accordion">
        <div
          v-for="(item, index) in FAQ_ITEMS"
          :key="item.key"
          class="faq-item"
          :class="{ 'faq-item--last': index === FAQ_ITEMS.length - 1 }"
        >
          <button
            class="faq-question"
            type="button"
            :data-testid="`faq-item-${item.key}`"
            :aria-expanded="isExpanded(item.key) ? 'true' : 'false'"
            @click="toggle(item.key)"
          >
            <span class="faq-question-text">{{ item.question }}</span>
            <svg
              class="faq-caret"
              :class="{ 'is-expanded': isExpanded(item.key) }"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M6 9.5L12 15.5L18 9.5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <p
            v-if="isExpanded(item.key)"
            class="faq-answer"
            :data-testid="`faq-answer-${item.key}`"
          >
            {{ item.answer }}
          </p>
        </div>
      </section>

      <section class="faq-cta">
        <p class="faq-cta-text">没有找到您的问题？</p>
        <button
          class="faq-contact"
          type="button"
          data-testid="faq-contact-support"
          @click="onContactSupport"
        >
          <svg class="faq-contact-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 5.5h16v11H9.5L5.5 20v-3.5H4v-11Z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
          </svg>
          <span>联系在线客服</span>
        </button>
      </section>
    </main>
  </div>
</template>

<style scoped>
/* 复刻约定 2.4：设计稿无浏览器默认 margin，页面作用域内重置 */
.faq-page p {
  margin: 0;
}
.faq-page button {
  font-family: inherit;
}

.faq-page {
  min-height: 100vh;
  background: #f9f9f9;
  /* 底部导航由 MainLayout 渲染，避免内容被遮挡 */
  padding-bottom: 84px;
}

/* 顶部栏（设计稿 .headerTopAppBar：56px、1px 底边线、页面底色） */
.faq-header {
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

.faq-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: #1a1c1c;
}

.faq-back svg {
  width: 20px;
  height: 20px;
}

/* 设计稿 .text6：20px/28、品牌强调色（原 #ae3200 按设计系统换品牌橙） */
.faq-title {
  font-size: 20px;
  font-weight: 500;
  line-height: 28px;
  color: #ff5a1f;
}

.faq-header-slot {
  width: 32px;
}

/* 内容区（设计稿 .mainContent：padding 24px 12px、row-gap 24px） */
.faq-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px 12px;
}

.faq-intro {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 设计稿 .text：18px/24、#1a1c1c */
.faq-intro-title {
  font-size: 18px;
  font-weight: 500;
  line-height: 24px;
  color: #1a1c1c;
}

/* 设计稿 .text2：16px/24、#666666 */
.faq-intro-desc {
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  color: #666666;
}

/* 折叠列表外壳（设计稿 .fAqAccordion：1px #e5e5e5、8px 圆角、浅阴影、白底、overflow hidden） */
.faq-accordion {
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  box-shadow: 0 1px 2px #0000000d;
  background: #ffffff;
  overflow: hidden;
}

.faq-item {
  border-bottom: 1px solid #e5e5e5;
}

/* 设计稿 .question5Button：末条无下边线 */
.faq-item--last {
  border-bottom: none;
}

.faq-question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
}

/* 设计稿 .text3：16px/22、#1a1c1c */
.faq-question-text {
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  color: #1a1c1c;
}

/* 展开指示：设计稿为 12×7 的下箭头图标，展开时翻转 */
.faq-caret {
  flex: none;
  width: 12px;
  height: 12px;
  color: #999999;
  transition: transform 0.2s ease;
}

.faq-caret.is-expanded {
  transform: rotate(180deg);
}

/* 答案为设计稿外的展开内容（设计稿导出为全部收起态）：同卡片内缩进 + 次要色 */
.faq-answer {
  padding: 0 16px 16px;
  font-size: 14px;
  line-height: 22px;
  color: #666666;
}

/* 底部 CTA（设计稿 .contactSupportCta：居中、padding-top 8px） */
.faq-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 8px;
}

/* 设计稿 .text4：16px/24、#666666、下 16px */
.faq-cta-text {
  padding-bottom: 16px;
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  color: #666666;
}

/* 设计稿 .button2：品牌橙实心、4px 圆角、padding 12px 24px、图标+文案居中 */
.faq-contact {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  background: #ff5a1f;
  color: #ffffff;
  font-size: 16px;
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;
}

.faq-contact-icon {
  flex: none;
  width: 20px;
  height: 18px;
}
</style>
