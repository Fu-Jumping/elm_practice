import { describe, expect, it } from 'vitest'
import { mockDispatch } from '@/mocks'
import type { UploadedImage } from '@/services/api/file'
import { REVIEW_IMAGE_LIMIT, REVIEW_IMAGE_MAX_BYTES, validateReviewImage } from '@/utils/reviewImage'

/**
 * 评价图校验纯函数（PRD 7.16.1 评价内容区检查列 + 契约 §10.1）
 * RI-1 类型白名单；RI-2 大小上限；RI-3 0 字节；RI-4 张数上限；RI-5 合法通过
 */
describe('validateReviewImage（评价图本地校验）', () => {
  it('RI-1 类型白名单：jpg/jpeg/png/webp 通过，其余拒绝', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(validateReviewImage({ type, size: 1024 }, 0)).toBeNull()
    }
    for (const type of ['image/gif', 'image/svg+xml', 'text/plain', 'application/pdf', '']) {
      expect(validateReviewImage({ type, size: 1024 }, 0)).toContain('jpg')
    }
  })

  it('RI-2 单张上限 2MB：等于上限通过，超过即拒绝', () => {
    expect(validateReviewImage({ type: 'image/png', size: REVIEW_IMAGE_MAX_BYTES }, 0)).toBeNull()
    expect(
      validateReviewImage({ type: 'image/png', size: REVIEW_IMAGE_MAX_BYTES + 1 }, 0),
    ).toContain('2MB')
  })

  it('RI-3 0 字节文件拒绝（TC-IMG-003）', () => {
    expect(validateReviewImage({ type: 'image/png', size: 0 }, 0)).toContain('为空')
  })

  it('RI-4 张数上限 3 张：达到上限后拒绝第 4 张（TC-IMG-007）', () => {
    expect(validateReviewImage({ type: 'image/png', size: 10 }, REVIEW_IMAGE_LIMIT - 1)).toBeNull()
    expect(validateReviewImage({ type: 'image/png', size: 10 }, REVIEW_IMAGE_LIMIT)).toContain('3 张')
  })
})

