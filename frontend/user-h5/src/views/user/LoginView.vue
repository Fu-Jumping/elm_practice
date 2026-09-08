<script setup lang="ts">
/**
 * 登录页（视觉真源：docs/design/exports/用户端/01-登录注册，390 宽）
 * 2026-09-07 TDD 落地（L1-L7）：
 * - 必填检查复用注册校验器（validateAccount/validatePassword，与后端同口径）；校验不过不发请求
 * - 只发一次登录请求；请求中按钮禁用显示"登录中"（XA-05 防重复提交，PRD 登录表单行）
 * - 成功按 redirect 跳转（仅允许站内路径，防开放重定向），无 redirect 去首页
 * - 失败保留账号、清空密码（安全约定），错误提示由 http 层统一 toast（A6：不泄露账号存在性）
 * - 演示账号按钮：只显示账号不显示密码，点击自动填充并按演示流程提交（PRD 演示账号区行）
 * - 已登录访问按目标地址处理；商家入口为占位提示（商家端为独立桌面 Web，PRD 底部链接行）
 */
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { validateAccount, validatePassword } from '@/services/validators'
import { useSessionStore } from '@/stores/sessionStore'
import { toast } from '@/utils/toast'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()

const DEMO_ACCOUNT = '13800000001'
/** 演示密码只存在于提交载荷，不在页面文案中显示（PRD：页面只显示账号） */
const DEMO_PASSWORD = '123456'

const form = reactive({ account: '', password: '' })
const errors = reactive<{ account: string; password: string }>({ account: '', password: '' })
const submitting = ref(false)

/** 站内跳转目标校验：仅允许根相对路径，防开放重定向 */
const redirectTarget = computed(() => {
  const raw = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  return '/'
})

// 已登录访问登录页：按目标地址处理（PRD 底部链接行）
if (sessionStore.isLoggedIn) {
  void router.replace(redirectTarget.value)
}

/** 必填/格式检查（PRD：先做必填检查，格式不合格不请求） */
function validate(): boolean {
  errors.account = validateAccount(form.account) ?? ''
  errors.password = validatePassword(form.password) ?? ''
  return !errors.account && !errors.password
}

async function submit(): Promise<void> {
  if (submitting.value) return
  if (!validate()) return
  submitting.value = true
  try {
    await sessionStore.login(form.account.trim(), form.password)
    await router.replace(redirectTarget.value)
  } catch {
    // 失败停留登录页：保留账号、清空密码（PRD 安全约定）；提示由 http 层统一 toast
    form.password = ''
  } finally {
    submitting.value = false
  }
}

/** 演示账号：填充账号并按演示流程提交（PRD：点击演示账号填充账号并提交登录） */
function loginWithDemo(): void {
  form.account = DEMO_ACCOUNT
  form.password = DEMO_PASSWORD
  void submit()
}

function goRegister(): void {
  void router.push({ name: 'register' })
}

/** 商家入口占位：商家端为独立桌面 Web 后台，不在用户端 H5 内（PRD：未实现入口明确提示） */
function merchantEntry(): void {
  toast('商家端请在桌面浏览器访问，暂未开放')
}
</script>

<template>
  <div class="login-page">
    <!-- 品牌区（固定文案，不触发请求） -->
    <section class="lg-brand">
      <h1 class="lg-title">轻量外卖</h1>
      <p class="lg-welcome">欢迎回来</p>
    </section>

    <!-- 登录表单 -->
    <form class="lg-form" @submit.prevent="submit">
      <div class="lg-field">
        <input
          v-model="form.account"
          class="lg-input"
          data-testid="input-account"
          type="text"
          inputmode="numeric"
          maxlength="11"
          placeholder="手机号"
          autocomplete="username"
        />
        <p v-if="errors.account" class="lg-error" data-testid="error-account">{{ errors.account }}</p>
      </div>
      <div class="lg-field">
        <input
          v-model="form.password"
          class="lg-input"
          data-testid="input-password"
          type="password"
          maxlength="20"
          placeholder="密码"
          autocomplete="current-password"
        />
        <p v-if="errors.password" class="lg-error" data-testid="error-password">
          {{ errors.password }}
        </p>
      </div>
      <button
        class="lg-submit"
        type="submit"
        data-testid="login-btn"
        :disabled="submitting"
      >
        {{ submitting ? '登录中' : '登录' }}
      </button>
    </form>

    <!-- 演示账号区（只显示账号，不显示密码） -->
    <section class="lg-demo">
      <button class="lg-demo-btn" type="button" data-testid="demo-account-btn" :disabled="submitting" @click="loginWithDemo">
        一键登录演示账号：{{ DEMO_ACCOUNT }}
      </button>
    </section>

    <!-- 底部链接 -->
    <footer class="lg-footer">
      <button class="lg-link" type="button" data-testid="register-link" @click="goRegister">
        没有账号？去注册
      </button>
      <span class="lg-divider">|</span>
      <button class="lg-link" type="button" data-testid="merchant-entry" @click="merchantEntry">
        商家入口
      </button>
    </footer>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #f9f9f9;
  padding: 64px 24px 32px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.lg-brand {
  text-align: center;
  margin-bottom: 32px;
}

.lg-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #ff5a1f;
}

.lg-welcome {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
}

.lg-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.lg-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lg-input {
  height: 46px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 15px;
  color: #1a1c1c;
  background: #fff;
  box-sizing: border-box;
}

.lg-error {
  font-size: 12px;
  color: #ba1a1a;
}

.lg-submit {
  height: 46px;
  border: none;
  border-radius: 10px;
  background: #ff5a1f;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin-top: 6px;
}

.lg-submit:disabled {
  opacity: 0.5;
}

.lg-demo {
  margin-top: 24px;
  text-align: center;
}

.lg-demo-btn {
  border: 1px solid #ff5a1f;
  border-radius: 10px;
  background: rgba(255, 90, 31, 0.06);
  color: #ff5a1f;
  font-size: 14px;
  padding: 10px 18px;
}

.lg-demo-btn:disabled {
  opacity: 0.5;
}

.lg-footer {
  margin-top: auto;
  padding-top: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.lg-link {
  border: none;
  background: none;
  color: #666;
  font-size: 13px;
}

.lg-divider {
  color: #e5e5e5;
  font-size: 13px;
}
</style>
