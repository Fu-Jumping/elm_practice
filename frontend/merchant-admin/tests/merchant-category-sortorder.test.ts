/**
 * BUG-20260908-004 回归测试（TDD 红）：分类排序字段契约
 *
 * 契约与后端 DTO 字段为 sortOrder（Requests.CategoryCreate.sortOrder），
 * 当前 services 层 CategoryDraft/Category/normalizeCategory 使用 sort，
 * 导致排序值被后端静默丢弃（实测 POST sort:9 → 保存 sortOrder:1）。
 *
 * 本测试按目标契约（sortOrder）编写，预期首次运行失败（红）；
 * services 层字段统一为 sortOrder 后转绿。修复时不得删除或放宽断言。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { merchantApi } from '../src/services/merchantApi'
import type { Category, CategoryDraft } from '../src/services/merchantApi'

/** 按契约口径构造排序草稿；修复前 CategoryDraft 尚无 sortOrder 字段，需显式断言 */
function draftWithSortOrder(name: string, sortOrder: number): CategoryDraft {
  return { name, sortOrder } as unknown as CategoryDraft
}

/** 目标契约：排序值只能从 sortOrder 读取（不允许再用旧字段 sort 兜底） */
function sortOf(category: Category): number | undefined {
  return (category as { sortOrder?: number }).sortOrder
}

beforeEach(async () => {
  await merchantApi.login('merchant-a', '123456')
})

describe('分类排序字段契约（BUG-20260908-004）', () => {
  it('创建分类时 sortOrder 应被保留', async () => {
    const created = await merchantApi.createCategory(draftWithSortOrder('QA-排序分类', 9))
    expect(sortOf(created)).toBe(9)
  })

  it('分类列表应回显 sortOrder', async () => {
    await merchantApi.createCategory(draftWithSortOrder('QA-排序分类-列表', 7))
    const list = await merchantApi.listCategories()
    const found = list.find((category) => category.name === 'QA-排序分类-列表')
    expect(found).toBeTruthy()
    expect(sortOf(found as Category)).toBe(7)
  })
})
