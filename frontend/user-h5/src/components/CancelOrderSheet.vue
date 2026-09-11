<script setup lang="ts">
/**
 * 取消订单确认弹层 —— 批次⑩ TODO-USER-002（2026-09-11）
 * 设计真源：`docs/design/exports/用户端/12-订单与支付/03-取消确认弹窗/`
 * 口径出处：PRD 7.6 取消订单规则（二次确认、原因必填 1–50 字）+ PRD 7.16.1 取消确认弹层行 + 契约 §3.5
 * 交互口径（PRD）：点快捷原因即回填文本域；原因为空时「确定取消」不可提交并提示必填；
 * 点「确定取消」调 `POST /api/v1/orders/{orderId}/cancel`；点「再想想」或点遮罩关闭弹层且不取消；
 * 提交中按钮禁用并显示处理中；订单已进入制作或已取消时被拒 → 提示原因并通知页面刷新订单状态。
 * 课程口径：**不出现退款、售后与资金处理文案**——设计稿「如有已使用的优惠券将原路退回」已按拍板删除，
 * 实现只保留说明「订单取消后不可恢复」。
 * 按钮主次按设计稿：以品牌橙「再想想」为主按钮、白底描边「确定取消」为次按钮（用主次对比给取消操作加摩擦）。
 */
import { computed, nextTick, ref, watch } from 'vue'
import { orderApi } from '@/services/api'

const props = defineProps<{ orderId: string }>()
const emit = defineEmits<{ close: []; cancelled: []; rejected: [reason: string] }>()

/** 四个快捷原因（PRD 7.16.1 逐字） */
const QUICK_REASONS = ['不想要了', '信息填写错误', '重新选购', '其他原因'] as const
const MAX_REASON_LENGTH = 50

const reason = ref('')
const submitting = ref(false)
const reasonTip = ref('')
const errorTip = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)

const canSubmit = computed(() => reason.value.trim().length > 0 && !submitting.value)

/** 点快捷原因即回填文本域（PRD） */
function pickReason(text: string): void {
  reason.value = text
  reasonTip.value = ''
  errorTip.value = ''
  void nextTick(() => inputRef.value?.focus())
}

function close(): void {
  if (submitting.value) return
  emit('close')
}

function onOverlay(): void {
  close()
}

async function onConfirm(): Promise<void> {
  if (submitting.value) return
  if (!canSubmit.value) {
    reasonTip.value = '请填写取消原因（1–50 字）'
    return
  }
  submitting.value = true
  reasonTip.value = ''
  errorTip.value = ''
  try {
    await orderApi.cancelOrder(props.orderId, reason.value.trim())
    emit('cancelled')
  } catch (err) {
    // 已接单/已取消等被拒（契约 §3.5 返回 409）：提示原因并通知页面刷新订单状态
    errorTip.value = err instanceof Error ? err.message : '取消失败，请重试'
    emit('rejected', errorTip.value)
  } finally {
    submitting.value = false
  }
}

// 弹层关闭后重置内部状态，避免下次打开残留上次输入
watch(
  () => props.orderId,
  () => {
    reason.value = ''
    reasonTip.value = ''
    errorTip.value = ''
  },
)
</script>

