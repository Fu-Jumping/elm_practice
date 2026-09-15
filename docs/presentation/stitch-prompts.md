# Stitch 生成提示词 · 结课汇报「AI 前端 SOP」演示页面

> **用途**：把 `docs/_archive/presentation/2026-09-10-结课汇报-AI前端SOP-演示页面大纲.md`（7 屏 + 6 个备用页）翻译成可直接粘贴进 **Google Stitch** 的提示词。
> **风格真源（重要）**：**以本仓库演示页 `docs/presentation/index.html` 的实际视觉为准**——深蓝 / 天蓝 / 白 / 少量金的「天津大学校园汇报」风格；**不要套用用户端移动 H5 的设计系统**（那是 App 的 390px 口径，与演示页不是一套）。详细令牌见 §1。
> **与既有约定的关系**：`docs/todo/用户端.md` §4.3 的「路径 B」提示词是**移动端 App 原型**口径，与本文件的**桌面演示页**口径不同；两处都遵守同一条原则——AI 出图只作参考，真源优先级为「导出稿 > 设计系统 > 提示词」。
> **写法依据**：Stitch 官方提示词指南与 Google Labs 官方 skill（`generate-design`）的口径——**生成提示词只描述「版式 + 内容 + 结构」，不写色值、字体、圆角**，视觉主题由项目级设计系统统一施加；编辑提示词才允许出现 hex 做精确校准。
> **本页定位**：演示页是**信息图（图表页）**，不是 App 界面；Stitch 没有「幻灯片」设备类型，因此按 **DESKTOP 设备类型 + 单屏信息图** 生成，7 屏 = 7 个 screen。
> **证据口径**：本文件里所有数字都抄自上述大纲（**照抄，勿改**）。Stitch 只会编造数字，凡是「数字必须准确」的地方都在提示词里写死。

---

## 0. 使用方式（三步）

1. **建项目**：在 Stitch 里新建项目，项目名建议 `AI 前端 SOP · 结课汇报演示页`。
2. **先落设计系统（关键）**：本项目**已有定稿的 Stitch 主题**（`Pragmatic Vitality`，见 `docs/design/设计系统-用户端.md`）。把下方 §1 的 `DESIGN.md` 内容落成项目设计系统；**落成之后，7 条生成提示词里不要再写任何色值/字体**。
   - 若跳过这一步（项目无设计系统）：生成提示词必须把 §1 里「旁路写法」那段样式前缀拼到每条提示词开头，否则 Stitch 会随机配色。
3. **逐屏生成**：用 §2 的第 1 条提示词生成「总览」屏 → 用 §3 的编辑提示词逐屏往下做；**一次只改一屏/一块**，出图不理想优先「编辑」而不是整屏重生成。

> **提示词语言**：Stitch 对英文结构词与中文内容都能理解。下方提示词混排（结构用英文关键词、内容用中文），这是刻意的：英文术语（`sticky header`、`card grid`、`bar chart`）命中率更高，中文负责保证文案与数字不被翻译走样。

---

## 1. 项目级设计系统（`DESIGN.md`，做一次即可）

> **只需一次性落到项目里；此后 7 条提示词都不重复主题。** 内容**转写自演示页 `docs/presentation/index.html` 的实际取值**（深蓝 / 天蓝 / 白 / 少量金的天津大学校园汇报风格）。该页自述：「视觉采用深蓝、天蓝、白与少量金色的天津大学校园汇报风格；校园线稿为原创抽象装饰，不作为官方校徽或官方版式声明。」

```markdown
# Design System — 结课汇报演示页（天津大学校园汇报风格）

## Overview
A full-bleed presentation deck: a fixed shell (top brand bar + chapter tab strip) wrapping
one slide at a time, plus left/right edge navigation zones, a closing source line, and a
print stylesheet that paginates one slide per page.
Tone: formal academic report. Deep navy and white dominate, gold is a thin accent line only,
blue carries data and links. Generous vertical rhythm, restrained ornament, serif display type
against a sans body. Not a mobile app, not a dashboard — a projected slide deck.

## Colors
- Deep navy (primary dark, cover/dividers, primary buttons, flow nodes): #063866
- Deeper navy (evidence panels): #042747
- Blue (links, kicker, data figures, code, active emphasis): #006ab4
- Ice blue wash (panels, chips, strips, node fills): #e8f2f9
- Gold (accent rule only — 3-4px bars, active tab underline, left metric rail): #c9a365
- Body ink: #17324a
- Muted text: #61778c
- Hairline border: #d9e3eb
- Page paper background: #f5f8fb
- Card surface: #ffffff
- Reserve: #8fe3ca (only for a verified/green result inside an evidence panel); #ffc9bc (only for a failed/red result inside an evidence panel)

## Typography
- Display/headings/numerals: Song-style serif stack ("STSong", "SimSun", serif)
- Body/UI: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif
- Monospace: Consolas, monospace — MANDATORY for file paths, code, table numerals
- Scale: slide h1 clamp(36px,4.1vw,64px) weight 700, letter-spacing 2px; slide h2 clamp(28px,2.6vw,40px) weight 700;
  kicker 11px weight 700, letter-spacing 3px, uppercase; lede 16px line-height 1.8, max-width 940px;
  card h3 20px navy; card/body text 14px line-height 1.8; note/footnote 12px; numeral 46-52px serif

## Shape & Depth
- Radius: cards 10px, buttons and chips 6px, small tags 4px, panels 7px, modals 12px. Never pill-shaped.
- Shadows: ONLY on interactive card hover (0 8px 24px #093b6510) and on the modal (0 30px 90px #001c3450).
  Flat cards otherwise. No gradients except the cover watermark.

## Elevation & Layout
- Page: paper #f5f8fb background; white cards with 1px #d9e3eb borders; ice #e8f2f9 for callouts and inactive fills.
- Shell: top bar 70px, white with 1px bottom border, full width, padding 0 2.5vw; a 48px chapter tab strip may sit
  directly under it on the same white surface.
- Slide body: padding 24px 5vw, fills the remaining viewport height, scrolls only when content overflows;
  max content width 1440px.
- Edge navigation: 44px transparent hover zones fixed to the left and right, revealing a large serif arrow and
  a horizontal blue gradient on hover.

## Components
- Brand block: gold 4px left-border rule, a serif year numeral at ~26-32px, the university name in serif
  with 4px letter-spacing, and an uppercase letter-spaced English subtitle.
- Chapter tabs: flat text buttons in muted #61778c; the active tab turns navy with a 3px gold bottom border.
- Kicker: uppercase 11px blue label sitting above each slide heading.
- Metric block: white fill with a 3px gold left border, a 46px serif navy numeral, and a 13px muted caption.
- Flow node: navy #063866 fill, white text, 6px radius, padding 16px 12px; nodes on one horizontal line,
  separated by a small gold #c9a365 arrow glyph. Use this for diagrams where every node is equal in weight.
- White content card: #ffffff, 1px #d9e3eb, radius 10px, padding 25px, navy heading.
- Data table: white surface, 1px #d9e3eb row separators, ice #e8f2f9 sticky header row,
  11-13px text, Consolas numerals, no vertical rules, no zebra striping.
- Evidence panel: #042747 fill, 7px radius, #dbeaf4 monospace 13px/1.9 text, paths in blue;
  use #8fe3ca / #ffc9bc inside it to mark green/red outcomes.
- Callout strip: #e8f2f9 fill with a 3px left border in #006ab4, 14px text.
- Chip/tag: 11px bold uppercase-ish label, #e8f2f9 fill, #006ab4 text, 4px radius.
- Source/footnote line: 12px #61778c, pinned to the bottom of the slide.
- Section watermark numeral: giant serif numeral at 11% white opacity, bleeding off the bottom-right.
- Modal: white, 12px radius, 30px padding, backdrop #00203ac7 with blur(4px).

## Motion & Print
- Entry motion is a subtle 250ms fade and 5px rise; all motion is disabled under prefers-reduced-motion.
- Print/PDF: hide the shell (header, tabs, footer, progress, actions) and paginate one slide per page,
  forcing each slide to at least 95vh and preserving navy backgrounds.

**旁路写法（项目无设计系统时才用）**：把下面这段拼在每条生成提示词的最前面，替换掉「不写样式」的约定：
```

