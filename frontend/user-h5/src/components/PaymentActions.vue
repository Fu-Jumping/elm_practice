<script setup lang="ts">
import { shallowRef } from 'vue'
import { orderApi } from '@/services/api'
const props = defineProps<{
  orderId: string
  status: string
  /** 展示变体：inline=页内卡片（默认，P0 既有形态）；footer=订单详情底部操作区主按钮（批次⑩，CHG-003） */
  variant?: 'inline' | 'footer'
}>()
const emit = defineEmits<{ paid: [] }>()
const busy = shallowRef(false)
const error = shallowRef('')
async function pay(success: boolean) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const result = await orderApi.payOrder(props.orderId, success)
    if (result.status === 'PENDING_PAYMENT') error.value = '模拟支付失败，请重试'
    else emit('paid')
  } catch (err) { error.value = err instanceof Error ? err.message : '支付失败，请重试' }
  finally { busy.value = false }
}
</script>
<template>
  <section v-if="status === 'PENDING_PAYMENT'" class="payment-actions" :class="`payment-actions--${variant ?? 'inline'}`">
    <p v-if="variant !== 'footer'">模拟支付 · 请在下单后 15 分钟内完成</p>
    <p v-if="error" class="payment-error" role="alert">{{ error }}</p>
    <div class="payment-buttons">
      <button data-testid="pay-order" type="button" :disabled="busy" @click="pay(true)">
        {{ busy ? '处理中…' : variant === 'footer' ? '去支付' : '确认模拟支付' }}
      </button>
      <button class="payment-secondary" type="button" :disabled="busy" @click="pay(false)">演示支付失败</button>
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
</style>