<template>
  <div class="cso-root">
    <!-- 遮罩 40% 黑（点遮罩关闭弹层且不取消） -->
    <div class="cso-overlay" data-testid="cancel-sheet-overlay" @click="onOverlay" />
    <section
      class="cso-sheet"
      data-testid="cancel-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="取消订单"
    >
      <span class="cso-drag" aria-hidden="true" />
      <header class="cso-head">
        <p class="cso-title">取消订单</p>
        <button class="cso-close" type="button" aria-label="关闭" data-testid="cancel-sheet-close" @click="close">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>
      </header>

      <p class="cso-desc">订单取消后不可恢复</p>

      <div class="cso-reason-head">
        <p class="cso-reason-label"><i class="cso-asterisk">*</i> 取消原因</p>
        <span class="cso-required">必填</span>
      </div>

      <div class="cso-chips">
        <button
          v-for="item in QUICK_REASONS"
          :key="item"
          class="cso-chip"
          :class="{ 'is-active': reason === item }"
          type="button"
          data-testid="reason-chip"
          @click="pickReason(item)"
        >
          {{ item }}
        </button>
      </div>

      <textarea
        ref="inputRef"
        v-model="reason"
        class="cso-input"
        data-testid="reason-input"
        :maxlength="MAX_REASON_LENGTH"
        placeholder="请填写取消订单的具体原因..."
      />
      <p class="cso-counter" data-testid="reason-counter">{{ reason.length }}/{{ MAX_REASON_LENGTH }}</p>

      <p v-if="reasonTip" class="cso-tip" data-testid="cancel-reason-tip">{{ reasonTip }}</p>
      <p v-if="errorTip" class="cso-tip cso-tip--error" data-testid="cancel-error-tip" role="alert">{{ errorTip }}</p>

      <div class="cso-actions">
        <button class="cso-keep" type="button" data-testid="cancel-keep-btn" @click="close">再想想</button>
        <button
          class="cso-confirm"
          :class="{ 'is-disabled': !canSubmit }"
          type="button"
          data-testid="cancel-confirm-btn"
          :aria-disabled="canSubmit ? 'false' : 'true'"
          :disabled="submitting"
          @click="onConfirm"
        >
          {{ submitting ? '处理中…' : '确定取消' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cso-root {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

/* 遮罩：40% 黑（设计稿 .overlayOverlayBlur） */
.cso-overlay {
  position: absolute;
  inset: 0;
  background: #00000066;
}

/* 底部弹层：白色面板 + 顶部 8px 圆角 + 顶部拖拽条 */
.cso-sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 8px 16px 20px;
  border-radius: 8px 8px 0 0;
  background: #ffffff;
}

.cso-drag {
  width: 40px;
  height: 4px;
  margin: 0 auto 12px;
  border-radius: 9999px;
  background: #e5e5e5;
}

.cso-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cso-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
  color: #1a1c1c;
}

.cso-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  padding: 0;
  color: #999999;
}

.cso-close svg {
  width: 20px;
  height: 20px;
}

.cso-desc {
  margin: 8px 0 16px;
  font-size: 13px;
  line-height: 20px;
  color: #666666;
}

.cso-reason-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cso-reason-label {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: #1a1c1c;
}

/* 必填星号为语义红（错误/危险语义，允许保留红色） */
.cso-asterisk {
  font-style: normal;
  color: var(--color-error);
}

.cso-required {
  font-size: 12px;
  line-height: 18px;
  color: #999999;
}

.cso-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 10px 0 14px;
}

.cso-chip {
  border: 1px solid #e5e5e5;
  border-radius: 9999px;
  background: #ffffff;
  padding: 6px 14px;
  font-size: 13px;
  line-height: 20px;
  color: #1a1c1c;
}

.cso-chip.is-active {
  border-color: var(--color-primary);
  background: #fff3ed;
  color: var(--color-primary);
}

.cso-input {
  width: 100%;
  min-height: 96px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 10px 12px;
  font: inherit;
  font-size: 14px;
  line-height: 20px;
  color: #1a1c1c;
  resize: none;
}

.cso-input::placeholder {
  color: #999999;
}

.cso-counter {
  margin: 4px 0 0;
  text-align: right;
  font-size: 12px;
  line-height: 18px;
  color: #999999;
}

.cso-tip {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: #999999;
}

.cso-tip--error {
  color: var(--color-error);
}

.cso-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

/* 主按钮「再想想」（设计稿口径：以品牌橙主按钮给取消操作加摩擦） */
.cso-keep {
  border: none;
  border-radius: 8px;
  background: var(--color-primary);
  padding: 13px 16px;
  font-size: 16px;
  font-weight: 500;
  line-height: 20px;
  color: #ffffff;
}

.cso-confirm {
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px 15px;
  font-size: 16px;
  font-weight: 500;
  line-height: 20px;
  color: #1a1c1c;
}

/* 原因为空时置灰但仍可点击 → 点击给出必填提示（原生 disabled 会吞点击） */
.cso-confirm.is-disabled {
  border-color: #f0f0f0;
  color: #bfbfbf;
}

.cso-confirm:disabled {
  opacity: 0.6;
}
</style>
