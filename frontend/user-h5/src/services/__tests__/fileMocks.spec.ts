import { describe, expect, it } from 'vitest'
import { mockDispatch } from '@/mocks'
import type { UploadedImage } from '@/services/api/file'
import { REVIEW_IMAGE_MAX_BYTES } from '@/utils/reviewImage'

/**
 * 上传替身规则（契约 §10.1）——FM 组
 * FM-1 合法上传返回 url/fileName/size/contentType；FM-2 类型/大小/空文件 400；FM-3 缺 file 400；
 * FM-4 fileName 由「后端」生成、不使用用户原始文件名（防路径穿越）
 */
function formWith(file: File | null, scene = 'review'): FormData {
  const form = new FormData()
  if (file) form.append('file', file)
  form.append('scene', scene)
  return form
}

function makeFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size, configurable: true })
  return file
}

async function upload(file: File | null, scene = 'review') {
  return mockDispatch({ method: 'POST', url: '/files/images', data: formWith(file, scene) })
}

describe('上传替身规则（契约 §10.1）', () => {
  it('FM-1 合法图片：返回可访问 url 与 fileName/size/contentType', async () => {
    const res = await upload(makeFile('photo.jpg', 'image/jpeg', 1024))
    expect(res.status).toBe(200)
    const data = res.payload.data as UploadedImage
    expect(data.url.startsWith('/uploads/')).toBe(true)
    expect(data.fileName.length).toBeGreaterThan(0)
    expect(data.size).toBe(1024)
    expect(data.contentType).toBe('image/jpeg')
  })

  it('FM-2 类型不在白名单 / 超过 2MB / 0 字节 → 400', async () => {
    for (const file of [
      makeFile('a.gif', 'image/gif', 1024),
      makeFile('b.txt', 'text/plain', 1024),
      makeFile('big.png', 'image/png', REVIEW_IMAGE_MAX_BYTES + 1),
      makeFile('empty.png', 'image/png', 0),
    ]) {
      const res = await upload(file)
      expect(res.status, `${file.name} 应 400`).toBe(400)
    }
  })

  it('FM-3 缺少 file 字段 → 400（不落盘）', async () => {
    const res = await upload(null)
    expect(res.status).toBe(400)
  })

  it('FM-4 fileName 由「后端」生成，不使用用户原始文件名（防路径穿越）', async () => {
    const res = await upload(makeFile('../../etc/passwd.jpg', 'image/jpeg', 512))
    expect(res.status).toBe(200)
    const data = res.payload.data as UploadedImage
    expect(data.fileName).not.toContain('..')
    expect(data.fileName).not.toContain('/')
    expect(data.url).not.toContain('..')
  })
})
