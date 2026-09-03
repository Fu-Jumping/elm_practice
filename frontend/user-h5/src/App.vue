<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <!-- 页面切换只做 opacity 淡入淡出（复刻约定 2.11，设计系统弃用位移动画） -->
  <RouterView v-slot="{ Component }">
    <Transition name="page-fade" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
