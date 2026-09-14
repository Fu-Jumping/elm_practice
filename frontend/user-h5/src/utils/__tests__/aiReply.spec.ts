import { describe, expect, it } from 'vitest'
import { parseAiReply, type AiBlock, type AiRun } from '../aiReply'

/**
 * AI 回复渲染解析用例 AR-1~AR-6（AI 点餐助手前端 PRD §4.1/§4.2，2026-09-14）
 *
 * 口径出处：PRD §4.1 表格（`**加粗**` 加粗、`- 项` 无序列表、换行保留、其余原样）、
 * §4.2（商家编号 `[m002]` 渲染为可点击链接，点击跳商家详情）。
 * 实现口径：解析为**结构化块**（不在本层拼 HTML 字符串），渲染层用 Vue 插值输出 → 天然无 XSS 面。
 * 本组在 feat: 实现前必须红（`utils/aiReply.ts` 由 feat: 创建）。
 */
const bold = (value: string): AiRun => ({ kind: 'bold', text: value })
const text = (value: string): AiRun => ({ kind: 'text', text: value })
/** 商家可跳转片段：text = 展示文案（新口径为商家名），storeId = 路由参数 */
const store = (name: string, storeId: string): AiRun => ({ kind: 'store', text: name, storeId })
/** 用例内的商家列表（供按名匹配） */
const STORES_REF = [
  { storeId: 'm002', name: '肯德基宅急送' },
  { storeId: 'm003', name: '麦当劳' },
]

describe('AI 回复解析（AI点餐助手前端PRD §4.1/§4.2）', () => {
  it('AR-1 多行文本拆为多个段落块，空行只分段不产生空块', () => {
    const blocks = parseAiReply('第一行\n第二行\n\n第三行')
    expect(blocks).toEqual<AiBlock[]>([
      { kind: 'paragraph', runs: [text('第一行')] },
      { kind: 'paragraph', runs: [text('第二行')] },
      { kind: 'paragraph', runs: [text('第三行')] },
    ])
  })

  it('AR-2 连续的 `- ` 行合并为一个无序列表块（去前缀并 trim）', () => {
    const blocks = parseAiReply('推荐如下：\n- 香辣鸡腿堡 ¥19.50\n- 九珍果汁 ¥9.00\n\n以上。')
    expect(blocks).toEqual<AiBlock[]>([
      { kind: 'paragraph', runs: [text('推荐如下：')] },
      {
        kind: 'list',
        items: [[text('香辣鸡腿堡 ¥19.50')], [text('九珍果汁 ¥9.00')]],
      },
      { kind: 'paragraph', runs: [text('以上。')] },
    ])
  })

  it('AR-3 `**文字**` 解析为加粗片段，其余为普通片段且顺序不变', () => {
    const blocks = parseAiReply('**肯德基宅急送** 现在有 **香辣鸡腿堡** 在售')
    expect(blocks[0]).toEqual<AiBlock>({
      kind: 'paragraph',
      runs: [bold('肯德基宅急送'), text(' 现在有 '), bold('香辣鸡腿堡'), text(' 在售')],
    })
  })

  it('AR-4 商家名匹配为可跳转片段（PRD §4.2：回复不出现商家编号，前端按店名匹配 storeId）', () => {
    const blocks = parseAiReply('推荐肯德基宅急送的香辣鸡腿堡', STORES_REF)
    expect(blocks[0]).toEqual<AiBlock>({
      kind: 'paragraph',
      runs: [text('推荐'), store('肯德基宅急送', 'm002'), text('的香辣鸡腿堡')],
    })
  })

  it('AR-4b 加粗的商家名同样成为可跳转片段（AI 常用 **店名** 强调，不得只加粗不可点）', () => {
    const blocks = parseAiReply('**肯德基宅急送** 有香辣鸡腿堡 ¥19.50', STORES_REF)
    expect(blocks[0]).toEqual<AiBlock>({
      kind: 'paragraph',
      runs: [store('肯德基宅急送', 'm002'), text(' 有香辣鸡腿堡 ¥19.50')],
    })
  })

  it('AR-4c 旧编号标记 `[m002]` 仍解析为跳转（后端提示词回退时的防御），Markdown 链接不误判', () => {
    const blocks = parseAiReply('推荐肯德基宅急送 [m002] 的香辣鸡腿堡', STORES_REF)
    const firstBlock = blocks[0]
    const runs = firstBlock && firstBlock.kind === 'paragraph' ? firstBlock.runs : []
    expect(runs.some((run) => run.kind === 'store' && run.storeId === 'm002')).toBe(true)

    const link = parseAiReply('见 [官网](https://example.com)', STORES_REF)
    expect(link[0]).toEqual<AiBlock>({ kind: 'paragraph', runs: [text('见 [官网](https://example.com)')] })
  })

  it('AR-4d 不在商家列表中的名字不生成跳转（只按已知商家匹配，不猜 storeId）', () => {
    const blocks = parseAiReply('推荐老王面馆的红烧肉', STORES_REF)
    expect(blocks[0]).toEqual<AiBlock>({ kind: 'paragraph', runs: [text('推荐老王面馆的红烧肉')] })
  })

  it('AR-4e 名称前缀重叠时取最长匹配（老王小店 vs 老王）', () => {
    const blocks = parseAiReply('去老王小店看看', [
      { storeId: 'm001', name: '老王小店' },
      { storeId: 'mx', name: '老王' },
    ])
    expect(blocks[0]).toEqual<AiBlock>({
      kind: 'paragraph',
      runs: [text('去'), store('老王小店', 'm001'), text('看看')],
    })
  })

  it('AR-5 列表条目内的商家名同样解析为可跳转片段（混合行）', () => {
    const blocks = parseAiReply('- **肯德基宅急送** 香辣鸡腿堡 ¥19.50', STORES_REF)
    expect(blocks).toEqual<AiBlock[]>([
      { kind: 'list', items: [[store('肯德基宅急送', 'm002'), text(' 香辣鸡腿堡 ¥19.50')]] },
    ])
  })

  it('AR-5b 未提供商家列表时，加粗仍按加粗渲染（不因缺少索引而丢样式）', () => {
    const blocks = parseAiReply('**肯德基宅急送** 有香辣鸡腿堡')
    expect(blocks[0]).toEqual<AiBlock>({
      kind: 'paragraph',
      runs: [bold('肯德基宅急送'), text(' 有香辣鸡腿堡')],
    })
  })

  it('AR-6 原文中的 HTML 只作为纯文本片段出现（解析结果不含 HTML 字符串）', () => {
    const blocks = parseAiReply('<script>alert(1)</script> 与 <b>粗体</b>')
    expect(blocks).toEqual<AiBlock[]>([
      { kind: 'paragraph', runs: [text('<script>alert(1)</script> 与 <b>粗体</b>')] },
    ])
    // 解析结果只含结构化字段（无预拼 HTML 串），渲染层用插值输出
    expect(Object.keys(blocks[0]!)).toEqual(['kind', 'runs'])
  })

  it('AR-7 空字符串与纯空白返回空块列表（不渲染空气泡内容）', () => {
    expect(parseAiReply('')).toEqual([])
    expect(parseAiReply('   \n  \n')).toEqual([])
  })
})
