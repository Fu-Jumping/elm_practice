import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('商家端第一批失败测试', () => {
  it('应提供商家登录入口', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '商家登录' })).toBeTruthy()
    expect(screen.getByLabelText('账号')).toBeTruthy()
    expect(screen.getByLabelText('密码')).toBeTruthy()
  })

  it('应提供营业状态切换并限制非法状态', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: '保存营业状态' })).toBeTruthy()
    expect(screen.queryByText('PAUSED')).toBeNull()
  })

  it('应提供商品表单并显示价格和库存校验', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: '新增商品' })).toBeTruthy()
    expect(screen.getByLabelText('商品价格')).toBeTruthy()
    expect(screen.getByLabelText('商品库存')).toBeTruthy()
  })
})