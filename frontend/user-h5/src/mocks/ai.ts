/**
 * AI 点餐助手接口替身（契约 §10.6）
 *
 * 口径：
 * - `POST /ai/chat`：请求 `{sessionId?, prompt}`；响应 `{sessionId, reply}`；`prompt` 空白 → 400。
 *   `sessionId` 传入即采用、不传则生成（与后端 `AiChatController.resolveSessionId` 同口径）。
 * - 知识库离线可跑：直接由工程内演示种子（`mocks/store.ts` 的 STORES / ALL_PRODUCTS / CATEGORIES_BY_STORE）
 *   构成，等价于真实后端「启动时从业务库加载在售商家与商品」的知识库（契约 §10.6）。
 * - 只推荐真实存在的商家/菜品，**不编造**；知识库查不到时如实回「暂时没有」；不做下单与购物车动作。
 * - 多轮记忆：按 `sessionId` 记住上一轮提到的店铺（真后端由 MySQL `ai_chat_messages` 承担同一职责）。
 * - 未配置 key 场景：`setAiMockUnavailable(true)` 后返回 503（契约 §10.6 / PRD §6.3），供页面错误态自测。
 */
import type { Product, StoreSummary } from '@/services/api/types'
import { ALL_PRODUCTS, CATEGORIES_BY_STORE, STORES } from './store'
import type { MockHandler } from './index'
import { fail, ok } from './index'

/** 未配置 key 的 503（文案与后端 `AiChatController.checkEnabled` 对齐） */
export const AI_UNAVAILABLE_MESSAGE = 'AI 点餐助手未配置 DEEPSEEK_API_KEY，暂不可用'
const AI_UNAVAILABLE_CODE = 50301

interface AiSessionMemory {
  lastStoreId?: string
}

const sessionMemory = new Map<string, AiSessionMemory>()
let unavailable = false
let sessionSeq = 0

/** 用例/演示复位（替身内部状态不跨用例） */
export function resetAiMockState(): void {
  sessionMemory.clear()
  unavailable = false
  sessionSeq = 0
}

/** 模拟「后端未配置 DEEPSEEK_API_KEY」→ 503（PRD §6.3 异常状态） */
export function setAiMockUnavailable(next: boolean): void {
  unavailable = next
}

function nextSessionId(): string {
  sessionSeq += 1
  return `mock-ai-session-${sessionSeq}`
}

function money(price: number): string {
  return `¥${price.toFixed(2)}`
}

const onSale = (product: Product): boolean => product.onSale !== false

function storeOf(storeId: string): StoreSummary | undefined {
  return STORES.find((store) => store.storeId === storeId)
}

/**
 * 店铺展示文案：**只给店名**（PRD §4.2 新口径：回复文本不出现商家编号，前端按店名匹配 storeId）；
 * 店铺缺失时给占位文案，不把内部 id 露给用户。
 */
function storeLabel(storeId: string): string {
  const store = storeOf(storeId)
  return store ? `**${store.name}**` : '（店铺信息暂缺）'
}

function productLine(product: Product, withStore = false): string {
  const base = `- **${product.name}** ${money(product.price)}`
  return withStore ? `${base} · ${storeLabel(product.storeId)}` : base
}

/** 店铺名命中：整名包含，或店名的 3 字滑窗命中（「肯德基有什么」→ 肯德基宅急送） */
function mentionedStore(prompt: string): StoreSummary | undefined {
  return STORES.find((store) => {
    if (prompt.includes(store.name) || prompt.includes(store.storeId)) return true
    const name = store.name
    if (name.length < 3) return false
    for (let i = 0; i + 3 <= name.length; i += 1) {
      if (prompt.includes(name.slice(i, i + 3))) return true
    }
    return false
  })
}

function productsOf(storeId: string): Product[] {
  return ALL_PRODUCTS.filter((product) => product.storeId === storeId && onSale(product))
}

function drinkProducts(storeId?: string): Product[] {
  const categoryIds = new Set<string>()
  const stores = storeId ? [storeId] : STORES.map((store) => store.storeId)
  for (const id of stores) {
    for (const category of CATEGORIES_BY_STORE[id] ?? []) {
      if (category.name.includes('饮')) categoryIds.add(category.categoryId)
    }
  }
  return ALL_PRODUCTS.filter(
    (product) =>
      onSale(product) &&
      categoryIds.has(product.categoryId) &&
      (storeId ? product.storeId === storeId : true),
  )
}

function spicyProducts(): Product[] {
  return ALL_PRODUCTS.filter(
    (product) =>
      onSale(product) && `${product.name}${product.description ?? ''}`.includes('辣'),
  )
}

/** 泛化词（「点吃的」这类不是具体菜品，不能按「知识库没有」处理） */
const GENERIC_WORDS = /^(吃|喝|点|要|来|些|的|东西|吃的|喝的|点的|餐|饭|菜|啥|什么)+$/

