/**
 * 搜索域 mock（契约 §3.6）——替身与页面同批落地：前端按契约写适配层，
 * 真实后端（批次⑤ `TODO-BE-007`）就绪后切 real 模式即可，页面无感。
 *
 * 规则（逐条对齐契约 §3.6 定稿）：
 * - `keyword` 匹配**商家名或商品名**；空关键词（含纯空白）返回空列表（前端已拦截，后端亦不报错）
 * - `categoryId` 可选，来源**店铺自身 `categories`**；在关键词命中范围内再收窄，无匹配返回空列表、不 404
 * - `sort`：综合 = 销量优先、评分次之；销量 = `monthlySales` 倒序；距离 = 种子距离升序
 *   （真实后端用种子固定字段 `distanceKm`；替身按 `distanceText` 解析等价数值，缺该字段的店铺排最后）
 * - `page`/`size` 默认 1/10；`sort` 非取值或 `page`/`size` 非正整数 → 400
 * - 响应分页对象为 `list`/`page`/`size`/`total`
 */
import type { Product, SearchResult, SearchSort, StoreSummary } from '@/services/api/types'
import type { MockHandler } from './index'
import { fail, ok } from './index'
import { ALL_PRODUCTS, CATEGORIES_BY_STORE, STORES } from './store'
import { STORE_SORT_VALUES, sortStores } from './storeSort'

const SORT_VALUES = STORE_SORT_VALUES
const DEFAULT_PAGE = 1
const DEFAULT_SIZE = 10

/**
 * 分页参数是否非法：**未提供**（undefined/null/空串）不算非法，走默认值；
 * 提供了但不是正整数（含小数、0、负数、非数字）才算非法 → 400。
 */
function isInvalidIntParam(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false
  const num = Number(value)
  return !Number.isInteger(num) || num < 1
}

/** 取分页参数：非法已在上面拦掉，这里只处理「未提供 → 默认值」 */
function intParamOr(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback
  return Number(value)
}

function paginate<T>(list: T[], page: number, size: number) {
  const start = (page - 1) * size
  return { list: list.slice(start, start + size), page, size, total: list.length }
}

function emptyResult(page: number, size: number): SearchResult {
  return {
    merchants: { list: [], page, size, total: 0 },
    products: { list: [], page, size, total: 0 },
  }
}

export const searchMocks: Record<string, MockHandler> = {
  'GET /search': ({ params }) => {
    // ① 入参校验（先于命中判断，非法即 400）
    const sortRaw = params?.sort === undefined || params?.sort === '' ? '综合' : String(params?.sort)
    if (!SORT_VALUES.includes(sortRaw as SearchSort)) {
      return fail(400, 40000, '排序取值不合法（综合/销量/距离）')
    }
    const sort = sortRaw as SearchSort
    if (isInvalidIntParam(params?.page) || isInvalidIntParam(params?.size)) {
      return fail(400, 40000, '分页参数不合法（page/size 必须为正整数）')
    }
    const page = intParamOr(params?.page, DEFAULT_PAGE)
    const size = intParamOr(params?.size, DEFAULT_SIZE)

    // ② 空关键词：按契约返回空列表（不视为错误）
    const keyword = String(params?.keyword ?? '').trim()
    if (!keyword) return ok<SearchResult>(emptyResult(page, size))

    const lowered = keyword.toLowerCase()
    const categoryId = params?.categoryId ? String(params.categoryId) : ''

    const matchesCategory = (storeId: string): boolean => {
      if (!categoryId) return true
      return (CATEGORIES_BY_STORE[storeId] ?? []).some((c) => c.categoryId === categoryId)
    }

    // ③ 商家命中：商家名命中，或该店任一商品名命中（商品名命中亦回带所属商家）
    const merchants = STORES.filter((store) => {
      if (!matchesCategory(store.storeId)) return false
      if (store.name.toLowerCase().includes(lowered)) return true
      return ALL_PRODUCTS.some(
        (p) => p.storeId === store.storeId && p.name.toLowerCase().includes(lowered),
      )
    })

    // ④ 商品命中：商品名命中，并按分类条件收窄（分类为店铺自身分类，商品按自身 categoryId 校验）
    const products: Product[] = ALL_PRODUCTS.filter((p) => {
      if (!p.name.toLowerCase().includes(lowered)) return false
      if (!categoryId) return true
      return p.categoryId === categoryId || matchesCategory(p.storeId)
    })

    return ok<SearchResult>({
      merchants: paginate(sortStores(merchants, sort), page, size),
      products: paginate(products, page, size),
    })
  },
}

