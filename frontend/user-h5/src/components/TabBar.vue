<script setup lang="ts">
/**
 * 底部导航共享组件（首页-精细 SVG `project-bottom-nav` 组 exact 转写，2026-09-06）
 * 四 Tab 重绘口径：首页（选中实心 #ff5a1f）/ 消息（含未读红点，语义红 #ff1414）/ 订单 / 我的
 * 高度 84px = 1px 顶边框 + 内容 73px + Home Indicator 装饰（设计稿 768→852 段）
 * 非选中态图标设计稿未提供，按选中态描边化处理（1.7px stroke，见 raw 留痕）
 */
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

interface TabDef {
  name: string
  label: string
  badge?: boolean
}

const tabs: TabDef[] = [
  { name: 'home', label: '首页' },
  { name: 'messages', label: '消息', badge: true },
  { name: 'orders', label: '订单' },
  { name: 'mine', label: '我的' },
]
</script>

<template>
  <nav class="tab-bar">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.name"
      :to="{ name: tab.name }"
      class="tab-item"
      :class="{ 'tab-item--active': route.name === tab.name }"
    >
      <span class="tab-icon">
        <!-- 首页：实心房子（选中态原样；非选中描边化） -->
        <svg v-if="tab.name === 'home'" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3.6 3.8 10.5V20.4H9.9V14.9H14.1V20.4H20.2V10.5Z"
            :fill="route.name === 'home' ? 'var(--color-primary)' : 'none'"
            :stroke="route.name === 'home' ? 'none' : 'currentColor'"
            stroke-width="1.7"
            stroke-linejoin="round"
          />
        </svg>
        <!-- 消息：气泡 -->
        <svg v-else-if="tab.name === 'messages'" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 4.6c-4.6 0-8.3 3-8.3 6.8 0 1.9.9 3.6 2.4 4.8l-.7 3.2 3.4-1.6c1 .3 2.1.4 3.2.4 4.6 0 8.3-3 8.3-6.8S16.6 4.6 12 4.6Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linejoin="round"
          />
        </svg>
        <!-- 订单：单据 -->
        <svg v-else-if="tab.name === 'orders'" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6.2 3.8h11.6v16.4l-1.9-1.4-1.9 1.4-2-1.4-2 1.4-1.9-1.4-1.9 1.4Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linejoin="round"
          />
          <path d="M9 8.6h6M9 12h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <!-- 我的：人形 -->
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8.2" r="3.4" fill="none" stroke="currentColor" stroke-width="1.7" />
          <path
            d="M4.8 20.2c.9-3.4 3.8-5.3 7.2-5.3s6.3 1.9 7.2 5.3"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
        <!-- 未读角标：语义红（AGENTS 允许；PRD 7.16.1 底部导航行） -->
        <span v-if="tab.badge" class="tab-badge" />
      </span>
      <span class="tab-label">{{ tab.label }}</span>
    </RouterLink>
    <!-- Home Indicator 装饰（设计稿组成部分，截图比对基线含此元素） -->
    <span class="home-indicator" aria-hidden="true" />
  </nav>
</template>

<style scoped>
.tab-bar {
  flex: none;
  position: relative;
  display: flex;
  background: var(--color-surface-white);
  border-top: 1px solid #eeeeee;
  /* 底部 26px = 内容与指示条间距 12 + 指示条 5 + 底边距 9（设计稿 768→852 段） */
  padding: 12px 0 26px;
  padding-bottom: calc(26px + env(safe-area-inset-bottom));
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
}

.tab-icon {
  position: relative;
  width: 24px;
  height: 24px;
  color: #1a1a1a;
}

.tab-icon svg {
  display: block;
  width: 100%;
  height: 100%;
}

.tab-item--active .tab-icon {
  color: var(--color-primary);
}

.tab-badge {
  position: absolute;
  top: -6px;
  right: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  /* 未读角标语义红，设计稿原值 #ff1414（非品牌橙，README §2.2） */
  background: #ff1414;
}

.tab-label {
  margin-top: 11px;
  font-size: 11px;
  line-height: 10px;
  color: #1a1a1a;
}

.tab-item--active .tab-label {
  color: var(--color-primary);
}

.home-indicator {
  /* 绝对定位钉在底栏正中最低处，不参与四个 Tab 的 flex 等分（9/6 负责人指出行内挤压问题） */
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(9px + env(safe-area-inset-bottom));
  width: 134px;
  height: 5px;
  border-radius: 2.5px;
  background: #0d0d0d;
}
</style>
