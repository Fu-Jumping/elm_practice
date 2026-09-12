import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../src/App'
import { merchantApi } from '../src/services/merchantApi'

beforeEach(async () => {
  window.location.hash = ''
  await merchantApi.login('merchant-a', '123456')
})

describe('第二阶段商家端页面入口', () => {
  it('侧边栏平铺九项一期导航', async () => {
    render(<App />)
    for (const name of ['运营概览', '订单管理', '商品管理', '分类管理', '优惠配置', '评价管理', '消息', '数据统计', '店铺设置']) {
      expect(await screen.findByRole('menuitem', { name })).toBeTruthy()
    }
  })

  it('优惠、评价、消息和统计入口打开对应页面', async () => {
    const user = userEvent.setup()
    render(<App />)
    for (const [menu, heading] of [['优惠配置', '优惠配置'], ['评价管理', '评价管理'], ['消息', '消息'], ['数据统计', '数据统计']] as const) {
      await user.click(await screen.findByRole('menuitem', { name: menu }))
      expect(await screen.findByRole('heading', { name: heading })).toBeTruthy()
    }
  })

  it('订单提供已取消筛选，商品提供图片与规格字段，分类提供批量绑定入口', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('menuitem', { name: '订单管理' }))
    expect(await screen.findByRole('combobox', { name: '订单状态筛选' })).toBeTruthy()

    await user.click(screen.getByRole('menuitem', { name: '商品管理' }))
    await user.click(await screen.findByRole('button', { name: '新增商品' }))
    expect(await screen.findByText('商品图片')).toBeTruthy()
    expect(screen.getByText('商品规格')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '取 消' }))

    await user.click(screen.getByRole('menuitem', { name: '分类管理' }))
    expect((await screen.findAllByRole('button', { name: '绑定商品' })).length).toBeGreaterThan(0)
  })
})
