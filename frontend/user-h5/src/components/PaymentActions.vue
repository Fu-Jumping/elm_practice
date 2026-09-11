<script setup lang="ts">
/**
 * 模拟支付动作（既有点付入口组件，TODO-USER-101 交付；批次⑩ 105 起新增 pay-page 变体）
 * - inline（默认）：P0 既有形态（页内卡片 + 确认模拟支付/演示支付失败，保留原行为与用例）
 * - footer：订单详情页底部操作区形态（品牌橙渐变主按钮，批次⑩ 104 用过）
 * - pay-page：支付页底部「立即支付 ¥实付金额」形态；成功 emit paid、失败 emit failed（供跳转支付失败页）；
 *   倒计时失效或 payDeadline 未返回时由父级传 disabled 禁用
 */
import { shallowRef } from 'vue'
import { orderApi } from '@/services/api'
const props = defineProps<{
  orderId: string
  status: string
  variant?: 'inline' | 'footer' | 'pay-page'
  /** pay-page 变体：实付金额文本（如 '38.90'），用于「立即支付 ¥38.90」 */
  amountText?: string
  /** pay-page 变体：外部禁用（倒计时已失效 / payDeadline 未返回 / 非待支付） */
  disabled?: boolean
}>()
const emit = defineEmits<{ paid: []; failed: [reason: string] }>()
const busy = shallowRef(false)
const error = shallowRef('')

async function pay(success: boolean) {
  if (busy.value || props.disabled) return
  busy.value = true
  error.value = ''
  try {
    const result = await orderApi.payOrder(props.orderId, success)
    if (result.status === 'PENDING_PAYMENT') {
      // 仍为待支付 = 模拟失败（后端未变更状态）
      error.value = success ? '模拟支付失败，请重试' : '模拟支付失败'
      if (props.variant === 'pay-page') emit('failed', error.value)
    } else {
      emit('paid')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '支付失败，请重试'
    if (props.variant === 'pay-page') emit('failed', error.value)
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section v-if="status === 'PENDING_PAYMENT'" class="payment-actions" :class="`payment-actions--${variant ?? 'inline'}`">
    <p v-if="variant !== 'footer' && variant !== 'pay-page'">模拟支付 · 请在下单后 15 分钟内完成</p>
    <p v-if="error" class="payment-error" role="alert">{{ error }}</p>
    <div class="payment-buttons">
      <button data-testid="pay-order" type="button" :disabled="busy || disabled" @click="pay(true)">
        <template v-if="variant === 'pay-page'">立即支付<template v-if="amountText">&nbsp;¥{{ amountText }}</template></template>
        <template v-else-if="variant === 'footer'">去支付</template>
        <template v-else>{{ busy ? '处理中…' : '确认模拟支付' }}</template>
      </button>
      <button class="payment-secondary" type="button" data-testid="pay-fail-demo" :disabled="busy || disabled" @click="pay(false)">
        演示支付失败
      </button>
    </div>
  </section>
</template>
<style scoped>
.payment-actions { padding: 16px 12px; background: #fff; border-bottom: 1px solid #e5e5e5; font-size: 13px; }
.payment-actions p { margin: 0 0 12px; }
.payment-buttons { display: flex; gap: 8px; }
.payment-buttons button { border: 1px solid #ff5a1f; border-radius: 4px; background: #ff5a1f; color: #fff; padding: 10px 12px; font: inherit; cursor: pointer; }
.payment-buttons .payment-secondary { color: #ff5a1f; background: #fff; }
.payment-buttons button:disabled { opacity: .6; cursor: wait; }
.payment-error { color: #ba1a1a; }

/* footer 变体（设计真源 12-订单与支付/01 底部操作区：主按钮品牌橙渐变、圆角 12） */
.payment-actions--footer { padding: 0; background: none; border-bottom: none; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.payment-actions--footer p { margin: 0; }
.payment-actions--footer .payment-buttons { gap: 10px; align-items: center; }
.payment-actions--footer .payment-buttons button {
  border: none;
  border-radius: 12px;
  background-image: linear-gradient(90deg, #ff5a1f 0%, #ff7133 100%);
  padding: 10px 16px;
  font-size: 14px;
  line-height: 21px;
  font-weight: 500;
}
.payment-actions--footer .payment-buttons .payment-secondary {
  background: none;
  background-image: none;
  color: #757575;
  padding: 10px 4px;
  font-size: 12px;
}
.payment-actions--footer .payment-error { font-size: 12px; }

/* pay-page 变体（设计真源 12-订单与支付/02-支付页 底部：通栏品牌橙实心按钮，圆角 4、上下 12） */
.payment-actions--pay-page { display: contents; }
.payment-actions--pay-page .payment-buttons { display: contents; }
.payment-actions--pay-page .payment-buttons button {
  flex-grow: 1;
  border: none;
  border-radius: 4px;
  background: #ff5a1f;
  padding: 12px 0;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.4px;
  line-height: 20px;
}
.payment-actions--pay-page .payment-buttons button:disabled { opacity: .5; cursor: not-allowed; }
/* 演示失败入口为课程演示能力（设计稿无此按钮）：低视觉权重的文字链 */
.payment-actions--pay-page .payment-buttons .payment-secondary {
  position: absolute;
  right: 16px;
  bottom: 76px;
  flex-grow: 0;
  border: none;
  background: none;
  padding: 4px 8px;
  font-size: 12px;
  color: #999999;
}
.payment-actions--pay-page .payment-error { position: absolute; right: 16px; bottom: 100px; font-size: 12px; }
</style>