STYLE (apply globally): presentation deck in a formal Chinese university campus report style.
Deep navy #063866 for primary buttons, dark bands and flow nodes; blue #006ab4 for links, kickers,
data figures and code; gold #c9a365 strictly as a thin accent rule (3-4px bars, active tab underline,
left rail of metric blocks) — never as a fill; ice blue #e8f2f9 for panels and chips;
paper #f5f8fb page background; white #ffffff cards with 1px #d9e3eb borders.
Serif (Song-style) for headings and large numerals, sans-serif for body text,
monospace for file paths and table numerals.
Radius: cards 10px, buttons/chips 6px, tags 4px. No pill shapes.
Shadows only on card hover and modals; flat otherwise. No gradients (except a faint watermark numeral).
Slide deck layout: 70px top brand bar + chapter tab strip, then one full-height slide with
24px 5vw padding, generous whitespace, a kicker above each heading, and a 12px muted source line at the bottom.
Formal academic tone. Chinese text only.

```

---

### 1.1 屏幕通用基线（§2–§4 每条提示词都适用，生成前先看这一节）

> **为什么单独写一节**：官方口径是「版式与结构进提示词、颜色与字体进设计系统」，所以 §2–§4 的提示词**不写 hex**；但演示页的形态必须说清，否则 Stitch 会按 App 界面来画。下面这套约定与 §1 的 DESIGN.md 是同一套东西的「人类可读版」。

**屏幕类型与画幅**
- 类型：**演示用信息屏（presentation slide）**，桌面优先，16:9，按 `DESKTOP` 设备类型生成。
- 画幅：外壳 1600×900，内容区宽 1440px 居中；**一屏一版、不纵向滚动**。
- 每屏骨架（与演示页一致）：顶部 `kicker`（大写字距标签）→ 标题 → 一句 lede → 主体（流程条 / 表格 / 卡片网格 / 图表）→ 右下角落款 `source` 小字（12px 弱化色）。

**颜色用法（按语义取用，不要按颜色名另造）**
| 用途 | 取值 | 说明 |
| --- | --- | --- |
| 标题、深色带、主按钮、流程图节点 | 深蓝 `#063866` | 流程节点用深蓝实底 + 白字，与白色内容卡刻意区分 |
| 链接、kicker、数据数字、代码、激活强调 | 天蓝 `#006ab4` | 屏幕上的「第二重点」一律用它 |
| 面板、chip、callout、表格表头 | 冰蓝 `#e8f2f9` | 浅底承载，不做渐变 |
| 大号数字、分区标题 | 墨色 `#17324a` | 正文与数字主色 |
| 次要文字、落款、图注 | 弱化色 `#61778c` | 12–13px |
| 卡片描边 / 表格分隔线 | `#d9e3eb` | 1px，唯一的间隔手段 |
| 纸底 / 卡片 | `#f5f8fb` / `#ffffff` | 页面底 vs 内容面 |
| 金色强调 | `#c9a365` | **只作细线**：3–4px 竖条、激活下划线、指标块左轨、箭头；**不做填充** |
| 已验证 / 偏差（只在对比与结果判定时） | `#8fe3ca`（绿）/ `#ffc9bc`（红） | 只出现在深蓝证据面板内或偏差对照处，其余场合一律不用红绿 |
| 中性填充（表格次层 / 代码底） | `#eef3f8` / `#2f4a61` | 需要层次时用，不要另造颜色 |

**字体与数字**：标题与大号数字用宋体栈（`"STSong","SimSun",serif`）；正文用黑体栈；**所有文件路径、代码、表格数字用 Consolas 等宽**。

**形态约定**
- 圆角：卡片 10px、按钮与 chip 6px、小标签 4px、面板 7px、弹窗 12px；**一律不做胶囊**。
- 阴影：默认全平；**只有卡片 hover（`0 8px 24px #093b6510`）与弹窗（`0 30px 90px #001c3450`）允许**。
- 无渐变、无拟物、无玻璃拟态；层级靠「纸底 → 白卡 → 冰蓝块」+ 1px 描边表达。
- 动效：静态稿不体现；实际页面只有 250ms 淡入上移，且响应 `prefers-reduced-motion`。

