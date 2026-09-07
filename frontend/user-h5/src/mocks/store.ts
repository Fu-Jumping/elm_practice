/**
 * 店铺域 mock（契约 §3.2 + 固定演示数据：m001–m005，主商家 m002 肯德基宅急送）
 * 商品编号 p101 起；字段严格按契约最小集；金额为数字元、保留两位小数
 * 注册为纯数据映射：模块加载期零调用（无 ESM 循环依赖陷阱）
 * TODO(9/4 起按 docs/backend/后端联调验收用例.md)：补全各店分类/商品与筛选参数行为
 */
import type { Product, StoreCategory, StoreSummary } from '@/services/api/types'
import type { MockHandler } from './index'
import { ok } from './index'

// 演示图片素材（2026-09-07 图片素材包：public/demo-images/ 静态伺服，URL 口径 /demo-images/*；
// 文件↔店铺/商品对照与后端 seed 接入说明见 docs/backend/演示图片素材清单.md）
const IMG = '/demo-images'

// TODO(契约缺口)：distanceText/couponTags/previewProducts 为 mock-only 展示字段（见 types.ts 注）；
// m003 刻意缺配，供"字段缺失整块隐藏"用例（T8）与降级路径验证
const STORES: StoreSummary[] = [
  {
    storeId: 'm001',
    name: '老王小店',
    description: '家常小炒 · 经济实惠',
    image: `${IMG}/store-m001.jpg`,
    rating: 4.6,
    monthlySales: 1200,
    deliveryMinutes: 30,
    startPrice: 15,
    deliveryFee: 3,
    status: 'OPEN',
    distanceText: '1.8km',
    couponTags: ['满30减8', '36减1|58减4', '食无忧'],
    previewProducts: [
      { name: '白葡萄柠檬茶', image: `${IMG}/product-m001-01.jpg`, price: 12 },
      { name: '西瓜冰柠茶', image: `${IMG}/product-m001-02.jpg`, price: 12 },
      { name: '黄皮冰柠茶', image: `${IMG}/product-m001-03.jpg`, price: 12 },
    ],
  },
  {
    storeId: 'm002',
    name: '肯德基宅急送',
    description: '炸鸡汉堡 · 外卖到家',
    image: `${IMG}/store-m002.jpg`,
    rating: 4.8,
    monthlySales: 3500,
    deliveryMinutes: 25,
    startPrice: 20,
    deliveryFee: 5,
    status: 'OPEN',
    distanceText: '2.4km',
    couponTags: ['满50减10'],
    previewProducts: [
      { name: '香辣鸡腿堡', image: `${IMG}/product-m002-01.jpg`, price: 19.5 },
      { name: '九珍果汁', image: `${IMG}/product-m002-05.jpg`, price: 9 },
    ],
  },
  {
    storeId: 'm003',
    name: '麦当劳',
    description: '经典快餐 · 随时开吃',
    image: `${IMG}/store-m003.jpg`,
    rating: 4.7,
    monthlySales: 2800,
    deliveryMinutes: 25,
    startPrice: 20,
    deliveryFee: 5,
    status: 'OPEN',
    // 缺配 couponTags：优惠标签未返回时整块隐藏（T8 降级口径；现实合理——该店无优惠活动）
    distanceText: '2.9km',
    previewProducts: [
      { name: '巨无霸', image: `${IMG}/product-m003-01.jpg`, price: 25.5 },
      { name: '麦乐鸡（5块）', image: `${IMG}/product-m003-02.jpg`, price: 11 },
    ],
  },
  {
    storeId: 'm004',
    name: '老胖烧烤',
    description: '深夜食堂 · 现烤现送',
    image: `${IMG}/store-m004.jpg`,
    rating: 4.5,
    monthlySales: 800,
    deliveryMinutes: 40,
    startPrice: 30,
    deliveryFee: 4,
    status: 'CLOSED',
    distanceText: '3.6km',
    couponTags: ['满88减20'],
    previewProducts: [
      { name: '羊肉串（10串）', image: `${IMG}/product-m004-01.jpg`, price: 28 },
      { name: '烤茄子', image: `${IMG}/product-m004-02.jpg`, price: 10 },
    ],
  },
  {
    storeId: 'm005',
    name: '元盛居火锅',
    description: '铜锅涮肉 · 宅家开涮',
    image: `${IMG}/store-m005.jpg`,
    rating: 4.9,
    monthlySales: 950,
    deliveryMinutes: 45,
    startPrice: 50,
    deliveryFee: 6,
    status: 'OPEN',
    distanceText: '4.2km',
    couponTags: ['新客减15', '食无忧'],
    previewProducts: [
      { name: '精品肥牛', image: `${IMG}/product-m005-01.jpg`, price: 39 },
      { name: '手切鲜羊肉', image: `${IMG}/product-m005-02.jpg`, price: 46 },
    ],
  },
]

// 分类/商品演示数据（契约 §3.2 种子口径；月售/好评率为契约缺口展示字段，缺失时前端隐藏）
const CATEGORIES_M002: StoreCategory[] = [
  { categoryId: 'c101', name: '主食' },
  { categoryId: 'c102', name: '小食' },
  { categoryId: 'c103', name: '饮品' },
]

