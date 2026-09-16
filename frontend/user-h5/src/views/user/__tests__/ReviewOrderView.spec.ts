import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ReviewOrderView from '../ReviewOrderView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { onToast } from '@/utils/toast'
import { fileApi, orderApi, reviewApi } from '@/services/api'
import type { OrderRecord } from '@/services/api/types'

/**
 * 评价订单页行为测试 TV 组（TODO-USER-003，2026-09-11）
 * 口径出处：PRD 7.7（星级 1-5 / 标签多选 / 文字 / 图片可选；同一订单只允许评价一次）+ PRD 7.16.1 评价订单页三行
 * （顶部栏、评价内容区、提交按钮）+ 契约 §6.2（POST /orders/{orderId}/review、错误码）+ 设计真源
 * `docs/design/exports/用户端/08-评价/01-评价订单/`。
 * 本批口径（负责人 2026-09-11 拍板）：图片区按设计稿渲染占位但**不接上传**（上传属 TODO-USER-007，依赖契约 §10.1），
 * 点击给出批次⑧接入提示；正文长度上限按课程口径 200 字（文档未定，前端 maxlength 与 mock 校验同值，已在留痕登记）。
 * 本组在 feat: 实现前必须红（页面骨架见 chore: 提交）。
 */
vi.mock('@/services/api', () => ({
  orderApi: { getOrder: vi.fn() },
  reviewApi: { submitReview: vi.fn(), getStoreReviews: vi.fn() },
  fileApi: { uploadImage: vi.fn() },
}))

function reviewOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    orderId: 'or01',
    userId: 'u001',
    storeId: 'm002',
    remark: '',
    status: 'COMPLETED',
    reviewed: false,
    createdAt: '2026-09-11 11:00:00',
    itemSubtotal: 39,
    packagingFee: 2,
    total: 41,
    items: [
      { productId: 'p101', name: '香辣脆皮鸡腿堡', unitPrice: 19.5, quantity: 1, subtotal: 19.5 },
      { productId: 'p102', name: '薯条(中)', unitPrice: 11.5, quantity: 1, subtotal: 11.5 },
    ],
    ...overrides,
  }
}

async function mountReview(order: OrderRecord | Error) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useSessionStore().user = { account: '13800000001', nickname: '张同学' }
  if (order instanceof Error) vi.mocked(orderApi.getOrder).mockRejectedValue(order)
  else vi.mocked(orderApi.getOrder).mockResolvedValue(order as never)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/orders', name: 'orders', component: { template: '<div />' } },
      { path: '/orders/:orderId', name: 'order-detail', component: { template: '<div />' } },
      { path: '/orders/:orderId/review', name: 'order-review', component: ReviewOrderView },
    ],
  })
  await router.push(`/orders/or01/review`)
  await router.isReady()
  const wrapper = mount(ReviewOrderView, { global: { plugins: [pinia, router] } })
  return { wrapper, router }
}