/* ============ 搜索增强（2026-09-15，契约 §3.6）：联想 + 热门词 ============ */

/** 词条字典镜像（与后端 search_terms 种子同源；含别名，用于联想匹配）。 */
const TERM_DICT: Array<{ term: string; aliases: string[]; hot?: boolean }> = [
  { term: '辣', aliases: ['麻辣', '香辣', '麻辣烫'], hot: true },
  { term: '炸鸡', aliases: ['鸡腿', '鸡块', '鸡翅'], hot: true },
  { term: '汉堡', aliases: ['burger', '堡'], hot: true },
  { term: '烧烤', aliases: ['撸串', '夜宵', '烤串'], hot: true },
  { term: '火锅', aliases: ['涮锅', '涮肉'], hot: true },
  { term: '果汁', aliases: ['饮品', '饮料', '奶茶', '喝的'], hot: true },
  { term: '肯德基', aliases: ['kfc', '开封菜'], hot: true },
  { term: '便宜', aliases: ['实惠', '低价', '平价'], hot: true },
  { term: '甜', aliases: ['甜品', '甜点'] },
  { term: '清淡', aliases: ['沙拉', '轻食'] },
  { term: '家常菜', aliases: ['小炒', '下饭', '麻辣烫'] },
  { term: '主食', aliases: ['米饭', '面条', '饺子', '寿司'] },
  { term: '麦当劳', aliases: ['金拱门', 'm记'] },
  { term: '老王小店', aliases: ['老王'] },
  { term: '老胖烧烤', aliases: ['老胖'] },
  { term: '元盛居', aliases: ['元盛'] },
]

function suggestMatch(query: string, word: string): boolean {
  const q = query.toLowerCase()
  const w = word.toLowerCase()
  // 对齐后端：词条/别名包含输入（含单字前缀联想） ∨ 输入包含多字别名 ∨ 全等
  return q === w || (w.length >= 2 && q.includes(w)) || w.includes(q)
}

export const suggestMocks: Record<string, MockHandler> = {
  'GET /search/suggest': ({ params }) => {
    const q = String(params?.keyword ?? '').trim().toLowerCase()
    const limit = Math.min(Math.max(Number(params?.limit ?? 8) || 8, 1), 20)
    if (!q) return ok({ suggestions: [] as Array<{ text: string; source: string }> })
    const seen = new Set<string>()
    const out: Array<{ text: string; source: string }> = []
    for (const entry of TERM_DICT) {
      if ((suggestMatch(q, entry.term) || entry.aliases.some((a) => suggestMatch(q, a))) && seen.add(entry.term)) {
        out.push({ text: entry.term, source: 'term' })
      }
    }
    for (const store of STORES) {
      if (store.name.toLowerCase().includes(q) && seen.add(store.name)) out.push({ text: store.name, source: 'store' })
    }
    for (const p of ALL_PRODUCTS) {
      if (p.name.toLowerCase().includes(q) && seen.add(p.name)) out.push({ text: p.name, source: 'product' })
    }
    return ok({ suggestions: out.slice(0, limit) })
  },

  'GET /search/hot': ({ params }) => {
    const limit = Math.min(Math.max(Number(params?.limit ?? 8) || 8, 1), 20)
    const words = TERM_DICT.filter((e) => e.hot)
      .slice(0, limit)
      .map((e, i) => ({ word: e.term, hot: i < 3 }))
    return ok(words)
  },
}

