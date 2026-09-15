<script setup lang="ts">
/**
 * 系统设置页（PRD 7.16.1「系统设置页-顶部栏 / 设置内容区」两行，设置与 FAQ P2 的设置能力）
 * 视觉真源：docs/design/exports/用户端/10-个人中心/07-系统设置/（390 宽）
 * - 顶部栏：返回 + 标题「系统设置」（56px、1px 底边线、白色底）
 * - 条目固定菜单：个人资料 / 通知设置 / 隐私设置 / 关于轻量外卖 / 退出登录
 *   · 个人资料 → 资料展示页（内容来自当前会话与 GET /me）
 *   · 通知设置、隐私设置不在本期范围（PRD 6.11），点击提示「暂未开放」，不扩大范围
 *   · 关于轻量外卖版本号为前端固定值，点击只展示固定信息
 *   · 退出登录先二次确认，再清除会话并回登录页
 * - 未登录先跳登录并保留目标地址；退出成功后不能返回受保护页面
 * 口径：第三方品牌名不出现在本工程（PRD 886 行的「关于饿了么」按全库既有口径写作「关于轻量外卖」，
 * 与 MineView 页脚「轻量外卖 v0.1.0」、MemberView「轻量外卖超级会员」同一处理）；
 * 资料编辑需写接口，而契约本期未定义用户资料写接口 → 按「本期实现（待开发）」如实标注，不虚构保存能力。
 */
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/sessionStore'
import { toast } from '@/utils/toast'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()

/** 前端固定版本号（PRD 字段列：版本号为前端固定值，与我的页页脚同源） */
const APP_VERSION = 'v0.1.0'

onMounted(async () => {
  // 未登录按统一规则跳登录并保留目标地址（PRD 检查列）
  if (!sessionStore.isLoggedIn) await sessionStore.checkLogin()
  if (!sessionStore.isLoggedIn) {
    void router.replace({ name: 'login', query: { redirect: route.fullPath } })
  }
})

/** 个人资料 → 资料展示页（PRD 交互列） */
function goProfile(): void {
  void router.push({ name: 'profile' })
}

/** 通知设置、隐私设置：不在本期范围，按占位处理（PRD 交互列） */
function onPlaceholder(): void {
  toast('暂未开放')
}

/** 关于轻量外卖：只展示固定信息（PRD 交互列） */
function onAbout(): void {
  toast(`轻量外卖 ${APP_VERSION}（课程项目演示版）`)
}

/** 退出登录：二次确认 → 清除会话 → 回登录页（PRD 交互列与检查列） */
async function onLogout(): Promise<void> {
  if (!window.confirm('确定退出登录吗？')) return
  if (sessionStore.isLoggedIn) {
    await sessionStore.logout()
  }
  await router.replace({ name: 'login' })
}

function goBack(): void {
  if (window.history.length > 1) router.back()
  else void router.replace({ name: 'mine' })
}
</script>

