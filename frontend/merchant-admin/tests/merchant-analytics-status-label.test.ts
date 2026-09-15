/**
 * 统计页「状态分布」中文映射的红测试（TDD 红）
 *
 * 背景：后端 `GET /merchant/analytics` 的 `statusDistribution[].name` 返回订单状态**枚举名**
 * （`PENDING`/`PROCESSING`/`COMPLETED` 等，2026-09-14 线上实测），而商家端全站其他位置的状态
 * 文案均为中文（订单列表/详情用 `orderStatusLabel`）。统计页直接渲染枚举名导致同一屏出现中英混排。
 *
 * 本文件为映射补齐前的失败测试：`merchantRules` 尚未导出状态文案映射（现定义在 `App.tsx`），
 * 首次运行必须失败（模块导出缺失）。修复时不得删除或放宽断言。
 */
import { describe, expect, it } from 'vitest'
import { localizeStatusDistribution, orderStatusLabel } from '../src/merchantRules'

describe('统计页状态分布中文映射', () => {
  it('订单状态枚举应映射为与订单列表一致的中文文案', () => {
    expect(orderStatusLabel('PENDING_PAYMENT')).toBe('待支付')
    expect(orderStatusLabel('PENDING')).toBe('待接单')
    expect(orderStatusLabel('COOKING')).toBe('制作中')
    expect(orderStatusLabel('DELIVERING')).toBe('配送中')
    expect(orderStatusLabel('PROCESSING')).toBe('进行中')
    expect(orderStatusLabel('COMPLETED')).toBe('已完成')
    expect(orderStatusLabel('CANCELLED')).toBe('已取消')
  })

  it('状态分布应本地化后端枚举名，并保留数值与顺序', () => {
    const rows = localizeStatusDistribution([
      { name: 'COMPLETED', value: 1 },
      { name: 'PENDING', value: 4 },
      { name: 'PROCESSING', value: 6 },
    ])
    expect(rows.map((row) => row.name)).toEqual(['已完成', '待接单', '进行中'])
    expect(rows.map((row) => row.value)).toEqual([1, 4, 6])
  })

  it('未知状态名保持原样，不丢数据', () => {
    expect(localizeStatusDistribution([{ name: 'UNKNOWN_STATE', value: 2 }])).toEqual([
      { name: 'UNKNOWN_STATE', value: 2 },
    ])
  })
})
