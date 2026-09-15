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

/** 我的收藏（批次⑥ TODO-USER-006）：收藏商家列表，可取消收藏（契约 §3.7） */
function goFavorites(): void {
  void router.push({ name: 'favorites' })
}

/** 会员权益（批次⑥ TODO-USER-006）：会员标识与权益说明（契约 §3.8） */
function goMember(): void {
  void router.push({ name: 'member' })
}

/** 红包页（批次⑥/CHG-001 TODO-USER-028）：天天红包 = 加量通栏 + 天天必爆活动卡 + 可用红包列表 */
/** AI 点餐助手（AI点餐助手前端PRD §2.3）：无底部导航的对话页，页面内自带返回 */
function goAiChat(): void {
  void router.push({ name: 'ai-chat' })
}

function goCoupons(): void {
  void router.push({ name: 'coupons' })
}

/** 未选定扩展入口：提示暂未开放，不进入业务（PRD 862 列） */
function placeholder(): void {
  toast('暂未开放')
}

/** 常见问题（FAQ，设置与 FAQ P2）：静态帮助页，未登录可浏览 */
function goFaq(): void {
  void router.push({ name: 'faq' })
}

/** 系统设置（设置与 FAQ P2）：个人资料展示、退出登录 */
function goSettings(): void {
  void router.push({ name: 'settings' })
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
        <img
          v-if="sessionStore.user?.avatar"
          class="mn-avatar-img"
          :src="sessionStore.user.avatar"
          alt="头像"
        />
        <span v-else class="mn-avatar" aria-hidden="true">
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
        <!-- 设计稿 .heading3「常用功能」标题行（10-个人中心/01-个人中心/index.module.scss:371-391） -->
        <p class="mn-menu-heading">常用功能</p>
        <button class="mn-item" type="button" data-testid="entry-addresses" @click="goAddresses">
          <span>收货地址</span>
          <span class="mn-arrow" aria-hidden="true">›</span>
        </button>
        <button class="mn-item" type="button" data-testid="entry-member" @click="goMember">
          <span>会员权益</span>
          <span class="mn-arrow" aria-hidden="true">›</span>
        </button>
        <button class="mn-item" type="button" data-testid="entry-favorites" @click="goFavorites">
          <span>我的收藏</span>
          <span class="mn-arrow" aria-hidden="true">›</span>
        </button>
        <button class="mn-item" type="button" data-testid="entry-coupons" @click="goCoupons">
          <span>红包卡券</span>
          <span class="mn-arrow" aria-hidden="true">›</span>
        </button>
        <button class="mn-item" type="button" data-testid="entry-ai-chat" @click="goAiChat">
          <span class="mn-item-label">
            <svg class="mn-item-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 5.5h16v11H9.5L5.5 20v-3.5H4v-11Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
              />
            </svg>
            AI 点餐助手
          </span>
          <span class="mn-arrow" aria-hidden="true">›</span>
        </button>
        <!-- 设计稿「常用功能」分组另含联系客服 / 常见问题 (FAQ) / 系统设置三条
             （10-个人中心/01-个人中心/index.jsx:76-98）；联系客服属平台客服，已明确移出项目范围，
             按占位处理（点击提示暂未开放），FAQ 与系统设置本期实现 -->
        <button class="mn-item" type="button" data-testid="entry-support" @click="placeholder">
          <span>联系客服</span>
          <span class="mn-arrow" aria-hidden="true">›</span>
        </button>
        <button class="mn-item" type="button" data-testid="entry-faq" @click="goFaq">
          <span>常见问题 (FAQ)</span>
          <span class="mn-arrow" aria-hidden="true">›</span>
        </button>
        <button class="mn-item" type="button" data-testid="entry-settings" @click="goSettings">
          <span>系统设置</span>
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

/* 未登录引导：与功能入口分组同族的通栏白条（满宽、零圆角、1px 上下边线），不再用卡片壳
   （复刻约定 2.2：设计稿通栏区域不加卡片壳） */
.mn-login-card {
  margin: 16px 0 0;
  padding: 40px 16px;
  border-top: 1px solid var(--color-border-light);
  border-bottom: 1px solid var(--color-border-light);
  border-radius: 0;
  background: var(--color-surface-white);
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

/* 用户信息区：设计稿通栏 #ff5a1f 色块（390×144），仅底部圆角，无边框无阴影
   （10-个人中心/01-个人中心/index.module.scss:29-45 .container4） */
.mn-profile {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin: 0;
  min-height: 144px;
  padding: 32px 52px 48px 12px;
  background: var(--color-primary);
  border-radius: 0 0 24px 24px;
}

.mn-avatar-img {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
}

/* 无头像兜底：橙底上用白色系（设计稿 .userAvatar 为白色半透明描边 + 白字，:47-67） */
.mn-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 22px;
  font-weight: 700;
}

.mn-user {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  min-width: 0;
}

.mn-nickname {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #ffffff;
}

.mn-account {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

/* 功能入口分组：设计稿通栏白底（无圆角、无左右 margin）+ 浅阴影 + 「常用功能」标题行
   （10-个人中心/01-个人中心/index.module.scss:345-449 .servicesArea） */
.mn-menu {
  margin: 16px 0 0;
  background: var(--color-surface-white);
  border-radius: 0;
  box-shadow: 0 1px 2px #0000000d;
  overflow: hidden;
}

.mn-menu-heading {
  margin: 0;
  padding: 12px 16px 11px;
  border-bottom: 1px solid var(--color-border-light);
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  color: var(--color-text-primary);
}

.mn-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px 11px;
  border: none;
  border-bottom: 1px solid var(--color-border-light);
  background: none;
  font-size: 15px;
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
}

/* 末行无下边线（设计稿 .link3 padding 12px 16px，:436-448） */
.mn-item:last-child {
  padding-bottom: 12px;
  border-bottom: none;
}

.mn-arrow {
  color: #ccc;
  font-size: 18px;
}

/* 退出登录：设计稿无此块（PRD 要求保留功能），外观按功能入口分组同族的通栏白条处理
   —— 满宽、零圆角、1px 上下边线，不再自加卡片壳（复刻约定 2.2） */
.mn-logout-section {
  margin: 16px 0 0;
}

.mn-logout {
  width: 100%;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border-light);
  border-bottom: 1px solid var(--color-border-light);
  border-radius: 0;
  background: var(--color-surface-white);
  color: #ba1a1a;
  font-size: 15px;
  font-weight: 600;
}

/* 页脚版本号：设计稿 .text12（10-个人中心/01-个人中心/index.module.scss:451-460）
   margin-top 36px、字号 10px、行高 14px、色 #999999 */
.mn-footer {
  margin-top: 36px;
  padding: 0;
  text-align: center;
  font-size: 10px;
  line-height: 14px;
  color: #999999;
}

/* AI 点餐助手条目（AI点餐助手前端PRD §2.3）：带对话图标 */
.mn-item-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.mn-item-icon {
  width: 18px;
  height: 18px;
  color: var(--color-primary);
}
</style>
