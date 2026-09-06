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
export function validateAccount(account: string): string | null {
  // TODO(9/5 TDD)：实现手机号校验，测试见 __tests__/validators.spec.ts
  //throw new Error('validateAccount 待 9/5 TDD 实现')
  if (!account) return '手机号不能为空'
  if (!/^\d{11}$/.test(account)) return '手机号格式错误'
  return null
}

/** 密码校验：必填 + 6-20 位 */
export function validatePassword(password: string): string | null {
  // TODO(9/5 TDD)：实现密码校验，测试见 __tests__/validators.spec.ts
  //throw new Error('validatePassword 待 9/5 TDD 实现')
  if (!password) return '密码不能为空'
  if (password.length < 6 || password.length > 20) return '密码长度须为 6-20 位'
  return null
}

/** 注册表单校验：必填、两次密码一致、协议勾选（TC-ACC-009），纯函数不发请求 */
export function validateRegisterForm(form: RegisterForm): RegisterFormErrors {
  // TODO(9/5 TDD)：实现表单校验，测试见 __tests__/validators.spec.ts
  //throw new Error('validateRegisterForm 待 9/5 TDD 实现')
  const errors: RegisterFormErrors = {}

  const accountError = validateAccount(form.account)
  if (accountError) errors.account = accountError

  const passwordError = validatePassword(form.password)
  if (passwordError) errors.password = passwordError

  if (!form.confirmPassword) {
    errors.confirmPassword = '请再次输入密码'
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = '两次输入的密码不一致'
  }

  if (!form.nickname) errors.nickname = '昵称不能为空'
  if (!form.agreement) errors.agreement = '请先阅读并勾选协议'

  return errors
}

/** 地址表单（契约 §3.3 字段：性别为选择项必有权值，不参与必填校验） */
export interface AddressForm {
  contactName: string
  contactSex: '男' | '女'
  contactPhone: string
  region: string
  detail: string
}

export type AddressFormErrors = Partial<
  Record<'contactName' | 'contactPhone' | 'region' | 'detail', string>
>

/**
 * 地址表单校验（TC-ADR-002 前端体验层，PRD 7.9）：联系人必填、电话 11 位、所在地区/详细地址必填
 * 电话口径与注册手机号一致（validateAccount 同规则拆分提示）；业务规则后端兜底
 */
export function validateAddressForm(form: AddressForm): AddressFormErrors {
  const errors: AddressFormErrors = {}

  if (!form.contactName) errors.contactName = '联系人不能为空'

  if (!form.contactPhone) errors.contactPhone = '手机号不能为空'
  else if (!/^\d{11}$/.test(form.contactPhone)) errors.contactPhone = '手机号格式错误'

  if (!form.region) errors.region = '所在地区不能为空'
  if (!form.detail) errors.detail = '详细地址不能为空'

  return errors
}
