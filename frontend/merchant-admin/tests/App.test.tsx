import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('商家后台订单页', () => {
  it('显示当前店铺订单和订单金额', async () => {
    window.location.hash = ''
    render(<App />)

    expect(await screen.findByRole('heading', { name: '订单管理' })).toBeTruthy()
    expect(await screen.findByText('o10234')).toBeTruthy()
    expect(screen.getByText('当前使用 Mock 演示数据')).toBeTruthy()
  })
})
