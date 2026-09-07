<script setup lang="ts">
/**
 * 我的页（视觉真源：docs/design/exports/用户端/10-个人中心，390 宽）
 * 2026-09-07 TDD 落地（T51-T55，负责人拍板最小方案）：
 * - 用户信息来自当前会话（GET /me 探活恢复）；未实现模块不显示假数量（PRD 862 列）
 * - 未登录显示"去登录"引导（PRD：未登录显示去登录，页面内处理，路由不设守卫）
 * - 收货地址入口 → 地址管理；会员/收藏/红包未选定 → 提示暂未开放
 * - 退出登录清除会话并回登录页（PRD：退出后不能返回受保护页面）
 * - 页脚版本号为前端固定值
 * TODO(第三批 TDD)：首页定位文字读默认地址（PRD 806 行）、地址选择回填确认订单
 */
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/sessionStore'
import { toast } from '@/utils/toast'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()

onMounted(async () => {
  // 刷新后恢复会话（探活失败保持未登录态 → 显示去登录引导）
  if (!sessionStore.isLoggedIn) await sessionStore.checkLogin()
})

function goLogin(): void {
  void router.push({ name: 'login', query: { redirect: route.fullPath } })
}

function goAddresses(): void {
  void router.push({ name: 'address-list' })
}

/** 未选定扩展入口：提示暂未开放，不进入业务（PRD 862 列） */
function placeholder(): void {
  toast('暂未开放')
}

/** 退出登录：清除会话并回登录页（PRD：退出后不能返回受保护页面） */
async function onLogout(): Promise<void> {
  await sessionStore.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="mine-page">
    <!-- 未登录：去登录引导（PRD：未登录显示去登录） -->
    <section v-if="!sessionStore.isLoggedIn" class="mn-login-card">
      <p class="mn-login-tip">登录后可管理地址与订单</p>
      <button class="mn-login-btn" type="button" data-testid="login-entry" @click="goLogin">
        去登录
      </button>
    </section>

    <!-- 已登录：用户信息 + 菜单 -->
    <template v-else>
      <section class="mn-profile">
        <span class="mn-avatar" aria-hidden="true">
          {{ sessionStore.user?.nickname?.slice(0, 1) ?? '客' }}
        </span>
        <div class="mn-user">
          <p class="mn-nickname" data-testid="mine-nickname">
            {{ sessionStore.user?.nickname }}
          </p>
          <p
            v-if="sessionStore.user?.account"
            class="mn-account"
            data-testid="mine-account"
          >
            {{ sessionStore.user?.account }}
          </p>
        </div>
      </section>

      <section class="mn-menu">
        <button class="mn-item" type="button" data-testid="entry-addresses" @click="goAddresses">
          <span>收货地址</span>
          <span class="mn-arrow" aria-hidden="true">›</span>
        </button>
        <button class="mn-item" type="button" data-testid="entry-member" @click="placeholder">
          <span>会员权益</span>
          <span class="mn-arrow" aria-hidden="true">›</span>
        </button>
        <button class="mn-item" type="button" data-testid="entry-favorites" @click="placeholder">
          <span>我的收藏</span>
          <span class="mn-arrow" aria-hidden="true">›</span>
        </button>
        <button class="mn-item" type="button" data-testid="entry-coupons" @click="placeholder">
          <span>红包卡券</span>
          <span class="mn-arrow" aria-hidden="true">›</span>
        </button>
      </section>

      <section class="mn-logout-section">
        <button class="mn-logout" type="button" data-testid="logout-btn" @click="onLogout">
          退出登录
        </button>
      </section>
    </template>

    <footer class="mn-footer" data-testid="mine-version">轻量外卖 v0.1.0</footer>
  </div>
</template>

<style scoped>
.mine-page {
  min-height: 100%;
  background: #f9f9f9;
  padding-bottom: 24px;
  display: flex;
  flex-direction: column;
}

.mn-login-card {
  margin: 16px 12px;
  background: #fff;
  border-radius: 8px;
  padding: 40px 16px;
  text-align: center;
}

.mn-login-tip {
  font-size: 14px;
  color: #999;
}

.mn-login-btn {
  margin-top: 16px;
  padding: 10px 32px;
  border: none;
  border-radius: 10px;
  background: #ff5a1f;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.mn-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 12px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
}

.mn-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 90, 31, 0.1);
  color: #ff5a1f;
  font-size: 22px;
  font-weight: 700;
}

.mn-nickname {
  font-size: 17px;
  font-weight: 700;
  color: #1a1c1c;
}

.mn-account {
  margin-top: 4px;
  font-size: 13px;
  color: #999;
}

.mn-menu {
  margin: 0 12px;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.mn-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 16px;
  border: none;
  border-bottom: 1px solid #f3f3f3;
  background: none;
  font-size: 15px;
  color: #1a1c1c;
  text-align: left;
  cursor: pointer;
}

.mn-item:last-child {
  border-bottom: none;
}

.mn-arrow {
  color: #ccc;
  font-size: 18px;
}

.mn-logout-section {
  margin: 16px 12px;
}

.mn-logout {
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: 10px;
  background: #fff;
  color: #ba1a1a;
  font-size: 15px;
  font-weight: 600;
}

.mn-footer {
  margin-top: auto;
  padding: 24px 0 12px;
  text-align: center;
  font-size: 12px;
  color: #ccc;
}
</style>
