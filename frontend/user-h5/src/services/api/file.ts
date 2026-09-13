/**
 * 文件上传 api（契约 §10.1）：
 * - `POST /files/images`：单张 multipart（字段 `file`，可选 `scene`=product/review）
 * - 响应 { url, fileName, size, contentType }；业务接口只保存 `url`，上传接口本身不写业务表
 * - 多图由前端多次调用；类型/大小/张数限制见 `utils/reviewImage.ts` 与契约 §10.1
 */
import { request } from '@/services/http'
import { endpoints } from './endpoints'

export type UploadScene = 'product' | 'review'

export interface UploadedImage {
  url: string
  fileName: string
  size: number
  contentType: string
}

/** 上传单张图片（评价图 scene=review） */
export function uploadImage(file: File, scene: UploadScene = 'review'): Promise<UploadedImage> {
  const form = new FormData()
  form.append('file', file)
  form.append('scene', scene)
  // 不手动设置 Content-Type：浏览器/axios 需自行带 multipart boundary
  return request<UploadedImage>({ method: 'POST', url: endpoints.file.upload, data: form })
}
