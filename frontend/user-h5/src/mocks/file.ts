/**
 * 文件上传域 mock（契约 §10.1）——骨架：先只完成注册与「成功即返回可访问地址」的最简形态，
 * 类型/大小校验与 fileName 生成规则由紧随其后的 `feat:` 提交实现（TDD：先红后绿）。
 *
 * 契约要点（实现时逐条对齐）：
 * - 单张 multipart，字段 `file`，可选 `scene`=product/review；一次只上传一张
 * - 类型仅 image/jpeg、image/png、image/webp；单张 ≤ 2MB；0 字节拒绝
 * - 非法返回 400（`details` 说明限制）；文件名由后端生成、不使用用户原始文件名（防路径穿越）
 * - 响应 { url, fileName, size, contentType }，url 经静态映射 /uploads/** 访问
 * - 权限（未登录 401、越权 403）属后端职责；替身无会话态，故在替身层不模拟，留待 real 模式联调（TC-IMG-005）
 */
import type { MockHandler } from './index'
import { ok } from './index'
import type { UploadedImage } from '@/services/api/file'

export const fileMocks: Record<string, MockHandler> = {
  'POST /files/images': (): ReturnType<typeof ok<UploadedImage>> =>
    ok<UploadedImage>({ url: '/uploads/placeholder.jpg', fileName: 'placeholder.jpg', size: 1, contentType: 'image/jpeg' }),
}
