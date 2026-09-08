<script setup lang="ts">
/**
 * 轻提示视觉层（2026-09-06）：全局唯一实例，挂载于 App.vue，所有页面共用
 * 口径（负责人拍板）：单条覆盖 / 顶部居中深色胶囊白字 / 约 2 秒自动消失
 * 数据流：utils/toast 监听器注册表 → 本组件状态；请求层错误提示同样经此展示
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { onToast } from '@/utils/toast'

const VISIBLE_MS = 2000

const message = ref('')
const visible = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | undefined
let offToast: (() => void) | undefined

onMounted(() => {
  offToast = onToast((msg) => {
    message.value = msg
    visible.value = true
    // 单条覆盖：每次新提示重置消失计时
    if (hideTimer !== undefined) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      visible.value = false
    }, VISIBLE_MS)
  })
})

onUnmounted(() => {
  offToast?.()
  if (hideTimer !== undefined) clearTimeout(hideTimer)
})
</script>

<template>
  <Transition name="toast-fade">
    <div v-if="visible" class="toast-host" data-testid="toast" role="status">{{ message }}</div>
  </Transition>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  /* 设计系统未定义 toast 层级，暂定顶层（高于底栏与弹层） */
  z-index: 1000;
  max-width: calc(100% - 48px);
  padding: 8px 16px;
  /* 胶囊形为负责人拍板口径（2026-09-06）；瞬态反馈层，豁免设计系统控件胶囊禁令 */
  border-radius: 999px;
  background: rgba(13, 13, 13, 0.85);
  font-size: 14px;
  line-height: 20px;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
}
</style>
