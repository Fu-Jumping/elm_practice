import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia } from 'pinia'
import SearchEntryView from '../SearchEntryView.vue'
import { onToast } from '@/utils/toast'
import { SEARCH_HISTORY_KEY, readSearchHistory } from '@/utils/searchHistory'
import { mockDispatch } from '@/mocks'

// mock 桩：默认走真实 mock handler（词条字典联想/热门词），个别用例按需覆盖
const actualMocks = await vi.importActual<typeof import('@/mocks')>('@/mocks')
vi.mock('@/mocks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/mocks')>()
  return { ...actual, mockDispatch: vi.fn() }
})

/**
 * 搜索页（输入页）测试（TODO-USER-107）
 * 口径出处：PRD 7.16.1「首页-搜索框」行（搜索框进入搜索页；关键词搜索、**搜索历史与热门词本期实现**）；
 * 设计真源 `docs/design/exports/用户端/03-搜索与商家列表/01-搜索页/`（搜索栏 + 最近搜索 + 热门搜索带 HOT + 底部促销条）
 * SE-1 渲染：搜索栏（占位「搜索商家、商品名称」+ 搜索按钮）、最近搜索、热门搜索（HOT 标记）、底部促销条
 * SE-2 提交关键词（按钮或回车）→ 跳搜索结果页并写入历史
 * SE-3 空关键词提交 → 提示且不跳转、不写历史
 * SE-4 无历史时不渲染「最近搜索」区
 * SE-5 点历史词 / 热门词 → 直接进结果页并写入历史
 * SE-6 底部促销条为纯展示（点击不跳转、不产生业务行为）
 */
const HOT_WORDS = ['麻辣烫', '奶茶', '烧烤', '炸鸡', '寿司', '饺子', '面条', '沙拉']
/** 词条字典热门词（mock /search/hot 与后端 search_terms 种子同源，前 3 HOT） */
const DICT_HOT_WORDS = ['辣', '炸鸡', '汉堡', '烧烤', '火锅', '果汁', '肯德基', '便宜']

let router: ReturnType<typeof createRouter>
async function mountEntry() {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/search-entry', name: 'search-entry', component: SearchEntryView },
      { path: '/search', name: 'search', component: { template: '<div />' } },
      { path: '/', name: 'home', component: { template: '<div />' } },
    ],
  })
  await router.push('/search-entry')
  await router.isReady()
  const wrapper = mount(SearchEntryView, { global: { plugins: [createPinia(), router] } })
  await flushPromises()
  return wrapper
}