**版式组件对照表（说哪个用哪个）**
| 内容形态 | 用演示页的哪个组件 |
| --- | --- |
| 多段等价流程 | `.pipeline`：深蓝实底节点等宽一行，金色箭头分隔 |
| 关键数字 | `.metric`：白底 + 3px 金色左轨 + 46px 宋体深蓝数字 + 13px 弱化说明 |
| 说明型内容块 | `.card`：白底 + 1px 描边 + 10px 圆角 + 25px 内边距 + 深蓝标题 |
| 结论 / 提示条 | `.strip`：冰蓝底 + 3px 天蓝左边框 |
| 标签 | `.chip`：冰蓝底 + 天蓝字 + 4px 圆角 |
| 代码 / 路径证据 | `.evidence`：深蓝 `#042747` 底 + 等宽浅字 |
| 路径等宽小字 | `.code`：天蓝 12px 等宽 |
| 落款与图注 | `.source` / `.note`：12px 弱化色 |

> **§2–§4 提示词里的 "accent" 一律等于上表的「天蓝 `#006ab4`」；"hairline" 等于「1px `#d9e3eb`」；"card" 等于 10px 圆角白卡。**
>
> **历史词表映射**（早期版本沿用移动 H5 设计系统的叫法，按此对照阅读）：`text-secondary` / `text-tertiary` / `muted` = 弱化色 `#61778c`；`label-sm` / `label-md` = 12px；`body-md` = 14px；`headline-md` = 20px；`headline-lg` = 大号数字 46px 宋体。

---

## 2. 主提示词（生成屏 1「一张图看懂这条链」）

> **为什么先做屏 1**：它是整份演示页的视觉基线（流程条 + 数字徽章 + 证据索引），屏 2–7 都复用这套版式。先把它调顺，后面全是编辑。

**设备类型**：`DESKTOP`

```text
An information-dense presentation screen for a software engineering course report.
Topic: a traceable AI front-end pipeline, from design system to shipped pages.
The screen must read like a single page from an engineering report: a title bar, one
horizontal pipeline diagram, a data table, and a small monospace evidence index.
No App navigation, no login, no hero image, no marketing copy.

PLATFORM: Web, desktop-first, 16:9 presentation slide. Entire layout fits one screen height
without vertical scrolling. Slide frame is 1600x900; content sits in a 1440x760 centered
container with generous whitespace. Section numbering is visible as the visual rhythm.

PAGE STRUCTURE:

1. Slide header (sticky, full width, 1px bottom hairline border):
   - Left: section number "屏 1" in small caps above the title.
   - Title, weight 700: "一张图看懂这条链"
    - Subtitle, in the muted #61778c: "设计系统 → 设计稿原型 → 代码导出 → PRD 原型说明 → 智能体复刻 → 验证与验收"
   - Right: small monospace tag "v2 · 2026-09-10 · 全 7 屏"
   - Below the subtitle, one single-line claim in a subtle callout block:
     "我们有一条从设计系统到上线页面的可追溯 AI 前端流水线——每一段都有可校验产物，复刻度被拆成可测指标，AI 的产出由人用规则和门禁收口。"

2. Pipeline diagram (the hero element, roughly 40% of the content height):
   - 6 equal-width flow nodes on one horizontal line, connected by thin 1px arrows:
     "① 设计系统" → "② 设计稿原型" → "③ 代码导出" → "④ PRD 原型说明" → "⑤ 智能体复刻" → "⑥ 验证与验收"
   - Each node is a navy (#063866) solid-fill box, white text, 6px radius, padding 16px 12px, all six equal width. Stacked top to bottom inside each node:
     a) the step name (weight 600, 18px)
     b) the artifact path in small monospace, revealing the repo structure:
        "docs/design/设计系统-用户端.md"
        "docs/prd-assets/user/**"
        "docs/design/exports/用户端/**"
        "docs/PRD.md §7.16.1"
        "frontend/user-h5/**"
        "断言 / 截图 / 台账"
     c) ONE oversized metric figure directly under the path, in white serif, weight 700, 46px
        (this is the focal point of each node):
        "1 份定稿"    "32 个目录"    "120 个文件"    "72 区行"    "11 个视图 / 13 条路由"    "23/23"
     d) a 12px #61778c caption under the figure:
        "定稿 + 实现口径 4 条；tokens.css 58 行"
        "导出目录；红框逐区标注图 88 张"
        "code.html 28 / jsx 30 / scss 30 / 截图 29 + 精细版四件套；引用素材 243 个"
        "27 个页面与弹层组；五列 + 8 条统一规则"
        "单测 148（结课前统一口径）"
        "结构断言 23/23；尺寸值域 78.0%；色值可溯源 96.1%"
   - The six nodes must be visually equal weight — this is a chain, not a funnel.

3. Summary table below the diagram (compact, 3 columns, full container width):
   Header row: "段" | "产物" | "数字"
   Rows, exactly these, no additional rows, no invented values:
   - ① 设计系统 | docs/design/设计系统-用户端.md | 1 份定稿 + 实现口径 4 条；令牌落地 tokens.css 58 行
   - ② 设计稿原型 | docs/prd-assets/user/** | 32 个导出目录；红框逐区标注图 88 张
   - ③ 代码导出 | docs/design/exports/用户端/** | 120 个文件（code.html 28 / jsx 30 / scss 30 / 截图 29 + 精细版四件套）；引用素材 243 个
   - ④ PRD 原型说明 | docs/PRD.md §7.16.1 | 72 区行 / 27 个页面与弹层组（五列 + 8 条统一规则）
   - ⑤ 智能体复刻 | frontend/user-h5/** | 11 个业务视图 / 13 条路由；单测 148 ※结课前统一口径
   - ⑥ 验证与验收 | 断言 / 截图 / 台账 | 结构断言 23/23；尺寸值域 78.0%；色值可溯源 96.1%

   4. Evidence index line (bottom, 12px #61778c, all paths in monospace):
   "证据索引：docs/design/exports/用户端（目录树）、docs/PRD.md §7.16.1、frontend/user-h5/src/views/user"

CONSTRAINTS:
- Every number above is authoritative. Do not round, translate, re-derive or replace any figure.
- Do not invent logos, avatars, partner marks, testimonial quotes, or decorative illustrations.
- No gradients, no drop shadows, no glassmorphism, no pill-shaped buttons.
- Monospace must be used for all file paths, section references and metric figures.
- The visual read order is: title → the six-node chain → the table. Nothing else competes for attention.
```

---

## 3. 逐屏提示词

