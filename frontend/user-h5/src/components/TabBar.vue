<script setup lang="ts">
/**
 * 底部导航共享组件（首页-精细 SVG `project-bottom-nav` 组 exact 转写，2026-09-06）
 * 四 Tab 重绘口径：首页（选中实心 #ff5a1f）/ 消息（含未读红点，语义红 #ff1414）/ 订单 / 我的
 * 批次⑩ TODO-USER-004a：消息未读红点接真实数据——契约 §3.9 `GET /me/notifications/unread-count`
 * （用途即底部导航角标）；负责人确认「角标只算通知未读」，会话未读在消息列表会话行单独展示；
 * 接口失败降级为不显示红点，不阻塞导航。
 * 高度 84px = 1px 顶边框 + 内容 73px + Home Indicator 装饰（设计稿 768→852 段）
 * 非选中态图标设计稿未提供，按选中态描边化处理（1.7px stroke，见 raw 留痕）
 */
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { messageApi } from '@/services/api'

const route = useRoute()

/** 通知未读数（底部导航角标；失败降级为 0，不阻塞导航） */
const unreadCount = ref(0)

async function refreshUnread(): Promise<void> {
  try {
    unreadCount.value = await messageApi.getNotificationUnreadCount()
  } catch {
    unreadCount.value = 0
  }
}

onMounted(refreshUnread)
// 路由切换时刷新（进入/离开消息中心后角标保持最新）
watch(() => route.name, refreshUnread)

interface TabDef {
  name: string
  label: string
}

const tabs: TabDef[] = [
  { name: 'home', label: '首页' },
  { name: 'messages', label: '消息' },
  { name: 'orders', label: '订单' },
  { name: 'mine', label: '我的' },
]

/**
 * 当前高亮的 Tab：设计稿「我的收藏页-底部导航」把收藏页归属「我的」高亮，
 * 而收藏页不是四个一级 Tab 之一，故做归属映射（只影响高亮，不影响路由与请求）
 */
const activeTab = computed(() =>
  route.name === 'favorites' || route.name === 'member' ? 'mine' : String(route.name ?? ''),
)
</script>

<template>
  <nav class="tab-bar">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.name"
      :to="{ name: tab.name }"
      class="tab-item"
      :class="{ 'tab-item--active': activeTab === tab.name }"
    >
      <span class="tab-icon">
        <!-- 首页：实心房子（选中态原样；非选中描边化） -->
        <svg v-if="tab.name === 'home'" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3.6 3.8 10.5V20.4H9.9V14.9H14.1V20.4H20.2V10.5Z"
            :fill="activeTab === 'home' ? 'var(--color-primary)' : 'none'"
            :stroke="activeTab === 'home' ? 'none' : 'currentColor'"
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
        <!-- 未读角标：语义红；仅消息 Tab 且通知未读 > 0 时显示（PRD 7.16.1 底部导航行 + 契约 §3.9） -->
        <span
          v-if="tab.name === 'messages' && unreadCount > 0"
          class="tab-badge"
          data-testid="tab-badge-messages"
        />
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