const PRODUCTS_M002: Product[] = [
  {
    productId: 'p101',
    storeId: 'm002',
    categoryId: 'c101',
    name: '香辣鸡腿堡',
    description: '招牌汉堡，香辣多汁',
    image: `${IMG}/product-m002-01.jpg`,
    price: 19.5,
    stock: 100,
    onSale: true,
  },
  {
    productId: 'p102',
    storeId: 'm002',
    categoryId: 'c101',
    name: '劲脆鸡腿堡',
    description: '外酥里嫩，经典之选',
    image: `${IMG}/product-m002-02.jpg`,
    price: 19.5,
    stock: 100,
    onSale: true,
  },
  {
    productId: 'p103',
    storeId: 'm002',
    categoryId: 'c101',
    name: '老北京鸡肉卷',
    image: `${IMG}/product-m002-03.jpg`,
    price: 17,
    stock: 80,
    onSale: true,
  },
  {
    productId: 'p104',
    storeId: 'm002',
    categoryId: 'c102',
    name: '黄金鸡块（5块）',
    image: `${IMG}/product-m002-04.jpg`,
    price: 11.5,
    stock: 120,
    onSale: true,
  },
  {
    productId: 'p105',
    storeId: 'm002',
    categoryId: 'c103',
    name: '九珍果汁',
    image: `${IMG}/product-m002-05.jpg`,
    price: 9,
    stock: 150,
    onSale: true,
  },
  {
    productId: 'p106',
    storeId: 'm002',
    categoryId: 'c101',
    name: '热辣香骨鸡（5块）',
    description: '销量冠军，售完即止',
    image: `${IMG}/product-m002-06.jpg`,
    price: 13.9,
    stock: 0,
    onSale: true,
  },
]

// 其余店铺演示分类/商品（数量精简，满足浏览链路演示与 T13/T14/T16 用例）
const CATEGORIES_GENERIC: StoreCategory[] = [
  { categoryId: 'c201', name: '招牌' },
  { categoryId: 'c202', name: '配菜' },
]

const PRODUCTS_GENERIC: Product[] = [
  { productId: 'p201', storeId: 'm001', categoryId: 'c201', name: '家常豆腐', description: '下饭神器', image: `${IMG}/product-m001-04.jpg`, price: 12, stock: 50, onSale: true, monthlySalesText: '月售300+', goodRateText: '好评率96%' },
  { productId: 'p202', storeId: 'm001', categoryId: 'c201', name: '鱼香肉丝', image: `${IMG}/product-m001-05.jpg`, price: 15, stock: 40, onSale: true, monthlySalesText: '月售260+', goodRateText: '好评率95%' },
  { productId: 'p203', storeId: 'm001', categoryId: 'c202', name: '米饭', image: `${IMG}/product-m001-06.jpg`, price: 2, stock: 100, onSale: true },
  { productId: 'p204', storeId: 'm003', categoryId: 'c201', name: '巨无霸', description: '经典双层牛肉', image: `${IMG}/product-m003-01.jpg`, price: 25.5, stock: 60, onSale: true, monthlySalesText: '月售1800+', goodRateText: '好评率97%' },
  { productId: 'p205', storeId: 'm003', categoryId: 'c202', name: '薯条（大）', image: `${IMG}/product-m003-03.jpg`, price: 11, stock: 80, onSale: true },
  { productId: 'p206', storeId: 'm004', categoryId: 'c201', name: '羊肉串（10串）', description: '现烤现送', image: `${IMG}/product-m004-01.jpg`, price: 28, stock: 30, onSale: true, monthlySalesText: '月售500+', goodRateText: '好评率94%' },
  { productId: 'p207', storeId: 'm004', categoryId: 'c202', name: '烤茄子', image: `${IMG}/product-m004-02.jpg`, price: 10, stock: 20, onSale: true },
  { productId: 'p208', storeId: 'm005', categoryId: 'c201', name: '精品肥牛', image: `${IMG}/product-m005-01.jpg`, price: 39, stock: 25, onSale: true, monthlySalesText: '月售400+', goodRateText: '好评率98%' },
  { productId: 'p209', storeId: 'm005', categoryId: 'c202', name: '手切鲜羊肉', image: `${IMG}/product-m005-02.jpg`, price: 46, stock: 18, onSale: true },
]

// 给非 m002 商品挂分类（按 storeId 生成所属分类集合）
const CATEGORIES_BY_STORE: Record<string, StoreCategory[]> = {
  m002: CATEGORIES_M002,
  m001: CATEGORIES_GENERIC,
  m003: CATEGORIES_GENERIC,
  m004: CATEGORIES_GENERIC,
  m005: CATEGORIES_GENERIC,
}

const ALL_PRODUCTS: Product[] = [
  ...PRODUCTS_M002.map((p) => ({
    ...p,
    monthlySalesText: p.productId === 'p101' ? '月售1200+' : undefined,
    goodRateText: p.productId === 'p101' ? '好评率98%' : undefined,
    description: p.description ?? (p.productId === 'p101' ? '经典香脆，辣味十足' : undefined),
  })),
  ...PRODUCTS_GENERIC,
]

/** mock 内部商品查找（购物车加购重读价格/库存用） */
export function findMockProduct(productId: string): Product | undefined {
  return ALL_PRODUCTS.find((p) => p.productId === productId)
}

/** 注册表：key = `METHOD path` */
export const storeMocks: Record<string, MockHandler> = {
  // 列表：暂无 keyword/categoryId/sort 过滤行为，全量返回（后续按验收用例补）
  'GET /stores': () => ok<StoreSummary[]>(STORES),

  ...Object.fromEntries(
    STORES.map((store) => [`GET /stores/${store.storeId}`, () => ok<StoreSummary>(store)]),
  ),

  ...Object.fromEntries(
    Object.entries(CATEGORIES_BY_STORE).map(([storeId, categories]) => [
      `GET /stores/${storeId}/categories`,
      () => ok<StoreCategory[]>(categories),
    ]),
  ),

  ...Object.fromEntries(
    Object.keys(CATEGORIES_BY_STORE).map((storeId) => [
      `GET /stores/${storeId}/products`,
      () => ok<Product[]>(ALL_PRODUCTS.filter((p) => p.storeId === storeId)),
    ]),
  ),
}
