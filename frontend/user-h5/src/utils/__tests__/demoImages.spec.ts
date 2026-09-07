import { describe, expect, it } from 'vitest'
import { productImageSrc, storeImageSrc } from '../demoImages'

/**
 * 演示图片解析工具测试 P1–P4（2026-09-07，口径来自 图片清单.md，AI 辅助脚手架）
 * 素材：组长提供的 demo-images 素材包（25 张），URL 口径 /demo-images/<文件名>
 * 兜底链：接口 image 非空 → 用接口值；为空 → 演示映射（productId/storeId 对照表）；
 * 无映射 → 通用占位图（商品）/空串（店铺，横幅回退渐变）
 */
describe('productImageSrc 商品图片解析', () => {
  it('P1 接口 image 非空 → 直接使用接口值（后端 seed 填图后优先）', () => {
    expect(productImageSrc('p101', '/cdn/real.jpg')).toBe('/cdn/real.jpg')
  })

  it('P2 接口 image 为空 → 演示映射命中（p101 → product-m002-01.jpg）', () => {
    expect(productImageSrc('p101', '')).toBe('/demo-images/product-m002-01.jpg')
    expect(productImageSrc('p208', '')).toBe('/demo-images/product-m005-01.jpg')
  })

  it('P3 接口为空且无映射 → 通用占位图', () => {
    expect(productImageSrc('p999', '')).toContain('product-thumb')
  })
})

describe('storeImageSrc 店招图片解析', () => {
  it('P4 接口 image 为空 → 按 storeId 演示映射（m002 → store-m002.jpg）；未知店返回空串', () => {
    expect(storeImageSrc('m002', '')).toBe('/demo-images/store-m002.jpg')
    expect(storeImageSrc('m999', '')).toBe('')
  })

  it('P5 接口 image 非空 → 直接使用接口值', () => {
    expect(storeImageSrc('m002', '/cdn/store.jpg')).toBe('/cdn/store.jpg')
  })
})