<template>
  <div class="settings-page" data-testid="settings-page">
    <header class="st-header" data-testid="settings-header">
      <button class="st-back" type="button" aria-label="返回" data-testid="settings-back" @click="goBack">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M15 4.5L7.5 12L15 19.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <span class="st-title">系统设置</span>
    </header>

    <main class="st-main">
      <section class="st-list">
        <button class="st-item" type="button" data-testid="settings-profile" @click="goProfile">
          <span class="st-item-left">
            <svg class="st-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8.5" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8" />
              <path
                d="M4.8 20c1.5-3.6 4-5.4 7.2-5.4S17.7 16.4 19.2 20"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
            <span class="st-item-text">个人资料</span>
          </span>
          <svg class="st-chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9.5 5L16 12L9.5 19"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <button class="st-item" type="button" data-testid="settings-notification" @click="onPlaceholder">
          <span class="st-item-left">
            <svg class="st-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 17V10.5a6 6 0 1 1 12 0V17l1.5 2H4.5L6 17Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
              />
              <path d="M10 20.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.8" />
            </svg>
            <span class="st-item-text">通知设置</span>
          </span>
          <svg class="st-chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9.5 5L16 12L9.5 19"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <button class="st-item" type="button" data-testid="settings-privacy" @click="onPlaceholder">
          <span class="st-item-left">
            <svg class="st-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3.5l7 3v5.2c0 4-2.9 7.3-7 8.3-4.1-1-7-4.3-7-8.3V6.5l7-3Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
              />
            </svg>
            <span class="st-item-text">隐私设置</span>
          </span>
          <svg class="st-chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9.5 5L16 12L9.5 19"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <button
          class="st-item st-item--last"
          type="button"
          data-testid="settings-about"
          @click="onAbout"
        >
          <span class="st-item-left">
            <svg class="st-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8" />
              <path
                d="M12 10.8v6"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
              <circle cx="12" cy="7.6" r="1.1" fill="currentColor" />
            </svg>
            <span class="st-item-text">关于轻量外卖</span>
          </span>
          <span class="st-item-right">
            <span class="st-version" data-testid="settings-version">{{ APP_VERSION }}</span>
            <svg class="st-chevron" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M9.5 5L16 12L9.5 19"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </button>
      </section>

      <button class="st-logout" type="button" data-testid="settings-logout" @click="onLogout">
        <svg class="st-logout-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M14 5.5H6.5v13H14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M12.5 12h8M17.5 8.8L20.7 12l-3.2 3.2"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>退出登录</span>
      </button>
    </main>
  </div>
</template>

<style scoped>
/* 复刻约定 2.4：设计稿无浏览器默认 margin，页面作用域内重置 */
.settings-page p {
  margin: 0;
}
.settings-page button {
  font-family: inherit;
}

.settings-page {
  min-height: 100vh;
  background: #f9f9f9;
  /* 底部导航由 MainLayout 渲染，避免内容被遮挡 */
  padding-bottom: 84px;
}

/* 顶部栏（设计稿 .headerCustomTopAppBa：56px、白色底、1px 底边线、标题居中） */
.st-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 12px;
  background: #ffffff;
  border-bottom: 1px solid #e5e5e5;
}

.st-back {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  color: #1a1c1c;
}

.st-back svg {
  width: 20px;
  height: 20px;
}

/* 设计稿 .text4：18px/24 居中，右侧留出返回按钮同宽以保持视觉居中 */
.st-title {
  flex: 1;
  padding-right: 40px;
  text-align: center;
  font-size: 18px;
  font-weight: 500;
  line-height: 24px;
  color: #1a1c1c;
}

/* 内容区（设计稿 .mainContent：padding 12px 12px 96px、row-gap 32px） */
.st-main {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 12px 12px 24px;
}

/* 菜单分组（设计稿 .settingsListContaine：1px #e5e5e5、8px 圆角、浅阴影、白底） */
.st-list {
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  box-shadow: 0 1px 2px #0000000d;
  background: #ffffff;
  overflow: hidden;
}

.st-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px 16px 15px;
  border: none;
  border-bottom: 1px solid #e5e5e5;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}

/* 设计稿 .buttonListItemAbout：末条无下边线、padding 16px */
.st-item--last {
  padding: 16px;
  border-bottom: none;
}

.st-item-left {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.st-icon {
  flex: none;
  width: 20px;
  height: 20px;
  color: #1a1c1c;
}

/* 设计稿 .text：16px/22、#1a1c1c */
.st-item-text {
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  color: #1a1c1c;
}

.st-item-right {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* 设计稿 .text2：12px/16、#999999 */
.st-version {
  font-size: 12px;
  line-height: 16px;
  color: #999999;
}

/* 设计稿 .container3：7×12 右箭头 */
.st-chevron {
  flex: none;
  width: 12px;
  height: 12px;
  color: #cccccc;
}

/* 退出登录（设计稿 .logoutButtonButton：品牌橙描边 1px、4px 圆角、白底、内容居中） */
.st-logout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 15px 0;
  border: 1px solid #ff5a1f;
  border-radius: 4px;
  background: #ffffff;
  color: #ff5a1f;
  font-size: 16px;
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;
}

.st-logout-icon {
  flex: none;
  width: 18px;
  height: 18px;
}
</style>