> **生成还是编辑？** 屏幕 2–7 直接作为**新屏生成**（每条都是自足的），若生成结果的版式偏离基线，改用「编辑已有屏」并只贴该屏的 `PAGE STRUCTURE` 段落。全部使用 `DESKTOP` 设备类型。

### 屏 2｜设计系统：不是色卡，是「冲突裁定规则」

```text
An information-dense presentation screen (slide 2 of 7) in a software engineering report on an
AI front-end pipeline. Topic: the design system is not a color palette, it is a set of conflict
adjudication rules. Layout is a three-column comparison, then a conclusion strip.
Reuse the same slide header pattern, hairline borders, typography and monospace conventions as
the pipeline overview slide. Fits one screen height, no vertical scrolling.

PLATFORM: Web, desktop-first, 16:9. Slide 1600x900, content in a 1440x760 container.

PAGE STRUCTURE:

1. Slide header: section number "屏 2" above title "设计系统：不是色卡，是「冲突裁定规则」";
   right-side monospace tag "docs/design/设计系统-用户端.md".

2. Three-column body (equal width, 1px hairline dividers between columns, no shadows):

   Column A — "定稿与落地":
   - A short vertical chain of three white cards connected by thin arrows:
     "Stitch 主题 Pragmatic Vitality 定稿" → "令牌转写" → "frontend/user-h5/src/styles/tokens.css"
   - Under the last card, two oversized monospace figures side by side: "58 行" and "28 个变量"
   - A one-line monospace note: "--color-primary: #ff5a1f ── 单点维护"

   Column B — "实现口径 4 条" (a numbered list of four, each with a leading blue #006ab4 serif number):
   1. 界面主色与品牌强调一律 #ff5a1f；令牌 primary #ae3200 只作色板深色锚点、不直接用作界面主色；语义红只给错误/危险/未读/售罄
   2. 不引入外部字体，按系统字体栈回退
   3. 令牌以文档为源、单点维护
   4. 散文段色值与令牌块冲突时，以导出代码实际取值为准

   Column C — "冲突是量化的":
   - Title, then a compact horizontal bar chart (exactly 2 bars, values labeled at the end of each bar
     in large monospace):
     "30/30 scss 含 #ff5a1f"  → full-width bar
     "17/30 同时含 #ae3200（25 处，多为正文 color:）"  → 56% bar
   - Below the chart, a small monospace figure block titled "scss 的 font-family 共 6 种取值":
        WenQuanYi Zen Hei   254 处
        Be Vietnam Pro       47
        Liberation Serif     28
        Liberation Sans      26
        Liberation Mono       1
        Nimbus Sans           1
   - One emphasized line under it: "28/28 code.html 外链 Google Fonts「Be Vietnam Pro」"

3. Conclusion strip at the bottom of the screen (full width, single-line height, visually the
   heaviest element after the header):
   - Left: "结论：导出稿自身不自洽，所以必须有裁定规则"
   - Right, in monospace, the five-level priority chain rendered as a left-to-right chain with
     small arrow separators:
     "PRD → 项目规则 §5 长期约束 → 设计系统 → 首页精细版 → exports 通用"
   - Second line of the strip, in blue #006ab4: "冲突时先修文档口径，再动代码"


   4. Evidence index line (12px #61778c, monospace paths):
   "docs/design/设计系统-用户端.md（实现口径 4 条）；docs/frontend/UI复刻经验与执行约定.md §4-3（优先级链）；frontend/user-h5/src/styles/tokens.css"

CONSTRAINTS:
- This slide is ABOUT the color rules, so #ff5a1f and #ae3200 may appear as literal monospace text
  inside the four rules and the conflict chart. Do not use them as decorative UI colors.
- Exactly 4 numbered rules and exactly 6 font-family rows. Do not summarize or extend the list.
- Do not invent additional conflict metrics, charts, or pie charts.
- No drop shadows, no gradients, no pill shapes, 1px hairline borders only.
```

---

### 屏 3｜设计稿与代码导出：一份设计、两份导出

```text
An information-dense presentation screen (slide 3 of 7) for an engineering report on an AI
front-end pipeline. Topic: one design source produces two parallel code exports, and they play
different roles. Same slide system as the previous screens: slide header, hairline borders,
white cards, monospace for code and numbers. Fits one screen height.

PLATFORM: Web, desktop-first, 16:9. Slide 1600x900, content in a 1440x760 container.

PAGE STRUCTURE:

1. Slide header: section number "屏 3" above the title "设计稿与代码导出：一份设计、两份导出".

2. Two-column comparison zone (top half of the content, split 50/50, with a subtle
   "#eef3f8 canvas" behind the two code previews to imply screenshots):

   Left column — "code.html（Stitch）":
      - A large number "28 份" in 46px serif navy at the top.
   - Two lines of monospace description: "单页自包含 HTML + 内嵌主题令牌 + Material Symbols"
     and "28/28 含同名令牌块".
   - A small preview pane (rounded 4px, border hairline) rendering a miniature mobile page:
     status bar strip, a search field, a 2x4 grid of square product thumbnails, and a text line.
     Caption under the pane: "看结构、文案、令牌一致性".

   Right column — "index.jsx + index.module.scss（Figma 侧）":
      - A large number "30 份" in 46px serif navy at the top.
   - Two lines of monospace description: "逐层 div + CSS Modules" and
     "30/30 引用 shared-assets 素材（262 处相对路径）".
   - A small preview pane showing actual code structure: an indented JSX tree of nested divs
     (at least 8 visible levels of indentation) next to an SCSS block with nested selectors.
     Caption under the pane: "看尺寸、间距、圆角、色值，是逐项转写的真源".

3. A single blue #006ab4 connective line spanning both columns, centered, with two small arrows
   pointing down into the columns, labeled: "同一份设计 · 同一页两张「身份证」".

4. Coverage strip (three compact stat blocks in a row, each figure oversized monospace):
   - "27 个完整四件套" | caption "code.html + index.jsx + index.module.scss + 截图"
   - "3 个只有 jsx/scss" | caption "启动页、启动页-精细、订单跟踪"
   - "1 个只有 html/png" | caption "收银台变体；另有 1 个精细版四件套（首页）"
   - A one-line takeaway under the strip, text in blue #006ab4:
     "缺一种导出也有另一种可先开工"

5. "两份导出是同一份设计" proof block (a white card, full width):
   - Left half: two text blocks side by side under headers "code.html 文案" and "index.jsx 文案",
     each showing 3 short product/merchant strings that correspond one-to-one, with small arrows
     connecting matching lines.
   - Right half: "页面级真源：首页精细版四件套" with a 4-row monospace spec table:
       矢量真源 SVG         393×852、503 层、29 个内嵌位图
       图层规格 CSS        仅作尺寸间距参考（不是工程样式）
       @2x 比对基线        screen.png（786×1704）
       README             11 行色值映射表 + 占位清单

   6. Evidence index line (12px #61778c, monospace):
   "docs/design/exports/用户端/**；…/02-首页/02-首页-精细/；docs/frontend/README.md（「实现真源」定位）"

CONSTRAINTS:
- Both miniature previews must read as genuine UI/code artifacts, not abstract shapes:
  the html side is a rendered mobile page, the jsx side is source code with visible indentation.
- Every figure is authoritative: 28, 30, 262, 27, 3, 1, 243, 503, 393×852, 786×1704, 11.
- Do not invent additional page counts, file names or directory listings.
- No drop shadows, no gradients, no glassmorphism, no pill shapes.
```