/** 抽出用户明确想要的菜名候选（用于「知识库没有就如实说没有」） */
function wantedDish(prompt: string): string | undefined {
  const match = /(?:有没有|想吃|想喝|来一份|来个|要点|想要|推荐)([\u4e00-\u9fa5A-Za-z0-9]{2,8})/.exec(prompt)
  const candidate = match?.[1]?.trim()
  if (!candidate || GENERIC_WORDS.test(candidate)) return undefined
  return candidate
}

function inKnowledge(dish: string): boolean {
  if (STORES.some((store) => store.name.includes(dish))) return true
  return ALL_PRODUCTS.some(
    (product) =>
      product.name.includes(dish) ||
      product.description?.includes(dish) ||
      dish.includes(product.name),
  )
}

/** 生成回复（纯函数式：只读种子 + 读写传入的会话记忆） */
function buildReply(prompt: string, memory: AiSessionMemory): string {
  const store = mentionedStore(prompt)
  if (store) {
    memory.lastStoreId = store.storeId
    const items = productsOf(store.storeId).slice(0, 6)
    const lines = items.length
      ? items.map((product) => productLine(product)).join('\n')
      : '- 这家暂时没有在售菜品'
    return `${storeLabel(store.storeId)} 的在售菜品有：\n${lines}\n\n想下单的话进商家页点菜就好（我只做推荐，不代下单）。`
  }

  if (/辣|麻辣|口味重/.test(prompt)) {
    const items = spicyProducts()
    if (items.length > 0) {
      memory.lastStoreId = items[0]!.storeId
      return `辣味选择有这些：\n${items
        .slice(0, 5)
        .map((product) => productLine(product, true))
        .join('\n')}\n\n要看某家的完整菜单吗？`
    }
    return '暂时没有找到辣味的商家或菜品，换个口味试试？'
  }

  if (/便宜|实惠|划算|平价/.test(prompt)) {
    const items = [...ALL_PRODUCTS.filter(onSale)].sort((a, b) => a.price - b.price).slice(0, 3)
    if (items.length > 0) {
      memory.lastStoreId = items[0]!.storeId
      return `实惠的有这几样：\n${items
        .map((product) => productLine(product, true))
        .join('\n')}\n\n还想更省一点的话告诉我预算～`
    }
  }

  if (/喝|饮|奶茶|果汁|饮料/.test(prompt)) {
    const items = drinkProducts(memory.lastStoreId)
    if (items.length > 0) {
      return `关于喝的：\n${items
        .slice(0, 5)
        .map((product) => productLine(product, true))
        .join('\n')}\n\n换个口味也可以问我。`
    }
    if (memory.lastStoreId) {
      return `${storeLabel(memory.lastStoreId)} 暂时没有在售的饮品，换一家看看？`
    }
    return '暂时没有找到饮品类商家或菜品，换个关键词试试？'
  }

  if (/优惠|红包|折扣|活动|满减/.test(prompt)) {
    return '优惠活动请看首页「天天爆红包」与「红包卡券」，我这边只做商家和菜品推荐。你想吃什么口味的？'
  }

  const dish = wantedDish(prompt)
  if (dish && !inKnowledge(dish)) {
    return `暂时没有找到「${dish}」相关的商家或菜品，换个关键词试试？`
  }

  if (/还有|其他|别的|再来|换一个|换个/.test(prompt) && memory.lastStoreId) {
    const items = productsOf(memory.lastStoreId).slice(0, 5)
    return `${storeLabel(memory.lastStoreId)} 这边还有：\n${items
      .map((product) => productLine(product))
      .join('\n')}\n\n要不要看看别的口味？`
  }

  const popular = [...STORES].sort((a, b) => b.monthlySales - a.monthlySales).slice(0, 3)
  return `给你几个热门选择：\n${popular.map((item) => `- ${storeLabel(item.storeId)}`).join('\n')}\n\n告诉我口味（比如「我想吃辣的」）或店名，我再帮你细挑～`
}

function resolveSessionId(raw: unknown): string {
  return typeof raw === 'string' && raw.trim() !== '' ? raw : nextSessionId()
}

export const aiMocks: Record<string, MockHandler> = {
  'POST /ai/chat': ({ data }) => {
    if (unavailable) return fail(503, AI_UNAVAILABLE_CODE, AI_UNAVAILABLE_MESSAGE)
    const body = (data ?? {}) as { sessionId?: unknown; prompt?: unknown }
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (prompt === '') return fail(400, 40001, '请输入你想吃的内容')
    const sessionId = resolveSessionId(body.sessionId)
    const memory = sessionMemory.get(sessionId) ?? {}
    const reply = buildReply(prompt, memory)
    sessionMemory.set(sessionId, memory)
    return ok({ sessionId, reply })
  },
}
