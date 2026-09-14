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
const store = (storeId: string): AiRun => ({ kind: 'store', text: storeId, storeId })

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

  it('AR-4 商家编号 `[m002]` 解析为可跳转片段；Markdown 链接语法不当作编号', () => {
    const blocks = parseAiReply('推荐肯德基宅急送 [m002] 的香辣鸡腿堡')
    expect(blocks[0]).toEqual<AiBlock>({
      kind: 'paragraph',
      runs: [text('推荐肯德基宅急送 '), store('m002'), text(' 的香辣鸡腿堡')],
    })

    const link = parseAiReply('见 [官网](https://example.com)')
    expect(link[0]).toEqual<AiBlock>({ kind: 'paragraph', runs: [text('见 [官网](https://example.com)')] })
  })

  it('AR-5 列表条目内的加粗与商家编号同样解析（混合行）', () => {
    const blocks = parseAiReply('- **肯德基宅急送** [m002] 香辣鸡腿堡 ¥19.50')
    expect(blocks).toEqual<AiBlock[]>([
      { kind: 'list', items: [[bold('肯德基宅急送'), text(' '), store('m002'), text(' 香辣鸡腿堡 ¥19.50')]] },
    ])
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