describe('ReviewOrderView 评价订单页（批次⑩ TODO-USER-003）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    messages.length = 0
    offToast = onToast((message) => messages.push(message))
  })

  it('TV-1 渲染：标题/商家与打分提示/五颗星/商品行/标签/文字区/添加图片/提交按钮默认不可提交', async () => {
    const { wrapper } = await mountReview(reviewOrder())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="review-order"]').exists()).toBe(true), {
      timeout: 2000,
    })
    const text = wrapper.find('[data-testid="review-order"]').text()
    expect(text).toContain('评价订单')
    expect(text).toContain('为本次服务打分')
    expect(text).toContain('香辣脆皮鸡腿堡')
    expect(wrapper.findAll('[data-testid="star-btn"]')).toHaveLength(5)
    expect(wrapper.findAll('[data-testid="review-item"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-testid="review-tag"]')).toHaveLength(4)
    expect(wrapper.get('[data-testid="review-content"]').attributes('placeholder')).toContain('说说本次用餐体验')
    expect(wrapper.get('[data-testid="add-image"]').text()).toContain('添加图片')
    expect(wrapper.get('[data-testid="submit-review-btn"]').attributes('aria-disabled')).toBe('true')
  })

  it('TV-7 已购商品位渲染商品图（真源 08-评价/01-评价订单：w-24 h-24，不得为空占位）', async () => {
    const { wrapper } = await mountReview(reviewOrder())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="review-order"]').exists()).toBe(true), {
      timeout: 2000,
    })
    const rows = wrapper.findAll('[data-testid="review-item"]')
    const thumbs = wrapper.findAll('[data-testid="review-item-thumb"]')
    expect(rows).toHaveLength(2)
    // 行数与图数一致，且必须是真实 <img>（历史缺陷：空 <span> 占位，从不渲染图片）
    expect(thumbs).toHaveLength(rows.length)
    expect(thumbs[0]!.element.tagName).toBe('IMG')
    // 订单接口未给 image → 走 utils/demoImages 演示映射兜底（p101/p102 → m002-01/02）
    expect(thumbs.map((thumb) => thumb.attributes('src'))).toEqual([
      '/demo-images/product-m002-01.jpg',
      '/demo-images/product-m002-02.jpg',
    ])
    expect(thumbs[0]!.attributes('alt')).toBe('香辣脆皮鸡腿堡')
  })

  it('TV-2 选星后星级文案更新且提交按钮变为可用（PRD：提交按钮由星级决定）', async () => {
    const { wrapper } = await mountReview(reviewOrder())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="star-btn"]').exists()).toBe(true), {
      timeout: 2000,
    })
    await wrapper.findAll('[data-testid="star-btn"]')[3]!.trigger('click')
    expect(wrapper.get('[data-testid="rating-label"]').text()).toBe('好')
    expect(wrapper.get('[data-testid="submit-review-btn"]').attributes('aria-disabled')).toBe('false')
  })

  it('TV-3 标签多选与文字输入随提交一次发送（契约 §6.2 请求体）', async () => {
    vi.mocked(reviewApi.submitReview).mockResolvedValue({ orderId: 'or01', reviewed: true } as never)
    const { wrapper } = await mountReview(reviewOrder())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="star-btn"]').exists()).toBe(true), {
      timeout: 2000,
    })
    await wrapper.findAll('[data-testid="star-btn"]')[4]!.trigger('click')
    const tags = wrapper.findAll('[data-testid="review-tag"]')
    await tags[0]!.trigger('click')
    await tags[2]!.trigger('click')
    expect(tags[0]!.attributes('aria-pressed')).toBe('true')
    expect(tags[2]!.attributes('aria-pressed')).toBe('true')
    await wrapper.get('[data-testid="review-content"]').setValue('出餐很快，味道不错')
    await wrapper.get('[data-testid="submit-review-btn"]').trigger('click')
    await flushPromises()
    expect(reviewApi.submitReview).toHaveBeenCalledWith('or01', {
      rating: 5,
      content: '出餐很快，味道不错',
      tags: [tags[0]!.text(), tags[2]!.text()],
    })
  })

  it('TV-4 提交成功：提示并回订单列表（PRD：成功回订单列表并刷新订单状态）', async () => {
    vi.mocked(reviewApi.submitReview).mockResolvedValue({ orderId: 'or01', reviewed: true } as never)
    const { wrapper, router } = await mountReview(reviewOrder())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="star-btn"]').exists()).toBe(true), {
      timeout: 2000,
    })
    await wrapper.findAll('[data-testid="star-btn"]')[4]!.trigger('click')
    await wrapper.get('[data-testid="submit-review-btn"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('orders'), { timeout: 2000 })
    expect(messages.join('|')).toContain('评价成功')
  })

  it('TV-5 提交被拒（服务端 409）：保留表单并提示，不跳转', async () => {
    vi.mocked(reviewApi.submitReview).mockRejectedValue(new Error('该订单已评价'))
    const { wrapper, router } = await mountReview(reviewOrder())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="star-btn"]').exists()).toBe(true), {
      timeout: 2000,
    })
    await wrapper.findAll('[data-testid="star-btn"]')[4]!.trigger('click')
    await wrapper.get('[data-testid="submit-review-btn"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="review-error-tip"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.get('[data-testid="review-error-tip"]').text()).toContain('已评价')
    expect(router.currentRoute.value.name).toBe('order-review')
    // 表单保留：星级仍选中
    expect(wrapper.findAll('[data-testid="star-btn"]')[4]!.attributes('aria-pressed')).toBe('true')
  })

  it('TV-6 未选星级点提交：给出必填提示且不调接口', async () => {
    const { wrapper } = await mountReview(reviewOrder())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="submit-review-btn"]').exists()).toBe(true), {
      timeout: 2000,
    })
    await wrapper.get('[data-testid="submit-review-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="rating-tip"]').text()).toContain('请先选择星级')
    expect(reviewApi.submitReview).not.toHaveBeenCalled()
  })

  it('TV-6b 未完成订单进入：提示原因并返回订单列表（PRD 异常列）', async () => {
    const { wrapper, router } = await mountReview(reviewOrder({ status: 'PENDING', paidAt: '2026-09-11 11:05:00' }))
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="review-block-tip"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.get('[data-testid="review-block-tip"]').text()).toContain('未完成')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('orders'), { timeout: 2000 })
  })

  it('TV-6c 已评价订单进入：提示并返回订单列表（同一订单只允许评价一次）', async () => {
    const { wrapper, router } = await mountReview(reviewOrder({ reviewed: true }))
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="review-block-tip"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.get('[data-testid="review-block-tip"]').text()).toContain('已评价')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('orders'), { timeout: 2000 })
  })

  // ── 图片上传（TODO-USER-007，批次⑧）：内嵌评价订单页，不新增弹窗或页面（2026-09-11 口径） ──
  // 口径出处：PRD 7.16.1「评价订单页-评价内容区」检查列（类型/大小/张数立即提示、上传失败保留文字与星级）
  //          + 契约 §10.1（jpg/jpeg/png/webp、单张 ≤2MB、评价图最多 3 张、失败保留本地预览可重试）
  /** 选择文件：等表单渲染出 file input 后写入 files 并派发 change（先等就绪，避免空 DOMWrapper） */
  async function pickFiles(wrapper: VueWrapper, files: File[]): Promise<void> {
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="review-image-input"]').exists()).toBe(true),
      { timeout: 3000 },
    )
    const input = wrapper.find('[data-testid="review-image-input"]').element as HTMLInputElement
    Object.defineProperty(input, 'files', { value: files, configurable: true })
    input.dispatchEvent(new Event('change'))
    await flushPromises()
  }

  function makeFile(name: string, type: string, size: number): File {
    const file = new File(['x'], name, { type })
    Object.defineProperty(file, 'size', { value: size, configurable: true })
    return file
  }

  it('IMG-1 选择合法图片 → 调上传接口并在页面显示预览；提交时 images 带上传后的 url', async () => {
    vi.mocked(fileApi.uploadImage).mockImplementation(async () => ({
      url: '/uploads/review-1.jpg',
      fileName: 'review-1.jpg',
      size: 1024,
      contentType: 'image/jpeg',
    }))
    const { wrapper } = await mountReview(reviewOrder())
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="star-btn"]').exists()).toBe(true),
      { timeout: 3000 },
    )
    await wrapper.findAll('[data-testid="star-btn"]')[4]!.trigger('click')
    await pickFiles(wrapper, [makeFile('a.jpg', 'image/jpeg', 1024)])
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="review-image-item"]')).toHaveLength(1),
    )
    await vi.waitFor(() =>
      expect(wrapper.get('[data-testid="review-image-item"]').attributes('data-status')).toBe(
        'success',
      ),
    )
    expect(fileApi.uploadImage).toHaveBeenCalledTimes(1)
    await wrapper.get('[data-testid="submit-review-btn"]').trigger('click')
    await vi.waitFor(() => expect(reviewApi.submitReview).toHaveBeenCalled())
    expect(vi.mocked(reviewApi.submitReview).mock.calls[0]![1]).toMatchObject({
      images: ['/uploads/review-1.jpg'],
    })
  })

  it('IMG-3a 类型不支持：立即提示且不调用上传接口', async () => {
    const { wrapper } = await mountReview(reviewOrder())
    await pickFiles(wrapper, [makeFile('a.gif', 'image/gif', 1024)])
    await flushPromises()
    expect(messages.join('|')).toContain('jpg')
    expect(fileApi.uploadImage).not.toHaveBeenCalled()
    expect(wrapper.findAll('[data-testid="review-image-item"]')).toHaveLength(0)
  })

  it('IMG-3b 单张超过 2MB：立即提示且不调用上传接口', async () => {
    const { wrapper } = await mountReview(reviewOrder())
    await pickFiles(wrapper, [makeFile('big.jpg', 'image/jpeg', 2 * 1024 * 1024 + 1)])
    await flushPromises()
    expect(messages.join('|')).toContain('2MB')
    expect(fileApi.uploadImage).not.toHaveBeenCalled()
  })

  it('IMG-4 上传失败：保留本地预览并给出重试，重试成功后转为成功态', async () => {
    vi.mocked(fileApi.uploadImage)
      .mockRejectedValueOnce(new Error('服务器开小差了'))
      .mockResolvedValueOnce({
        url: '/uploads/review-2.png',
        fileName: 'review-2.png',
        size: 2048,
        contentType: 'image/png',
      })
    const { wrapper } = await mountReview(reviewOrder())
    await pickFiles(wrapper, [makeFile('b.png', 'image/png', 2048)])
    await vi.waitFor(() =>
      expect(wrapper.get('[data-testid="review-image-item"]').attributes('data-status')).toBe(
        'failed',
      ),
    )
    // 失败仍保留本地预览（PRD：上传失败保留文字和星级；契约：保留本地预览并允许重试）
    expect(wrapper.find('[data-testid="review-image-item"] img').exists()).toBe(true)
    await wrapper.get('[data-testid="review-image-retry"]').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.get('[data-testid="review-image-item"]').attributes('data-status')).toBe(
        'success',
      ),
    )
    expect(fileApi.uploadImage).toHaveBeenCalledTimes(2)
  })

  it('IMG-6 删除图片只删除本地选择，不调用任何接口', async () => {
    vi.mocked(fileApi.uploadImage).mockResolvedValue({
      url: '/uploads/review-3.webp',
      fileName: 'review-3.webp',
      size: 512,
      contentType: 'image/webp',
    })
    const { wrapper } = await mountReview(reviewOrder())
    await pickFiles(wrapper, [makeFile('c.webp', 'image/webp', 512)])
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="review-image-item"]')).toHaveLength(1),
    )
    await wrapper.get('[data-testid="review-image-remove"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="review-image-item"]')).toHaveLength(0)
    // 上传成功后删除属本地操作：不再产生额外的上传/删除请求（契约 §10.1 无删除接口）
    expect(fileApi.uploadImage).toHaveBeenCalledTimes(1)
  })

  it('IMG-7 张数上限：已选 3 张时添加入口消失（不再允许选择第 4 张）', async () => {
    vi.mocked(fileApi.uploadImage).mockImplementation(async () => ({
      url: '/uploads/review-x.jpg',
      fileName: 'review-x.jpg',
      size: 1024,
      contentType: 'image/jpeg',
    }))
    const { wrapper } = await mountReview(reviewOrder())
    await pickFiles(wrapper, [
      makeFile('1.jpg', 'image/jpeg', 1024),
      makeFile('2.jpg', 'image/jpeg', 1024),
      makeFile('3.jpg', 'image/jpeg', 1024),
    ])
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="review-image-item"]')).toHaveLength(3),
      { timeout: 3000 },
    )
    expect(wrapper.find('[data-testid="add-image"]').exists()).toBe(false)
  })

  it('IMG-2b 图片仍在上传时提交被阻止并提示（避免静默丢图）', async () => {
    let release: (() => void) | undefined
    vi.mocked(fileApi.uploadImage).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve({
              url: '/uploads/review-slow.jpg',
              fileName: 'review-slow.jpg',
              size: 1024,
              contentType: 'image/jpeg',
            })
        }),
    )
    const { wrapper } = await mountReview(reviewOrder())
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="star-btn"]').exists()).toBe(true),
      { timeout: 3000 },
    )
    await wrapper.findAll('[data-testid="star-btn"]')[4]!.trigger('click')
    await pickFiles(wrapper, [makeFile('slow.jpg', 'image/jpeg', 1024)])
    await vi.waitFor(() =>
      expect(wrapper.get('[data-testid="submit-review-btn"]').attributes('aria-disabled')).toBe(
        'true',
      ),
    )
    await wrapper.get('[data-testid="submit-review-btn"]').trigger('click')
    await flushPromises()
    expect(reviewApi.submitReview).not.toHaveBeenCalled()
    release?.()
    await flushPromises()
  })
})
