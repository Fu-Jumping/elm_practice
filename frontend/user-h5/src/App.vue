<script setup lang="ts">
import { RouterView } from 'vue-router'
import ToastHost from '@/components/ToastHost.vue'
</script>

<template>
  <!-- 页面切换只做 opacity 淡入淡出（复刻约定 2.11，设计系统弃用位移动画） -->
  <RouterView v-slot="{ Component }">
    <Transition name="page-fade" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
  <!-- 全局轻提示：占位点击/请求错误统一经 utils/toast 展示 -->
  <ToastHost />
</template>
