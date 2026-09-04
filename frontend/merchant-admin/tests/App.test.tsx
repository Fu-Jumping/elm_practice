import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('商家后台概览页', () => {
  it('显示工作台、统计信息和最近订单', () => {
    render(<App />)

    expect(screen.getByText('商家工作台')).toBeTruthy()
    expect(screen.getByText('今日订单')).toBeTruthy()
    expect(screen.getByText('最近订单')).toBeTruthy()
    expect(screen.getByText('#10234')).toBeTruthy()
  })
})