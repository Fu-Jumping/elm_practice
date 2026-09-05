/**
 * 注册表单校验器（TC-ACC-002~006/008/009、PRD 7.16.1 注册表单验收列）
 * 口径：账号 = 11 位手机号；密码 6-20 位（TC-ACC-007 复杂度待 SRS 固化后回填，本期不测）
 * 返回形态：字段级返回错误消息（null = 通过）；表单级逐字段返回错误对象（空对象 = 通过）
 * 前端校验仅为用户体验层（校验不过不发请求）；业务规则以后端兜底为准（契约 §3.1）
 * 本文件 9/5 起按 TDD 实现（测试场景由人设计，AI 只辅助脚手架）
 */

export interface RegisterForm {
  account: string
  password: string
  confirmPassword: string
  nickname: string
  agreement: boolean
}

export type RegisterFormErrors = Partial<
  Record<'account' | 'password' | 'confirmPassword' | 'nickname' | 'agreement', string>
>

/** 手机号校验：必填 + 11 位纯数字 */
export function validateAccount(_account: string): string | null {
  // TODO(9/5 TDD)：实现手机号校验，测试见 __tests__/validators.spec.ts
  throw new Error('validateAccount 待 9/5 TDD 实现')
}

/** 密码校验：必填 + 6-20 位 */
export function validatePassword(_password: string): string | null {
  // TODO(9/5 TDD)：实现密码校验，测试见 __tests__/validators.spec.ts
  throw new Error('validatePassword 待 9/5 TDD 实现')
}

/** 注册表单校验：必填、两次密码一致、协议勾选（TC-ACC-009），纯函数不发请求 */
export function validateRegisterForm(_form: RegisterForm): RegisterFormErrors {
  // TODO(9/5 TDD)：实现表单校验，测试见 __tests__/validators.spec.ts
  throw new Error('validateRegisterForm 待 9/5 TDD 实现')
}
