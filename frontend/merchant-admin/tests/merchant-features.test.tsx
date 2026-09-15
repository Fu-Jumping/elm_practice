import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('关闭配送费优惠开关后保存，提交的门槛为 0（后端以门槛 0 表示不启用）', async () => {
    const user = userEvent.setup()
    const savePromotion = vi.spyOn(merchantApi, 'savePromotion')
    render(<App />)

    await user.click(await screen.findByRole('menuitem', { name: '优惠配置' }))
    const card = (await screen.findByText('配送费优惠')).closest('.ant-card') as HTMLElement
    const toggle = within(card).getByRole('switch')
    if (toggle.getAttribute('aria-checked') === 'true') await user.click(toggle)
    await user.click(screen.getByRole('button', { name: '保存优惠配置' }))

    await waitFor(() => expect(savePromotion).toHaveBeenCalled())
    expect(savePromotion.mock.calls[0][0]).toMatchObject({ freeDeliveryEnabled: false, freeDeliveryThreshold: 0 })
    savePromotion.mockRestore()
  })

  it('启用配送费优惠但门槛为 0 时提示门槛须大于 0', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('menuitem', { name: '优惠配置' }))
    const card = (await screen.findByText('配送费优惠')).closest('.ant-card') as HTMLElement
    const threshold = within(card).getByLabelText('免配送费门槛')
    await user.clear(threshold)
    await user.type(threshold, '0')
    const toggle = within(card).getByRole('switch')
    if (toggle.getAttribute('aria-checked') === 'false') await user.click(toggle)
    await user.click(screen.getByRole('button', { name: '保存优惠配置' }))

    expect(await screen.findByText(/门槛须大于 0/)).toBeTruthy()
  })
})