---

### 屏 4｜PRD 原型说明：把设计稿翻译成「机器可执行规格」

```text
An information-dense presentation screen (slide 4 of 7) for an engineering report on an AI
front-end pipeline. Topic: the PRD prototype table translates designs into machine-executable
specifications. The centerpiece is a real, readable five-column specification table. Same slide
system as previous screens: slide header, hairline borders, monospace for paths and formats,
no shadows. Fits one screen height.

PLATFORM: Web, desktop-first, 16:9. Slide 1600x900, content in a 1440x760 container.

PAGE STRUCTURE:

1. Slide header: section number "屏 4" above the title
   "PRD 原型说明：把设计稿翻译成「机器可执行规格」";
   right-side monospace tag "docs/PRD.md §7.16.1".

2. Specification table (the dominant element, spanning about 70% of the content width, left-aligned).
   This table must be genuinely legible — real text inside cells, not grey placeholder bars.
   Header row (5 columns, exact wording, header fill #e8f2f9, 1px #d9e3eb separators, no vertical rules):
   "页面与区域" | "原型图" | "字段、数据来源与默认值" | "点击与状态变化" | "空态、加载、错误与检查"

   Render exactly 4 data rows, using one fully detailed row plus three compact rows:

   Row 1 (fully detailed, tall row):
   - 页面与区域: "首页-商家卡-商家信息与优惠标签"
   - 原型图: a small square red-outlined thumbnail placeholder with a caption
     "88 张红框逐区标注图之一"
   - 字段、数据来源与默认值: a monospace bullet list —
       "店铺名称：商家店铺信息接口"
       "评分：保留一位小数"
       "月售：整数 + 「月售」"
       "配送费/起送价：金额两位小数"
       "优惠标签：最多展示 2 个，超出折叠"
   - 点击与状态变化: "点击整卡 → 进入商家详情页；点击优惠标签 → 展开全部优惠"
   - 空态、加载、错误与检查: "加载中显示骨架屏；接口失败显示重试；无优惠时不占位"

   Row 2:
   - "订单列表-订单卡" | 缩略图 | "订单号/下单时间 yyyy-MM-dd HH:mm:ss（东八区）；金额两位小数；商品数量非负整数" |
     "点击 → 订单详情" | "空列表显示空态插画 + 去逛逛按钮"

   Row 3:
   - "确认订单-金额明细" | 缩略图 | "基础四行 + 优惠项按实际发生展示；金额两位小数" |
     "优惠变化 → 明细行同步增删" | "重复提交拦截；库存不足提示"

   Row 4:
   - "常见问题-列表" | 缩略图 | "分类与条目来源 FAQ 接口；默认折叠" |
     "点击条目 → 展开答案，同时只展开一条" | "字段缺失时隐藏该条"

3. Right-hand statistics rail (narrow column beside the table, stacked stat blocks,
   each figure in oversized monospace):
   - "72 区行"  caption "27 个页面与弹层组"
   - "一区一行"  caption "不是一屏一行"
   - "8 条统一规则"  caption "§7.16 开头"
   - "P0 15 项检查场景"  caption "首次加载 / 空列表 / 网络失败重试 / 未登录 …"
   - "67 → 72"  caption "9/2 一次补了 3 屏 5 行"
   - "7 行"  caption "首页说明重做为红框逐区"

4. Bottom strip — "规格真的被下游消费" (full width, single line, accent figure inline):
   - "frontend/user-h5 19 个文件 25 处 注释/用例引用「PRD 7.16」"
   - next to it, a quoted one-liner in monospace: "不凭空发明业务规则"
   - right end of the strip: "docs/frontend/用例设计决策记录.md"

CONSTRAINTS:
- The five-column header wording must be reproduced verbatim; do not shorten the column names.
- The specification table must contain real, readable Chinese text. Do not use grey placeholder bars
  inside the table cells — the readability of the spec is the entire point of this screen.
- Row 1 must be visibly the tallest and most detailed row.
- Every figure is authoritative: 72, 27, 8, 15, 67, 7, 19, 25, 88. Do not invent extra rows or counts.
- No drop shadows, no gradients, no pill shapes; 1px hairline borders only.
```

---

### 屏 5｜复刻执行：三段式八步 + 逐值对齐

