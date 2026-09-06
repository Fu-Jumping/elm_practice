import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HomeView from '../HomeView.vue'
import { onToast } from '@/utils/toast'

/**
 * 首页 P0 行为测试（2026-09-06 负责人拍板替换初始化 Hello 用例）
 * 口径来源：PRD 7.16.1（定位频道栏/搜索框/分类宫格/活动区）+ 首页-精细 README §2.3 占位清单
 * T1 定位频道栏：演示地址渲染 + 常点占位提示
 * T2 分类宫格：15 格渲染 + 5 个超范围占位栏目点击提示
 * T3 活动区与筛选标签：占位内容点击提示
 * T4 搜索框：P0 只承担入口，未实现时提示且不发起请求
 */
describe('HomeView（首页 P0）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  beforeEach(() => {
    messages.length = 0
    offToast = onToast((message) => messages.push(message))
  })

  afterEach(() => {
    offToast?.()
  })

  it('T1 定位频道栏渲染演示地址；点击"常点"占位提示暂未开放', async () => {
    const wrapper = mount(HomeView)
    const bar = wrapper.find('[data-testid="location-bar"]')
    expect(bar.exists()).toBe(true)
    // PRD：定位文字无地址时使用课程演示地址（北洋园口径 2026-09-05 修正）
    expect(bar.text()).toContain('天津大学北洋园校区')
    expect(bar.text()).toContain('常点')
    expect(bar.text()).toContain('推荐')
    await bar.find('[data-placeholder="常点"]').trigger('click')
    expect(messages).toEqual(['暂未开放'])
  })

  it('T2 分类宫格渲染 15 格，5 个超范围占位栏目点击提示暂未开放', async () => {
    const wrapper = mount(HomeView)
    const grid = wrapper.find('[data-testid="cat-grid"]')
    expect(grid.exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="cat-grid"] .cat-cell')).toHaveLength(15)
    // 占位清单（精细版 README §2.3）：超市便利/水果鲜花/买菜/买药/跑腿
    const placeholders = wrapper.findAll('[data-testid="cat-grid"] [data-placeholder]')
    expect(placeholders).toHaveLength(5)
    const labels = placeholders.map((c) => c.attributes('data-placeholder'))
    for (const name of ['超市便利', '水果鲜花', '买菜', '买药', '跑腿']) {
      expect(labels).toContain(name)
    }
    for (const cell of placeholders) {
      await cell.trigger('click')
    }
    expect(messages).toHaveLength(5)
    expect(new Set(messages)).toEqual(new Set(['暂未开放']))
  })

  it('T3 活动区与筛选标签为占位内容，点击提示暂未开放', async () => {
    const wrapper = mount(HomeView)
    const promoPlaceholders = wrapper.findAll('[data-testid="promo-area"] [data-placeholder]')
    expect(promoPlaceholders.length).toBeGreaterThanOrEqual(3)
    await promoPlaceholders[0]!.trigger('click')
    const filterTags = wrapper.findAll('[data-testid="filter-bar"] [data-placeholder]')
    expect(filterTags).toHaveLength(4)
    await filterTags[0]!.trigger('click')
    expect(messages).toHaveLength(2)
    expect(new Set(messages)).toEqual(new Set(['暂未开放']))
  })

  it('T4 搜索框 P0 仅承担入口，点击提示暂未开放', async () => {
    const wrapper = mount(HomeView)
    const searchBox = wrapper.find('[data-testid="search-bar"] [data-placeholder]')
    expect(searchBox.exists()).toBe(true)
    await searchBox.trigger('click')
    expect(messages).toEqual(['暂未开放'])
  })
})
