<script setup lang="ts">
/**
 * 爆红包全屏浮层（CHG-001 TODO-USER-029，契约 §3.10、PRD 7.16.1「爆红包过渡态」「爆出结果」两行）
 * 视觉真源：docs/design/exports/用户端/11-天天必爆/02-爆红包过渡态/、03-爆出结果/
 *
 * 骨架占位：本文件先于失败测试入库（提交顺序 chore: 骨架 → test: 红 → feat: 实现），
 * 使红端为断言级而非文件级加载失败（CI 提交规范 R6）。
 */
</script>

<template>
  <div v-if="false" class="blast-overlay" data-testid="blast-overlay">
    <!-- TODO(TODO-USER-029)：过渡态（金光 + 横幅 + 爆按钮 + 欧气进度）/ 结果卡 / 失败态 -->
  </div>
</template>