```text
An information-dense presentation screen (slide 5 of 7) for an engineering report on an AI
front-end replication pipeline. Topic: an eight-step execution process plus a value-by-value
alignment table. Same slide system as previous screens: slide header, hairline borders,
monospace for numbers. Fits one screen height.

PLATFORM: Web, desktop-first, 16:9. Slide 1600x900, content in a 1440x760 container.

PAGE STRUCTURE:

1. Slide header: section number "屏 5" above the title "复刻执行：三段式八步 + 逐值对齐".

2. Process rail (top half) — 8 small numbered step cards laid out in a single row of 4 followed by
   a second row of 4, connected by thin 1px arrows following the reading order:
   1) 读约束与参考优先级
   2) 真源定位 + 建立「页面 ↔ 设计稿」映射
   3) 素材先行（提取/命名/落位/清单）
   4) 静态视觉层逐区转写（先视觉、后逻辑，不混步）
   5) 补行为与数据
   6) 比对（截图 + 多视口 + 几何量测）
   7) 差异回改
   8) 按「最小完成定义」验收
   - Steps 2, 3, 6, 7 must be visually emphasized (blue #006ab4 numeral + 3px gold #c9a365 left rail) while the
     other four stay neutral — the emphasis pattern itself communicates where the effort goes.

3. Alignment table (bottom half, left 65% width) titled "首页样例：逐值对齐（可核到行号）".
   4 columns: "区块" | "设计稿（图层规格 CSS）" | "实现" | "结论"
   Exactly these 6 rows, values in monospace:
   - 定位栏 | height:44px | 44px | 一致
   - 搜索区 / 搜索框 | 52px / 373×36 | 52 / 36 | 一致
   - 分类宫格图标 | 56×56（首行）/ 36×36（其余） | 56 / 36 | 一致
   - 活动区 | 373×116；主卡 197、侧卡 80 | 116 / 197 / 80 | 一致
   - 筛选标签 | 84×23 | 84×23 | 一致
   - 商家卡封面 | 112×186 / 112×113 radius 8 | 同 | 一致
   - The "结论" column cells render as small chips (ice #e8f2f9 fill, blue #006ab4 text, 4px radius) reading "一致".
   - Fix the three columns so that design values and implementation values sit in strict vertical
     alignment per row — the whole claim is that they match line for line.

4. Right column beside the table — "素材先行" (narrow, stacked):
   - A four-step chain in monospace: "503 层 SVG 树" → "提取脚本解析 image→pattern→rect 三级引用链"
     → "29 张内嵌位图" → "24 张在用落位 + 5 张判定不迁移"
   - A compact manifest table, 5 monospace columns: "原 id" | "画布位置" | "布局尺寸" | "像素尺寸" | "用途",
     showing 4 sample rows of image asset names with numeric coordinates.
   - A hard rule callout at the bottom of the column (bordered box):
     "禁止用文字或色块临时代替任何一张图"

5. Gradient transcription block (a full-width card under the table, monospace):
   Title: "渐变按 id 转写"
   Two lines mapping SVG ids to CSS stops, with small color chips at the left of each line:
   - "linear_fill_15_3        #FFFFFF → #f9f9f9，y1 = 224.502"
   - "linear_fill_15_149_1    #ffd6c7 @ 0.37"
   Caption: "在实现里逐 stop 对齐"

CONSTRAINTS:
- Exactly 8 process steps and exactly 6 alignment rows. Do not add, drop, merge or reorder rows.
- The 6 alignment rows must all conclude "一致" — this table is evidence of convergence.
- Monospace everywhere numbers or CSS appear.
- No drop shadows, no gradients (except the two tiny literal color chips described above),
  no pill shapes; 1px hairline borders only.
```

---

### 屏 6｜保真度验证：分区指标，而不是一个「像不像」

```text
An information-dense presentation screen (slide 6 of 7) for an engineering report on an AI
front-end pipeline. Topic: fidelity is proven with partitioned metrics and reproducible gates,
not with a single "does it look similar" judgement. This is the most information-dense screen of
the deck — three stacked horizontal bands. Same slide system as previous screens: slide header,
hairline borders, monospace for all numbers. Fits one screen height, no vertical scrolling.

PLATFORM: Web, desktop-first, 16:9. Slide 1600x900, content in a 1440x760 container.

PAGE STRUCTURE:

1. Slide header: section number "屏 6" above the title
   "保真度验证：分区指标，而不是一个「像不像」".
   Right side, an inline metric chip row in monospace: "结构 23/23" · "尺寸 78.0%" ·
   "色值 96.1%" · "素材 24/24".

2. Band A — "结构门禁（可复跑）" (short band, ~12% of content height):
   - One oversized figure "23/23" on the left, in blue #006ab4 serif 700.
   - Right of it, one line defining the rule in monospace:
     "满宽 = 壳宽 ∧ border-radius = 0 ∧ 无 box-shadow"
   - Below, a horizontal wrap of 8 small tag chips naming the covered block classes:
     ".co-card×4" ".ol-card×10" ".od-card×3" ".mn-profile" ".mn-menu" ".al-card×2" ".ae-card" ".store-tabs"
   - A short quoted line at the right end: "先跑出 23/23 全红，改完 23/23 全绿"

3. Band B — "分区指标（逐项可复算）" (the main band, ~40% of content height):
   A 6-row, 3-column table: "指标" | "值" | "口径". Header fill #e8f2f9, 1px #d9e3eb separators, no vertical rules.
   Values in oversized serif numerals; percentages and ratios in blue #006ab4, plain counts in navy #17324a:
   - 结构命中率 | 100%（23/23） | 满宽 / 无圆角 / 无阴影
   - 尺寸值域命中率 | 78.0%（184/236，10 个视图） | 实现 px 值集合 ∩ 设计稿导出 px 值集合；首页 84.1%（53/63）
   - 色值可溯源率 | 96.1%（73/76，10 个视图） | hex 归一化后命中「导出稿 ∪ tokens.css」
   - 素材 1:1 率 | 24/24 | 清单行 ↔ 落位文件 ↔ git 跟踪
   - 多视口 | 320 / 390 / 430 | 横向溢出、贴底、固定栏、文字裁切（脚本已排）
   - 单测 | 148 + 3 条 E2E | 结课前统一口径

4. Band C — "像素比对：做过、可复跑，但只做取证" (~35% of content height), split into two halves:

   Left half — a pixel diff visualization:
   - Two phase labels above a single wide image area: "设计稿基线 screen.png 786×1704" and
     "实现截图 393×852@2x", with a "尺寸完全一致" tag between them.
   - A wide dark diff panel containing a vertical mobile-page silhouette filled with a noisy
     red/green difference texture (this is a pixel-difference map, not a photo), with a horizontal
     banding overlay dividing it into 6 stacked zones.
   - A monospace figure block under the panel:
       "全图像素差  30.1%"
       "校正 53px 状态栏偏移后  19.1%"
       "最佳整体位移 dx = dy = 0"
   - Caption: "说明布局对齐是准的"

   Right half — a per-band difference bar chart:
   - Title: "分带看"
   - 6 horizontal bars, sorted ascending by value, each labeled at its end in monospace:
       "分类宫格      7.2%"
       "定位栏       11.7%"
       "活动区       12.7%"
       "搜索区       15.0%"
       "筛选标签     20.9%"
       "商家卡（数据驱动区） 33.3%"
   - The last bar must be visually singled out (semantic red fill) with a short annotation beside it:
     "差异来自内容：真实数据 ≠ 设计稿占位内容"
   - Under the chart, a bordered rule callout:
     "像素比对必须掩膜数据区 → 主门禁用几何/色值/结构断言，像素比对只做一次性取证与前后对照"
   - A final one-line monospace footnote in a subtle block:
     "实战：订单列表画布底色按设计稿 .frame 像素取样定为 #eeeeee（此前误用 #f9f9f9，灰缝肉眼不可见）"

CONSTRAINTS:
- All 6 per-band percentages and the 30.1% / 19.1% / 53px / dx=dy=0 figures are authoritative.
  Reproduce them exactly; never average, total or re-derive them.
- The diff panel must clearly read as a pixel-difference map (noisy texture), NOT as a UI screenshot.
- The metrics table must be complete: 6 rows, no summarization, no merged cells.
- Do not add a single combined "similarity score" anywhere on this screen — the absence of such a
  score is the point.
- No drop shadows, no gradients, no pill shapes; 1px hairline borders only.
```

