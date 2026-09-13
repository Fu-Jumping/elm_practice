import { beforeEach, describe, expect, it } from 'vitest'
import {
  SEARCH_HISTORY_KEY,
  SEARCH_HISTORY_MAX,
  clearSearchHistory,
  pushSearchHistory,
  readSearchHistory,
} from '../searchHistory'

/**
 * 搜索历史（TODO-USER-107，PRD 7.16.1「首页-搜索框」：搜索历史与热门词本期实现）
 * SH-1 空态：无记录返回空数组
 * SH-2 写入：最新在前、trim 后写入
 * SH-3 去重：同词重复搜索只保留一条并提到最前
 * SH-4 上限：最多 SEARCH_HISTORY_MAX 条，超出丢弃最旧
 * SH-5 清空
 * SH-6 容错：localStorage 内容损坏 / 抛错（隐私模式）时不抛异常，读写降级为空
 */
describe('searchHistory（本机搜索历史）', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('SH-1 无记录时返回空数组', () => {
    expect(readSearchHistory()).toEqual([])
  })

  it('SH-2 写入后最新在前，且首尾空白被裁剪', () => {
    pushSearchHistory('肯德基')
    pushSearchHistory('  麦当劳  ')
    expect(readSearchHistory()).toEqual(['麦当劳', '肯德基'])
  })

  it('SH-3 同词重复只保留一条并提到最前', () => {
    pushSearchHistory('汉堡')
    pushSearchHistory('披萨')
    pushSearchHistory('汉堡')
    expect(readSearchHistory()).toEqual(['汉堡', '披萨'])
  })

  it('SH-4 数量上限：超过上限丢弃最旧记录', () => {
    for (let i = 1; i <= SEARCH_HISTORY_MAX + 3; i += 1) pushSearchHistory(`词${i}`)
    const history = readSearchHistory()
    expect(history).toHaveLength(SEARCH_HISTORY_MAX)
    expect(history[0]).toBe(`词${SEARCH_HISTORY_MAX + 3}`)
    expect(history).not.toContain('词1')
  })

  it('SH-5 清空后为空', () => {
    pushSearchHistory('奶茶')
    clearSearchHistory()
    expect(readSearchHistory()).toEqual([])
  })

  it('SH-6 容错：存储内容损坏时不抛错并降级为空；写入也不抛错', () => {
    localStorage.setItem(SEARCH_HISTORY_KEY, '{不是合法 JSON')
    expect(() => readSearchHistory()).not.toThrow()
    expect(readSearchHistory()).toEqual([])
    // 非字符串数组也视为损坏
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify([1, 2, 3]))
    expect(readSearchHistory()).toEqual([])
    // 空关键词不写入
    pushSearchHistory('   ')
    expect(readSearchHistory()).toEqual([])
  })
})
