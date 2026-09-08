<script setup lang="ts">
/**
 * 注册页（视觉真源：docs/design/exports/用户端/01-登录注册/02-注册，390 宽；与登录页同族简化风格）
 * 2026-09-08 TDD 落地（R1-R9）：
 * - 顶部栏（PRD 注册页-顶部栏行）：返回目标为登录页；空表单直接返回，有内容先确认放弃（确认返回/取消保留输入）
 * - 表单（PRD 注册页-注册表单行）：手机号/昵称/密码/确认密码/协议；字段规则复用 validateRegisterForm（与后端同口径）
 * - 提交：先前端检查再请求注册接口；请求中按钮禁用防重复提交（XA-05）；成功提示后回登录页，不建立会话（重新登录验证）
 * - 失败保留全部已填内容（PRD：失败保留已填内容；账号已存在时保留账号和昵称供修改）；错误提示由 http 层统一 toast
 * - 协议链接为静态文本（导出稿即 span；PRD 未定义跳转目标，不新增入口）
 * - 已登录访问不重定向（PRD 未约定，不外推登录页行为）
 */
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { validateRegisterForm, type RegisterForm, type RegisterFormErrors } from '@/services/validators'
import { useSessionStore } from '@/stores/sessionStore'
import { toast } from '@/utils/toast'

const router = useRouter()
const sessionStore = useSessionStore()

const form = reactive<RegisterForm>({
  account: '',
  password: '',
  confirmPassword: '',
  nickname: '',
  agreement: false,
})
const errors = reactive<RegisterFormErrors>({})
const submitting = ref(false)

/** 必填/格式/一致性检查（PRD：先做前端检查，逐项提示；校验不过不发请求） */
function validate(): boolean {
  const result = validateRegisterForm({ ...form })
  errors.account = result.account ?? ''
  errors.password = result.password ?? ''
  errors.confirmPassword = result.confirmPassword ?? ''
  errors.nickname = result.nickname ?? ''
  errors.agreement = result.agreement ?? ''
  return Object.keys(result).length === 0
}

/** 回登录页：优先历史返回（保留登录页原状态），无历史时兜底 replace（PRD：返回目标为登录页） */
async function goLogin(): Promise<void> {
  if (window.history.state?.back != null) {
    router.back()
    return
  }
  await router.replace({ name: 'login' })
}

/** 顶部栏返回（PRD：表单无内容直接返回；有内容先确认放弃，取消则保留输入） */
function onBack(): void {
  const dirty =
    form.account !== '' ||
    form.nickname !== '' ||
    form.password !== '' ||
    form.confirmPassword !== '' ||
    form.agreement
  if (dirty && !window.confirm('表单已填写，确定放弃并返回登录页吗？')) return
  void goLogin()
}