---

### 屏 7｜边界与结论

```text
A calm, low-density closing screen (slide 7 of 7) for an engineering report on an AI front-end
pipeline. Topic: what the evidence proves, and which boundaries still hold in the finished state.
The screen must feel like a conclusion page after six dense ones: more whitespace, fewer elements,
no charts. Same slide system as previous screens: slide header, hairline borders, monospace for
paths. Fits one screen height.

PLATFORM: Web, desktop-first, 16:9. Slide 1600x900, content in a 1440x760 container.

PAGE STRUCTURE:

1. Slide header: section number "屏 7" above the title "边界与结论".

2. Upper block — "能证明" (a 2x2 grid of four white cards, each with a blue #006ab4 serif index
      number, a bold one-line claim, and a small muted #61778c support line):
   ① 每一段都有可校验产物 —— 可当场打开文件
   ② 复刻度可量化、可回归 —— 结构 23/23 + 分区指标
   ③ 偏差能被系统性发现并回改 —— 一次外观批次回改了 12 处通栏被卡片化 + 3 处同类变体，覆盖 7 个视图
   ④ AI 产出由人收口 —— 口径裁定、合并评审、缺陷台账

3. Lower block — "完成态下依然成立的边界" (three full-width rows, visually distinct from the
   "能证明" cards: these use a soft callout treatment with a left accent bar and no index numbers):
   - "像素比对是取证工具，不是 CI 门禁" —— 设计稿基线与数据驱动区域不适配（分带数据已量化），门禁改用结构与几何指标
   - "设计稿只对「有导出的页面」生效" —— 取消订单确认、配送状态、评价图片上传交互属于题面新增内容，按 PRD 规格实现，不宣称复刻
   - "复刻度是「值域命中率 / 可溯源率 / 结构命中率」，不是「像素相似度」" —— 三个数字不能合并成一个「像不像」的说法

4. Conclusion band at the bottom (full width, the visually heaviest element on the screen, a single
   large quote-like line, weight 700):
   "「设计 → 规格 → 实现 → 验证」四段都有产物、有指标、有收口；这套 SOP 是我们交付这批页面的默认工作方式。"

   5. Evidence index line (12px #61778c, monospace):
   "docs/_archive/presentation/2026-09-08-实现与设计稿外观取舍差异排查.md（12+3 处偏差清单）、docs/testing/缺陷跟踪表.md"

CONSTRAINTS:
- This screen must be markedly calmer than slides 2–6: no charts, no tables, no figures wall.
- Exactly 4 proof cards and exactly 3 boundary rows. Keep the wording verbatim.
- Do not soften the three boundaries into positive statements; they are explicitly stated limits.
- No drop shadows, no gradients, no pill shapes; 1px hairline borders only.
```

---

## 4. 备用页提示词（不进 7 屏主线，被追问才展开）

> 用法：**不要**一口气生成 6 张，按追问方向挑一条；每条都可单独作为 `DESKTOP` 新屏生成，视觉系统沿用 §1，版式沿用 §2 的「标题 → 卡片/表格 → 证据索引」骨架。

| #    | 备用内容                    | 一句话提示词骨架（可直接扩写成完整提示词）                                                                                                                                                                                                                                                                                                                                                         |
| ---- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 备 1 | 逐页证据卡                  | "Four equal vertical evidence cards for the pages 首页 / 商家详情 / 确认订单 / 订单列表 on one slide; each card stacks: a 页面名 header, a compact monospace fact list (合计 3101 行、17 个 PRD 区行、47 个逐值对齐点、45 条单测、3 条 E2E、14 条已知偏差 = 9 取舍 + 4 缺口 + 2 口径), and a thin horizontal proportion bar; the four cards must be visually identical in weight."                 |
| 备 2 | 复刻度评分卡（7 维 100 分） | "A single-page scorecard: one large left column with the total '首页示例 ≈ 93 分' in oversized monospace, and a right column with 7 labeled horizontal bars — 结构 20 / 尺寸 20 / 色值 15 / 素材 10 / 交互 20 / 多视口 10 / 状态 5 — each bar showing earned-over-max in monospace; emphasize that this scorecard is an inspection aid, not a gate, with a small text-tertiary note."           |
| 备 3 | 效率口径                    | "One slide with three stacked evidence blocks: a commit-timestamp timeline showing 15 clustered batches as small vertical ticks on a horizontal axis; an oversized monospace figure 'TDD 红→绿间隔中位数 2.1 分钟（n=35）'; and a single 81-minute horizontal span bar labeled '一次外观回改从排查到合入 约 81 分钟（18:16→19:37）'. Add a small text-tertiary caveat line: 效率数字为批次推算." |
| 备 4 | 完整边界清单                | "A dense risk-register style slide: a single 2-column table titled 边界清单 with a left column of boundary statements and a right column of one-line explanations, including rows for '同源校验只证明两套导出同源，不等于与真实 App 逐像素一致', '单页面工时无正式记录，效率数字为批次推算', and '像素比对需人工掩膜、未接入 CI'; alternate row fill#eeeeee; no charts."                           |
| 备 5 | 无设计稿内容的处理方式      | "A three-column decision slide: three cards labeled 取消订单确认页 / 配送状态页 / 评价图片上传交互; each card lists the reason (PRD 已写「需补页面」; 导出只有「添加图片」入口) and the action (按 PRD 规格实现，并在交付说明中标注「非复刻」); a shared bottom band states the single rule: 无导出即按 PRD 规格实现、不宣称复刻."                                                                 |
| 备 6 | 两个易被追问的事实          | "A two-card slide of candid facts: card ① 用户端 Stitch 提示词与 Figma 源链接在仓库内无留档（只有文档口径 + 文件指纹可校验）; card ② 23/23 与 34/34 的原始脚本此前未入库，本次重建后才具备「可复跑」口径. Style these as bordered callouts, not as errors; add a short monospace 证据索引 line beneath each card."                                                                               |

