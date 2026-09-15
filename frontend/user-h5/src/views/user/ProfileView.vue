<script setup lang="ts">
/**
 * 个人资料页（PRD 7.10「设置：个人资料展示与编辑」+ 7.16.1 系统设置页交互列「点击个人资料进入资料展示与编辑」）
 * 设计稿无独立导出稿（10-个人中心 下无「个人资料」目录）→ 页面壳与条目样式沿用同组
 * 系统设置页（07-系统设置）的顶栏与卡片规范，不新造视觉语言（复刻约定 2.6：共享形态统一）。
 * 口径：
 * - 资料内容来自当前会话与个人信息接口（`GET /me`），字段缺失只隐藏对应行，不显示 undefined
 * - 读取失败提供重试（PRD 检查列「个人信息读取失败提供重试」）
 * - **编辑能力本期实现（待开发）**：契约 §3.1 未定义用户资料写接口，后端亦未实现；
 *   按「不得把未实现写成已完成」如实标注，不提供假保存按钮
 * - 未登录先跳登录并保留目标地址
 */
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/sessionStore'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()

const loading = ref(true)
const failed = ref(false)

async function loadProfile(): Promise<void> {
  loading.value = true
  failed.value = false
  try {
    // 会话已登录时 checkLogin 会重新拉取 GET /me，确保展示的是服务端最新资料
    await sessionStore.checkLogin()
    failed.value = !sessionStore.isLoggedIn
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!sessionStore.isLoggedIn) await sessionStore.checkLogin()
  if (!sessionStore.isLoggedIn && !sessionStore.user) {
    // 未登录（会话失效）→ 按统一规则跳登录并保留目标地址
    void router.replace({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  await loadProfile()
})

function goBack(): void {
  if (window.history.length > 1) router.back()
  else void router.replace({ name: 'settings' })
}
</script>

<template>
  <div class="profile-page" data-testid="profile-page">
    <header class="pf-header">
      <button class="pf-back" type="button" aria-label="返回" data-testid="profile-back" @click="goBack">
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
      <span class="pf-title">个人资料</span>
    </header>

    <main class="pf-main">
      <p v-if="loading" class="pf-state" data-testid="profile-loading">加载中…</p>

      <template v-else-if="failed">
        <p class="pf-state" data-testid="profile-error">资料加载失败</p>
        <button class="pf-retry" type="button" data-testid="profile-retry" @click="loadProfile">
          重试
        </button>
      </template>

      <template v-else>
        <section class="pf-card">
          <div class="pf-avatar-row">
            <img
              v-if="sessionStore.user?.avatar"
              class="pf-avatar-img"
              :src="sessionStore.user.avatar"
              alt="头像"
            />
            <span v-else class="pf-avatar" aria-hidden="true">
              {{ sessionStore.user?.nickname?.slice(0, 1) ?? '客' }}
            </span>
          </div>

          <div class="pf-row">
            <span class="pf-label">昵称</span>
            <span class="pf-value" data-testid="profile-nickname">
              {{ sessionStore.user?.nickname }}
            </span>
          </div>
          <div class="pf-row">
            <span class="pf-label">账号</span>
            <span class="pf-value" data-testid="profile-account">
              {{ sessionStore.user?.account }}
            </span>
          </div>
        </section>

        <!-- 编辑能力如实标注：契约未定义用户资料写接口，不做假保存入口 -->
        <p class="pf-note" data-testid="profile-edit-pending">
          个人资料编辑本期实现（待开发）：资料写接口尚未进入契约，本页当前为只读展示。
        </p>
      </template>
    </main>
  </div>
</template>

<style scoped>
.profile-page p {
  margin: 0;
}
.profile-page button {
  font-family: inherit;
}

.profile-page {
  min-height: 100vh;
  background: #f9f9f9;
  padding-bottom: 84px;
}

/* 顶栏与系统设置页同规范（56px、白底、1px 底边线、标题居中） */
.pf-header {
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

.pf-back {
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

.pf-back svg {
  width: 20px;
  height: 20px;
}

.pf-title {
  flex: 1;
  padding-right: 40px;
  text-align: center;
  font-size: 18px;
  font-weight: 500;
  line-height: 24px;
  color: #1a1c1c;
}

.pf-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.pf-card {
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  box-shadow: 0 1px 2px #0000000d;
  background: #ffffff;
  overflow: hidden;
}

.pf-avatar-row {
  display: flex;
  justify-content: center;
  padding: 20px 16px 12px;
}

.pf-avatar-img {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
}

.pf-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #ffdbd0;
  color: #ae3200;
  font-size: 24px;
  font-weight: 700;
}

.pf-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid #e5e5e5;
}

.pf-label {
  flex: none;
  font-size: 15px;
  color: #666666;
}

.pf-value {
  min-width: 0;
  font-size: 15px;
  color: #1a1c1c;
  word-break: break-all;
  text-align: right;
}

.pf-note {
  padding: 12px;
  border-radius: 8px;
  background: #ffffff;
  font-size: 13px;
  line-height: 20px;
  color: #999999;
}

.pf-state {
  padding: 24px 12px;
  text-align: center;
  font-size: 14px;
  color: #999999;
}

.pf-retry {
  align-self: center;
  padding: 8px 20px;
  border: 1px solid #ff5a1f;
  border-radius: 17px;
  background: none;
  color: #ff5a1f;
  font-size: 14px;
  cursor: pointer;
}
</style>
