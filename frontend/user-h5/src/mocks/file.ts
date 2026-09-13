/**
 * 文件上传域 mock（契约 §10.1）——替身与页面同批落地，真实后端（`TODO-BE-010`）就绪后切 real 模式即可。
 *
 * 规则（逐条对齐契约 §10.1）：
 * - 单张 multipart，字段 `file`（必填），可选 `scene`=product/review
 * - 类型仅 image/jpeg、image/png、image/webp；单张 ≤ 2MB；0 字节拒绝；缺文件拒绝 → 一律 400
 * - 文件名由「后端」生成、**不使用用户原始文件名**（防路径穿越）；响应 { url, fileName, size, contentType }
 * - url 经静态映射 /uploads/** 访问（真实后端把文件写到 backend/uploads/，本次不落盘、只回地址）
 * - 权限（未登录 401 / 越权 403）属后端职责：替身无会话态，在替身层不模拟，留待 real 模式联调（TC-IMG-005）
 */
import type { UploadedImage } from '@/services/api/file'
import type { MockHandler } from './index'
import { fail, ok } from './index'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024

/** 文件名序号：保证同一次会话内不重名（真实后端由存储层生成） */
let fileSeq = 1

function extensionOf(contentType: string): string {
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/webp') return 'webp'
  return 'jpg'
}

export const fileMocks: Record<string, MockHandler> = {
  'POST /files/images': ({ data }): ReturnType<typeof ok<UploadedImage>> | ReturnType<typeof fail> => {
    const form = data as FormData | undefined
    const file = form && typeof form.get === 'function' ? form.get('file') : null
    if (!file || typeof file === 'string') {
      return fail(400, 40000, '缺少图片文件（字段 file）')
    }
    const upload = file as File
    if (!ALLOWED_TYPES.includes(upload.type)) {
      return fail(400, 40000, '仅支持 jpg / jpeg / png / webp 格式的图片')
    }
    if (upload.size <= 0) {
      return fail(400, 40000, '图片内容为空，请重新选择')
    }
    if (upload.size > MAX_BYTES) {
      return fail(400, 40000, '单张图片不能超过 2MB')
    }
    // 文件名由后端生成：不使用用户原始文件名，避免路径穿越
    const fileName = `review-${Date.now()}-${fileSeq++}.${extensionOf(upload.type)}`
    return ok<UploadedImage>({
      url: `/uploads/${fileName}`,
      fileName,
      size: upload.size,
      contentType: upload.type,
    })
  },
}