---

## 5. 生成后怎么用（与仓库衔接）

- **产物落位**：Stitch 生成结果导出 HTML/截图后，内容类材料按 AGENTS.md 放 `docs/presentation/`（**入 main**）；`.stitch/` 目录已在 `.gitignore` 中，**不会入库**，需要留档就手动把 HTML 拷到 `docs/presentation/`。
- **样式同源**：生成稿的配色/字体/圆角应与**演示页 `docs/presentation/index.html`** 一致（深蓝 `#063866`、天蓝 `#006ab4`、冰蓝 `#e8f2f9`、金色 `#c9a365` 仅作强调线、正文墨色 `#17324a`、纸底 `#f5f8fb`、描边 `#d9e3eb`、卡片圆角 10px、按钮/标签 6px）。**不要**把用户端移动 H5 的 `tokens.css`（品牌橙 `#ff5a1f`、App 圆角阶梯）当成本页风格。若生成稿出现新的强调色，按「先修文档口径，再动代码」的既有规则处理，不要直接改代码。
- **数字复核**：出图后逐屏核对 §2–§4 里列出的数字与 §附录 对照表；**Stitch 有改写数字的倾向**，凡与大纲不一致的一律改回大纲口径。
- **不要在提示词里加**：讲稿口播词、时长秒数（`建议 30–35 秒`）、`裁剪优先级` 这类**给作者看的工作备注**——它们属于大纲元信息，不属于屏幕内容。

---

## 附录｜数字速查（与大纲逐条对照，出图后逐项打勾）

| 屏   | 关键数字                                                                                                                                                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 屏 1 | 32 个导出目录 / 88 张红框图 / 120 个文件（html 28、jsx 30、scss 30、截图 29）/ 素材 243 / 72 区行 / 27 个页面与弹层组 / 11 视图 13 路由 / 单测 148 / 23/23 / 78.0% / 96.1% / tokens.css 58 行                          |
| 屏 2 | tokens.css 58 行 28 变量 /`primary #ae3200` / `#ff5a1f` / 30/30 与 17/30（25 处）/ font-family 6 种取值（254 / 47 / 28 / 26 / 1 / 1）/ 28/28 code.html                                                             |
| 屏 3 | 28 份 code.html / 30 份 jsx+scss / 262 处相对路径 / 27 个完整四件套 / 3 个仅 jsx+scss / 1 个仅 html+png / 503 层 / 29 张内嵌位图 / 393×852 / 786×1704 / README 11 行                                                 |
| 屏 4 | 72 区行 / 27 组 / 五列 / 8 条统一规则 / P0 15 项场景 / 67 → 72 / 首页 7 行 / 19 个文件 25 处引用                                                                                                                      |
| 屏 5 | 八步 / 44px / 52px / 373×36 / 56×56 与 36×36 / 373×116 / 197 与 80 / 84×23 / 112×186、112×113 radius 8 / 503 层 / 29 张 → 24 在用 + 5 不迁移 /`linear_fill_15_3` y1=224.502 / `linear_fill_15_149_1` @0.37 |
| 屏 6 | 23/23（8 类区块）/ 100% / 78.0%（184/236，首页 84.1% = 53/63）/ 96.1%（73/76）/ 24/24 / 320、390、430 / 148 + 3 E2E / 30.1% / 19.1% / 53px / dx=dy=0 / 7.2、11.7、12.7、15.0、20.9、33.3 /`#eeeeee`、`#f9f9f9`     |
| 屏 7 | 12 + 3 处偏差 / 7 个视图 / 主线 3 条边界                                                                                                                                                                               |
| 备用 | 3101 行 / 17 区行 / 47 个逐值对齐点 / 45 单测 / 3 E2E / 14 条偏差（9+4+2）/ 7 维 100 分 · 首页 ≈93 分 / 15 个批次 / 2.1 分钟（n=35）/ 81 分钟（18:16→19:37）                                                        |

---

## 参考（官方文档）

- Stitch Prompt Guide（官方论坛，Effective Prompting）：[https://discuss.ai.google.dev/t/stitch-prompt-guide/83844](https://discuss.ai.google.dev/t/stitch-prompt-guide/83844)
- Google Labs `stitch-skills` · `generate-design`（提示词增强管线、`generate_screen_from_text` 入参、`deviceType`）：[https://github.com/google-labs-code/stitch-skills/blob/main/plugins/stitch-design/skills/generate-design/SKILL.md](https://github.com/google-labs-code/stitch-skills/blob/main/plugins/stitch-design/skills/generate-design/SKILL.md)
- Google Labs `stitch-skills` · `manage-design-system`（`DESIGN.md` → `create_design_system_from_design_md` 项目级设计系统）：[https://github.com/google-labs-code/stitch-skills/blob/main/plugins/stitch-design/skills/manage-design-system/SKILL.md](https://github.com/google-labs-code/stitch-skills/blob/main/plugins/stitch-design/skills/manage-design-system/SKILL.md)
- 提示词关键词与形容词词表：[https://github.com/google-labs-code/stitch-skills/blob/main/plugins/stitch-design/skills/generate-design/references/prompt-keywords.md](https://github.com/google-labs-code/stitch-skills/blob/main/plugins/stitch-design/skills/generate-design/references/prompt-keywords.md)
- 官方增强提示词范例：[https://github.com/google-labs-code/stitch-skills/blob/main/plugins/stitch-design/skills/generate-design/examples/enhanced-prompt.md](https://github.com/google-labs-code/stitch-skills/blob/main/plugins/stitch-design/skills/generate-design/examples/enhanced-prompt.md)
- 本仓库设计系统真源：`docs/design/设计系统-用户端.md`、`frontend/user-h5/src/styles/tokens.css`
- 本文件的大纲来源：`docs/_archive/presentation/2026-09-10-结课汇报-AI前端SOP-演示页面大纲.md`
