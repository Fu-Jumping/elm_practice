/**
 * 店铺域 mock（契约 §3.2 + 固定演示数据：m001–m005，主商家 m002 肯德基宅急送）
 * 商品编号 p101 起；字段严格按契约最小集；金额为数字元、保留两位小数
 * 注册为纯数据映射：模块加载期零调用（无 ESM 循环依赖陷阱）
 * TODO(9/4 起按 docs/backend/后端联调验收用例.md)：补全各店分类/商品与筛选参数行为
 */
import type { Product, StoreCategory, StoreSummary } from '@/services/api/types'
import type { MockHandler } from './index'
import { ok } from './index'

const STORES: StoreSummary[] = [
  {
    storeId: 'm001',
    name: '老王小店',
    description: '家常小炒 · 经济实惠',
    rating: 4.6,
    monthlySales: 1200,
    deliveryMinutes: 30,
    startPrice: 15,
    deliveryFee: 3,
    status: 'OPEN',
  },
  {
    storeId: 'm002',
    name: '肯德基宅急送',
    description: '炸鸡汉堡 · 外卖到家',
    rating: 4.8,
    monthlySales: 3500,
    deliveryMinutes: 25,
    startPrice: 20,
    deliveryFee: 5,
    status: 'OPEN',
  },
  {
    storeId: 'm003',
    name: '麦当劳',
    description: '经典快餐 · 随时开吃',
    rating: 4.7,
    monthlySales: 2800,
    deliveryMinutes: 25,
    startPrice: 20,
    deliveryFee: 5,
    status: 'OPEN',
  },
  {
    storeId: 'm004',
    name: '老胖烧烤',
    description: '深夜食堂 · 现烤现送',
    rating: 4.5,
    monthlySales: 800,
    deliveryMinutes: 40,
    startPrice: 30,
    deliveryFee: 4,
    status: 'CLOSED',
  },
  {
    storeId: 'm005',
    name: '元盛居火锅',
    description: '铜锅涮肉 · 宅家开涮',
    rating: 4.9,
    monthlySales: 950,
    deliveryMinutes: 45,
    startPrice: 50,
    deliveryFee: 6,
    status: 'OPEN',
  },
]

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
    price: 19.5,
    stock: 100,
    onSale: true,
  },
  {
    productId: 'p103',
    storeId: 'm002',
    categoryId: 'c101',
    name: '老北京鸡肉卷',
    price: 17,
    stock: 80,
    onSale: true,
  },
  {
    productId: 'p104',
    storeId: 'm002',
    categoryId: 'c102',
    name: '黄金鸡块（5块）',
    price: 11.5,
    stock: 120,
    onSale: true,
  },
  {
    productId: 'p105',
    storeId: 'm002',
    categoryId: 'c103',
    name: '九珍果汁',
    price: 9,
    stock: 150,
    onSale: true,
  },
]

/** 注册表：key = `METHOD path` */
export const storeMocks: Record<string, MockHandler> = {
  // 列表：暂无 keyword/categoryId/sort 过滤行为，全量返回（后续按验收用例补）
  'GET /stores': () => ok<StoreSummary[]>(STORES),

  ...Object.fromEntries(
    STORES.map((store) => [`GET /stores/${store.storeId}`, () => ok<StoreSummary>(store)]),
  ),

  'GET /stores/m002/categories': () => ok<StoreCategory[]>(CATEGORIES_M002),
  'GET /stores/m002/products': () => ok<Product[]>(PRODUCTS_M002),
}
