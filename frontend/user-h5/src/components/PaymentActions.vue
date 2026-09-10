<script setup lang="ts">
import { shallowRef } from 'vue'
import { orderApi } from '@/services/api'
const props = defineProps<{ orderId: string; status: string }>()
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
  <section v-if="status === 'PENDING_PAYMENT'" class="payment-actions">
    <p>模拟支付 · 请在下单后 15 分钟内完成</p>
    <p v-if="error" class="payment-error" role="alert">{{ error }}</p>
    <div class="payment-buttons">
      <button data-testid="pay-order" type="button" :disabled="busy" @click="pay(true)">{{ busy ? '处理中…' : '确认模拟支付' }}</button>
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
</style>