describe('SearchEntryView（搜索页，TODO-USER-107）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  beforeEach(() => {
    localStorage.clear()
    messages.length = 0
    offToast = onToast((m) => messages.push(m))
    // 默认走真实 mock handler（热门词/联想来自词条字典）；个别用例（SE-9）自行覆盖后由这里复位
    vi.mocked(mockDispatch).mockImplementation(actualMocks.mockDispatch)
  })

  it('SE-1 渲染搜索栏、热门搜索（含 HOT 标记）与底部促销条；无历史时不出现最近搜索区', async () => {
    const wrapper = await mountEntry()
    const input = wrapper.get('[data-testid="search-entry-input"]')
    expect((input.element as HTMLInputElement).placeholder).toBe('搜索商家、商品名称')
    expect(wrapper.find('[data-testid="search-entry-submit"]').exists()).toBe(true)
    // 无历史 → 最近搜索区隐藏
    expect(wrapper.find('[data-testid="search-entry-recent"]').exists()).toBe(false)
    // 热门搜索：来自词条字典接口（mock /search/hot 带 200–500ms 模拟延迟，用 waitFor 等待）
    await vi.waitFor(() => {
      const words = wrapper.findAll('[data-testid="search-entry-hot-word"]').map((node) =>
        node.text().replace(/\s*HOT\s*/g, ''),
      )
      expect(words).toEqual(DICT_HOT_WORDS)
    })
    expect(wrapper.findAll('[data-testid="search-entry-hot-badge"]').length).toBe(3)
    // 底部促销条为纯展示
    expect(wrapper.get('[data-testid="search-entry-promo"]').text()).toContain('配送优惠')
  })

  it('SE-2 提交关键词（按钮）→ 进搜索结果页并写入历史', async () => {
    const wrapper = await mountEntry()
    await wrapper.get('[data-testid="search-entry-input"]').setValue('肯德基')
    await wrapper.get('[data-testid="search-entry-submit"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('search')
    expect(router.currentRoute.value.query.keyword).toBe('肯德基')
    expect(JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) ?? '[]')).toEqual(['肯德基'])
  })

  it('SE-2b 回车提交同样进结果页', async () => {
    const wrapper = await mountEntry()
    await wrapper.get('[data-testid="search-entry-input"]').setValue('奶茶')
    await wrapper.get('[data-testid="search-entry-input"]').trigger('keyup.enter')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('search')
    expect(router.currentRoute.value.query.keyword).toBe('奶茶')
  })

  it('SE-3 空关键词提交：提示且不跳转、不写历史', async () => {
    const wrapper = await mountEntry()
    await wrapper.get('[data-testid="search-entry-input"]').setValue('   ')
    await wrapper.get('[data-testid="search-entry-submit"]').trigger('click')
    await flushPromises()
    expect(messages.join('|')).toContain('请输入')
    expect(router.currentRoute.value.name).toBe('search-entry')
    expect(localStorage.getItem(SEARCH_HISTORY_KEY)).toBeNull()
  })

  it('SE-4 有历史时渲染「最近搜索」区，最新在前', async () => {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(['披萨', '汉堡']))
    const wrapper = await mountEntry()
    const recent = wrapper.get('[data-testid="search-entry-recent"]')
    const texts = recent.findAll('[data-testid="search-entry-recent-word"]').map((n) => n.text())
    expect(texts).toEqual(['披萨', '汉堡'])
  })

  it('SE-5 点历史词与热门词都直接进结果页并写入历史', async () => {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(['披萨']))
    const wrapper = await mountEntry()
    await wrapper.get('[data-testid="search-entry-recent-word"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.keyword).toBe('披萨')

    // 回到搜索页点热门词
    await router.push('/search-entry')
    await flushPromises()
    await wrapper.findAll('[data-testid="search-entry-hot-word"]')[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.keyword).toBe(HOT_WORDS[0])
    expect(JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) ?? '[]')).toContain(HOT_WORDS[0])
  })

  it('SE-6 底部促销条纯展示：点击不跳转、不产生业务行为', async () => {
    const wrapper = await mountEntry()
    const promo = wrapper.get('[data-testid="search-entry-promo"]')
    await promo.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('search-entry')
    expect(messages).toEqual([])
  })

  it('SE-7 输入联想：输入「炸」250ms 后出现联想下拉（词条优先），点击联想词直接进结果页并写历史', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = await mountEntry()
      const input = wrapper.get('[data-testid="search-entry-input"]')
      await input.setValue('炸')
      // 防抖未到：不下拉
      expect(wrapper.find('[data-testid="search-suggest-list"]').exists()).toBe(false)
      // 推进防抖 250ms + mock 层 200–500ms 模拟延迟
      await vi.advanceTimersByTimeAsync(1200)
      await flushPromises()
      const list = wrapper.find('[data-testid="search-suggest-list"]')
      expect(list.exists()).toBe(true)
      const first = wrapper.get('[data-testid="search-suggest-item-0"]')
      expect(first.text()).toContain('炸鸡')
      expect(first.text()).toContain('词条')
      // 点击联想 → 进结果页并写历史
      await first.trigger('mousedown')
      await flushPromises()
      expect(router.currentRoute.value.query.keyword).toBe('炸鸡')
      expect(readSearchHistory()[0]).toBe('炸鸡')
    } finally {
      vi.useRealTimers()
    }
  })

  it('SE-8 清空输入收起联想；空词不发起联想请求', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = await mountEntry()
      const input = wrapper.get('[data-testid="search-entry-input"]')
      await input.setValue('  ')
      await vi.advanceTimersByTimeAsync(300)
      expect(wrapper.find('[data-testid="search-suggest-list"]').exists()).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('SE-9 热门词接口失败 → 回落设计稿内置清单（页面不空白）', async () => {
    const { mockDispatch } = await import('@/mocks')
    const actualMocks = await vi.importActual<typeof import('@/mocks')>('@/mocks')
    const spy = vi.mocked(mockDispatch)
    spy.mockImplementation(async (config) => {
      if (config.url === '/search/hot') throw new Error('网络异常')
      return actualMocks.mockDispatch(config)
    })
    try {
      const wrapper = await mountEntry()
      await flushPromises()
      const hot = wrapper.findAll('[data-testid="search-entry-hot-word"]')
      expect(hot.map((node) => node.text().replace(/\s*HOT\s*/g, ''))).toEqual(HOT_WORDS)
    } finally {
      spy.mockReset()
    }
  })
}
)
