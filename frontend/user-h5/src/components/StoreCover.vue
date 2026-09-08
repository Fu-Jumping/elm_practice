<script setup lang="ts">
/**
 * 门店封面占位组件（2026-09-06 负责人拍板：渐变占位封面方案）
 * 有图走图；无图按 PRD 商家卡行"图片失败显示占位图"口径渲染品牌橙渐变 + 店名首字，
 * 渐变色相按店名散列保持稳定，视觉上区分各店（门店真实图片属图片上传扩展/后端种子数据）
 * 尺寸由父级 class 约束（商家卡封面/详情横幅/Logo 盒复用）
 */
import { computed } from 'vue'

const props = defineProps<{
  name: string
  image?: string
}>()

// 品牌橙体系渐变色板（AGENTS：品牌强调统一亮橙 #ff5a1f 家族）
const PALETTES: [string, string][] = [
  ['#ff5a1f', '#ff9e6b'],
  ['#f46500', '#ffb257'],
  ['#e84e10', '#ff8f5f'],
  ['#ff7a3d', '#ffc29e'],
  ['#d9450f', '#ff8552'],
]

function hash(text: string): number {
  let sum = 0
  for (const ch of text) sum += ch.codePointAt(0) ?? 0
  return sum
}

const palette = computed(() => PALETTES[hash(props.name) % PALETTES.length]!)
const initial = computed(() => props.name.slice(0, 1))
const background = computed(
  () => `linear-gradient(135deg, ${palette.value[0]} 0%, ${palette.value[1]} 100%)`,
)
</script>

<template>
  <img v-if="image" class="store-cover-img" :src="image" :alt="name" />
  <div v-else class="store-cover-placeholder" :style="{ background }" aria-hidden="true">
    <span class="store-cover-initial">{{ initial }}</span>
  </div>
</template>

<style scoped>
.store-cover-img,
.store-cover-placeholder {
  display: block;
  width: 100%;
  height: 100%;
}

.store-cover-img {
  object-fit: cover;
}

.store-cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.store-cover-initial {
  font-size: 24px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
}
</style>
