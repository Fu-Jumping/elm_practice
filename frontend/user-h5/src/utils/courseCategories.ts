/**
 * 课程 10 类点餐分类固定数据（PRD 7.16.1「首页-分类宫格」字段列）
 *
 * 口径出处：PRD 该行明写「分类项由课程 10 类点餐分类数据渲染（**课程固定分类数据**或分类接口返回）」——
 * 即课程类别允许以固定数据承载，不必等平台级分类接口。
 * 设计稿超范围栏目（超市便利、水果鲜花、买菜、买药、跑腿）不进入本表，仍为不可交互占位。
 *
 * 与「分类商家列表」的连接口径（2026-09-15 接线补全）：
 * - 宫格分类项点击携带本表的 `categoryId` 进入分类商家列表（PRD 826 行交互列）；
 * - 分类商家列表仍按契约 §3.2 `GET /stores?categoryId=` 取数，**接口返回空数组即空态**，
 *   不用演示数据伪装成功（PRD 835 行）；
 * - 平台级分类数据在后端尚未落库（CHG-001 已把「点餐分类 10 类」列为本期不做），
 *   因此真实后端下宫格入口会落到「该分类暂无商家」空态——该缺口已登记，属数据侧而非接线问题。
 */

/** 课程分类项：`categoryId` 为课程固定编号（`pc` = platform course），名称与设计稿宫格文案一致 */
export interface CourseCategory {
  categoryId: string
  name: string
}

export const COURSE_CATEGORIES: readonly CourseCategory[] = [
  { categoryId: 'pc01', name: '美食外卖' },
  { categoryId: 'pc02', name: '甜品饮品' },
  { categoryId: 'pc03', name: '0元领水果' },
  { categoryId: 'pc04', name: '会吃' },
  { categoryId: 'pc05', name: '放心点榜' },
  { categoryId: 'pc06', name: '趋势情报局' },
  { categoryId: 'pc07', name: '汉堡西餐' },
  { categoryId: 'pc08', name: '奶茶果汁' },
  { categoryId: 'pc09', name: '全部' },
]

/** 按名称取课程分类编号（宫格单元声明名称后由本函数解析，避免两处硬编码编号） */
export function courseCategoryIdOf(name: string): string | undefined {
  return COURSE_CATEGORIES.find((category) => category.name === name)?.categoryId
}
