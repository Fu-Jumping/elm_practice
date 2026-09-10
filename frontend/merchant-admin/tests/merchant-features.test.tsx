import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../src/App'
import { merchantApi } from '../src/services/merchantApi'

beforeEach(async () => {
  window.location.hash = ''
  await merchantApi.login('merchant-a', '123456')
})

describe('商家端 P0 页面入口', () => {
  it('提供商家登录入口', async () => {
    await merchantApi.logout()
    render(<App />)

    expect(await screen.findByRole('heading', { name: '校园外卖商家版' })).toBeTruthy()
    expect(screen.getByLabelText('账号')).toBeTruthy()
    expect(screen.getByLabelText('密码')).toBeTruthy()
  })

  it('提供三种营业状态，不展示非法状态', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('menuitem', { name: '店铺设置' }))
    expect(await screen.findByLabelText('营业状态')).toBeTruthy()
    expect(screen.queryByText('PAUSED')).toBeNull()
  })

  it('新增商品时显示价格和库存校验', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('menuitem', { name: '商品管理' }))
    await user.click(await screen.findByRole('button', { name: '新增商品' }))

    expect(await screen.findByLabelText('商品价格（元）')).toBeTruthy()
    expect(screen.getByLabelText('商品库存')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /保\s*存/ }))
    expect(await screen.findByText('请输入商品名称')).toBeTruthy()
  })
})
