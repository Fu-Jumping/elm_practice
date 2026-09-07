import { describe, expect, it } from 'vitest'
import { validateAccount, validatePassword, validateRegisterForm } from '../validators'

// 用户端第二批 TDD 用例 C1–C7 / D1–D4（2026-09-05 用例清单由人拍板）
// 依据：契约 §3.1、TC-ACC-002~006/008/009、PRD 7.16.1 注册表单验收列
// 口径：账号 = 11 位手机号；密码 6-20 位（TC-ACC-007 复杂度待 SRS 固化后回填，本期不测）
// 断言形态：字段校验 string | null（null = 通过）；表单校验错误对象（空对象 = 通过）

describe('validateAccount 手机号校验（TC-ACC-002~004）', () => {
  it('C1 手机号只有 10 位 → 拒绝且提示格式错误（TC-ACC-002）', () => {
    expect(validateAccount('1380000000')).toBe('手机号格式错误')
  })

  it('C2 手机号有 12 位 → 拒绝且提示格式错误（TC-ACC-003）', () => {
    expect(validateAccount('138000000001')).toBe('手机号格式错误')
  })

  it('C3 手机号包含字母 → 拒绝且提示格式错误（TC-ACC-004）', () => {
    expect(validateAccount('138abc00000')).toBe('手机号格式错误')
  })

  it('C4 合法 11 位手机号 → 通过（正常锚定）', () => {
    expect(validateAccount('13800000000')).toBeNull()
  })
})

describe('validatePassword 密码校验（TC-ACC-006/008）', () => {
  it('C5 密码 5 位 → 拒绝且提示长度（TC-ACC-006）', () => {
    expect(validatePassword('12345')).toBe('密码长度须为 6-20 位')
  })

  it('C6 密码 21 位 → 拒绝且提示长度（TC-ACC-008 镜像）', () => {
    expect(validatePassword('123456123456123456123')).toBe('密码长度须为 6-20 位')
  })

  it('C7 合法 6 位密码 → 通过（下边界锚定）', () => {
    expect(validatePassword('123456')).toBeNull()
  })
})

describe('validateRegisterForm 表单校验（TC-ACC-009）', () => {
  it('D1 必填全空 → 五个字段逐项提示', () => {
    expect(
      validateRegisterForm({ account: '', password: '', confirmPassword: '', nickname: '', agreement: false }),
    ).toEqual({
      account: '手机号不能为空',
      password: '密码不能为空',
      confirmPassword: '请再次输入密码',
      nickname: '昵称不能为空',
      agreement: '请先阅读并勾选协议',
    })
  })

  it('D2 两次密码不一致 → 仅确认密码一项报错', () => {
    expect(
      validateRegisterForm({
        account: '13800000000',
        password: '123456',
        confirmPassword: '1234567',
        nickname: '张同学',
        agreement: true,
      }),
    ).toEqual({ confirmPassword: '两次输入的密码不一致' })
  })

  it('D3 协议未勾选 → 仅协议一项报错（TC-ACC-009）', () => {
    expect(
        validateRegisterForm({
            account: '13800000000',
            password: '123456',
            confirmPassword: '123456',
            nickname: '张同学',
            agreement: false,
        }),
    ).toEqual({ agreement: '请先阅读并勾选协议' })
  })

  it('D4 全部合规 → 无任何错误', () => {
    expect(
      validateRegisterForm({
        account: '13800000000',
        password: '123456',
        confirmPassword: '123456',
        nickname: '张同学',
        agreement: true,
      }),
    ).toEqual({})
  })
})