import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeView from '../HomeView.vue'
import { onToast } from '@/utils/toast'
import { useCatalogStore } from '@/stores/catalogStore'

/**
 * 首页 P0 行为测试（2026-09-06 负责人拍板替换初始化 Hello 用例；T7-T10 口径同日拍板）
 * 口径来源：PRD 7.16.1（定位频道栏/搜索框/分类宫格/活动区/商家卡行）+ 首页-精细 README §2.3 占位清单
 * T1 定位频道栏：演示地址渲染 + 常点占位提示
 * T2 分类宫格：15 格渲染 + 5 个超范围占位栏目点击提示
 * T3 活动区与筛选标签：占位内容点击提示
 * T4 搜索框：P0 只承担入口，未实现时提示且不发起请求
 * T7 商家卡数据驱动：mock GET /stores 渲染 5 家，字段格式化对齐 PRD 金额/文案口径
 * T8 字段缺失降级：接口未返回的优惠标签/距离/商品预览整块隐藏，不出现 undefined
 * T9 空态：店铺列表为空显示"暂无商家"
 * T10 加载态：加载中渲染占位卡，完成后消失
 */
describe('HomeView（首页 P0）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  const mountHome = () => mount(HomeView, { global: { plugins: [createPinia()] } })

  beforeEach(() => {
    messages.length = 0
    offToast = onToast((message) => messages.push(message))
  })

  afterEach(() => {
    offToast?.()
  })

  it('T1 定位频道栏渲染演示地址；点击"常点"占位提示暂未开放', async () => {
    const wrapper = mountHome()
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
    const wrapper = mountHome()
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
    const wrapper = mountHome()
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
    const wrapper = mountHome()
    const searchBox = wrapper.find('[data-testid="search-bar"] [data-placeholder]')
    expect(searchBox.exists()).toBe(true)
    await searchBox.trigger('click')
    expect(messages).toEqual(['暂未开放'])
  })

  it('T7 商家卡数据驱动渲染 5 家 mock 店铺，字段格式化对齐口径', async () => {
    const wrapper = mountHome()
    // mock 网络延迟 200-500ms，等待卡片渲染完成
    await vi.waitFor(() => expect(wrapper.findAll('.merchant-card')).toHaveLength(5), {
      timeout: 2000,
    })
    const first = wrapper.findAll('.merchant-card')[0]!
    // 首卡 m001 老王小店：评分原值、月售/时长拼接、距离与优惠标签来自 mock 展示字段
    expect(first.text()).toContain('老王小店')
    expect(first.text()).toContain('4.6')
    expect(first.text()).toContain('月售1200+')
    expect(first.text()).toContain('30分钟')
    expect(first.text()).toContain('1.8km')
    expect(first.text()).toContain('食无忧')
    // 商品预览价格按 PRD 金额口径两位小数（normalizers.formatMoney）
    expect(first.text()).toContain('12.00')
  })

  it('T8 接口未返回的字段整块隐藏，页面不出现 undefined', async () => {
    const wrapper = mountHome()
    await vi.waitFor(() => expect(wrapper.findAll('.merchant-card')).toHaveLength(5), {
      timeout: 2000,
    })
    // m003 麦当劳在 mock 中缺配 couponTags（现实合理：无优惠活动），其余字段齐备
    const mcdonald = wrapper
      .findAll('.merchant-card')
      .find((c) => c.text().includes('麦当劳'))!
    // PRD 商家卡行：优惠标签只有接口明确返回时展示，字段缺失整块隐藏且不显示 undefined
    expect(mcdonald.find('.merchant-tags').exists()).toBe(false)
    expect(mcdonald.find('.merchant-products').exists()).toBe(true)
    expect(mcdonald.find('.merchant-meta--distance').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('undefined')
  })

  it('T9 店铺列表为空显示暂无商家', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useCatalogStore()
    vi.spyOn(store, 'fetchStores').mockImplementation(async () => {
      store.stores = []
      store.loading = false
      store.error = ''
    })
    const wrapper = mount(HomeView, { global: { plugins: [pinia] } })
    await flushPromises()
    expect(wrapper.find('[data-testid="merchant-empty"]').text()).toContain('暂无商家')
    expect(wrapper.findAll('.merchant-card')).toHaveLength(0)
  })

  it('T10 加载中渲染占位卡，加载完成消失', async () => {
    const wrapper = mountHome()
    // fetchStores 在 onMounted 同步置 loading=true，等重渲染落盘后骨架可见
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="merchant-skeleton"]').exists()).toBe(true)
    await vi.waitFor(() => expect(wrapper.findAll('.merchant-card')).toHaveLength(5), {
      timeout: 2000,
    })
    expect(wrapper.find('[data-testid="merchant-skeleton"]').exists()).toBe(false)
  })
})
