/**
 * 评价图片校验（PRD 7.16.1「评价订单页-评价内容区」检查列 + 契约 §10.1 定稿限制）：
 * 类型仅 jpg/jpeg/png/webp、单张 ≤ 2MB、评价图最多 3 张。
 * 抽成纯函数：页面在选择文件时**立即提示**，同时便于单测覆盖全部边界（TC-IMG-003/007）。
 *
 * 说明：前端校验只做用户体验层，后端仍按契约再次校验（400）；真实后端实现见 `TODO-BE-010`。
 */
export const REVIEW_IMAGE_LIMIT = 3
export const REVIEW_IMAGE_MAX_BYTES = 2 * 1024 * 1024
export const REVIEW_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
/** 提示文案中展示的可读格式（与 types 白名单一一对应） */
export const REVIEW_IMAGE_TYPE_LABEL = 'jpg / jpeg / png / webp'

/** 单张图片的最小校验输入（File 与测试替身都可满足） */
export interface ReviewImageLike {
  type: string
  size: number
}

/**
 * 校验一张待上传的评价图。
 * @param file 待校验文件（浏览器为 File）
 * @param currentCount 当前已选张数（含上传成功与失败保留的本地选择）
 * @returns 错误提示文案；合法返回 null
 */
export function validateReviewImage(file: ReviewImageLike, currentCount: number): string | null {
  if (currentCount >= REVIEW_IMAGE_LIMIT) return `最多上传 ${REVIEW_IMAGE_LIMIT} 张图片`
  if (!(REVIEW_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `仅支持 ${REVIEW_IMAGE_TYPE_LABEL} 格式的图片`
  }
  if (file.size <= 0) return '图片内容为空，请重新选择'
  if (file.size > REVIEW_IMAGE_MAX_BYTES) return '单张图片不能超过 2MB'
  return null
}