async function submit(): Promise<void> {
  if (submitting.value) return
  if (!validate()) return
  submitting.value = true
  try {
    await sessionStore.register({
      account: form.account.trim(),
      password: form.password,
      nickname: form.nickname.trim(),
    })
    // 成功不建立会话：提示后回登录页重新登录（PRD：成功清空密码并返回登录页）
    toast('注册成功，请登录')
    form.password = ''
    form.confirmPassword = ''
    await goLogin()
  } catch {
    // 失败停留注册页：保留全部已填内容（PRD 注册表单行）；提示由 http 层统一 toast
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <!-- 顶部栏（固定元素：返回登录页 + 标题） -->
    <header class="rg-topbar">
      <button
        class="rg-back"
        type="button"
        data-testid="topbar-back"
        aria-label="返回登录页"
        @click="onBack"
      >
        ‹
      </button>
      <h1 class="rg-title">注册账号</h1>
    </header>

    <!-- 品牌区（固定文案，不触发请求） -->
    <section class="rg-brand">
      <p class="rg-brand-name">轻量外卖</p>
      <p class="rg-brand-welcome">欢迎加入，发现校园美食</p>
    </section>

    <!-- 注册表单 -->
    <form class="rg-form" @submit.prevent="submit">
      <div class="rg-field">
        <label class="rg-label" for="reg-account">手机号</label>
        <input
          id="reg-account"
          v-model="form.account"
          class="rg-input"
          data-testid="input-account"
          type="text"
          inputmode="numeric"
          maxlength="11"
          placeholder="请输入手机号"
          autocomplete="username"
        />
        <p v-if="errors.account" class="rg-error" data-testid="error-account">{{ errors.account }}</p>
      </div>
      <div class="rg-field">
        <label class="rg-label" for="reg-nickname">昵称</label>
        <input
          id="reg-nickname"
          v-model="form.nickname"
          class="rg-input"
          data-testid="input-nickname"
          type="text"
          maxlength="20"
          placeholder="设置你的昵称"
          autocomplete="nickname"
        />
        <p v-if="errors.nickname" class="rg-error" data-testid="error-nickname">
          {{ errors.nickname }}
        </p>
      </div>
      <div class="rg-field">
        <label class="rg-label" for="reg-password">密码</label>
        <input
          id="reg-password"
          v-model="form.password"
          class="rg-input"
          data-testid="input-password"
          type="password"
          maxlength="20"
          placeholder="设置6-20位密码"
          autocomplete="new-password"
        />
        <p v-if="errors.password" class="rg-error" data-testid="error-password">
          {{ errors.password }}
        </p>
      </div>
      <div class="rg-field">
        <label class="rg-label" for="reg-confirm-password">确认密码</label>
        <input
          id="reg-confirm-password"
          v-model="form.confirmPassword"
          class="rg-input"
          data-testid="input-confirm-password"
          type="password"
          maxlength="20"
          placeholder="再次输入密码"
          autocomplete="new-password"
        />
        <p v-if="errors.confirmPassword" class="rg-error" data-testid="error-confirm-password">
          {{ errors.confirmPassword }}
        </p>
      </div>
      <div class="rg-terms">
        <label class="rg-terms-line">
          <input
            v-model="form.agreement"
            class="rg-checkbox"
            data-testid="agreement-checkbox"
            type="checkbox"
          />
          <span class="rg-terms-text">
            我已阅读并同意&nbsp;<span class="rg-terms-link">《用户服务协议》</span>&nbsp;和&nbsp;<span
              class="rg-terms-link"
              >《隐私政策》</span
            >
          </span>
        </label>
        <p v-if="errors.agreement" class="rg-error" data-testid="error-agreement">
          {{ errors.agreement }}
        </p>
      </div>
      <button
        class="rg-submit"
        type="submit"
        data-testid="register-btn"
        :disabled="submitting"
      >
        {{ submitting ? '注册中' : '立即注册' }}
      </button>
    </form>

    <!-- 底部链接 -->
    <footer class="rg-footer">
      <button class="rg-link" type="button" data-testid="login-link" @click="goLogin">
        已有账号？去登录
      </button>
    </footer>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  background: var(--color-background);
  padding: 0 24px 32px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* 顶部栏：负边距通栏，内部再留边距 */
.rg-topbar {
  margin: 0 -24px;
  padding: 8px 12px;
  height: 56px;
  box-sizing: border-box;
  position: relative;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--color-border-light);
}

.rg-back {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 22px;
  line-height: 1;
  color: var(--color-text-primary);
  padding: 0;
}

.rg-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  font-size: var(--font-headline-md);
  font-weight: 500;
  color: var(--color-text-primary);
}

.rg-brand {
  text-align: center;
  padding: 24px 0 24px;
}

.rg-brand-name {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--color-primary);
}

.rg-brand-welcome {
  margin: 8px 0 0;
  font-size: var(--font-body-md);
  color: var(--color-text-secondary);
}

.rg-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rg-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rg-label {
  font-size: var(--font-label-md);
  font-weight: 500;
  color: var(--color-text-primary);
}

.rg-input {
  height: 46px;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 0 12px;
  font-size: var(--font-body-lg);
  color: var(--color-text-primary);
  background: var(--color-surface-white);
  box-sizing: border-box;
}

.rg-input::placeholder {
  color: var(--color-text-tertiary);
}

.rg-error {
  font-size: var(--font-label-md);
  color: var(--color-error);
}

.rg-terms {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rg-terms-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.rg-checkbox {
  width: 16px;
  height: 16px;
  margin: 2px 0 0;
  accent-color: var(--color-primary);
  flex-shrink: 0;
}

.rg-terms-text {
  font-size: var(--font-label-md);
  line-height: 17px;
  color: var(--color-text-secondary);
}

.rg-terms-link {
  color: var(--color-primary);
}

.rg-submit {
  height: 46px;
  border: none;
  border-radius: var(--radius-lg);
  background: var(--color-primary);
  color: #fff;
  font-size: var(--font-body-lg);
  font-weight: 600;
  margin-top: 24px;
}

.rg-submit:disabled {
  opacity: 0.5;
}

.rg-footer {
  margin-top: auto;
  padding-top: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rg-link {
  border: none;
  background: none;
  color: var(--color-text-secondary);
  font-size: var(--font-body-md);
  padding: 0;
}
</style>
