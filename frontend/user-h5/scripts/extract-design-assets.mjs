/**
 * 设计稿素材提取工具 v3（exact 复刻启动前准备，UI复刻经验与执行约定 §3.1/§4.2）
 * 用法：node scripts/extract-design-assets.mjs <svg路径> <输出目录>
 *
 * 本导出稿的真实结构（v1/v2 踩坑后确认）：
 *   <defs>
 *     <image id="imageN" width=W height=H xlink:href="data:image/png;base64,..."/>  ← 位图原件（W/H=真实像素）
 *     <pattern id="pattern_fill_x" patternContentUnits="objectBoundingBox" width=1 height=1>
 *       <use xlink:href="#imageN" transform="...scale..."/>                          ← 拉伸到 1×1
 *     </pattern>
 *   </defs>
 *   <rect x y width height fill="url(#pattern_fill_x)"/>                            ← 真正的摆放位置/尺寸
 * 因此：image(defs) → pattern(use 引用) → rect(fill 引用) 三级关联后，取 rect 的几何信息。
 * 清单输出 <输出目录>/README.md；不修改任何源文件。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const [, , svgPath, outDirArg] = process.argv
if (!svgPath || !outDirArg) {
  console.error('用法：node scripts/extract-design-assets.mjs <svg路径> <输出目录>')
  process.exit(1)
}
const outDir = path.resolve(outDirArg)
fs.mkdirSync(outDir, { recursive: true })

const svg = fs.readFileSync(svgPath, 'utf8')

function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(12) !== 0x49484452) return null
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

/** 引用处邻近中文文本（窗口内出现过的 tspan 短语，去重取末尾几个） */
function nearbyText(idx) {
  const window = svg.slice(Math.max(0, idx - 2500), idx).replace(/base64,[A-Za-z0-9+/=]+/g, '')
  const hits = [...window.matchAll(/>([^<>]{1,14})<\/tspan>/g)].map((m) => m[1].trim())
  return [...new Set(hits)].slice(-4)
}

// ① image 原件：id → {w, h, buf}
const images = new Map()
const imageRe = /<image\b[^>]*?id="([^"]+)"[^>]*?width="([\d.]+)"[^>]*?height="([\d.]+)"[^>]*?xlink:href="data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)"/g
let im
while ((im = imageRe.exec(svg))) {
  images.set(im[1], { w: Number(im[2]), h: Number(im[3]), ext: im[4] === 'jpeg' ? 'jpg' : 'png', buf: Buffer.from(im[5], 'base64') })
}

// ② pattern → 引用的 image id（use xlink:href="#imageN"）
const patternToImage = new Map()
const patternRe = /<pattern\b[^>]*?id="([^"]+)"[^>]*>([\s\S]*?)<\/pattern>/g
let pt
while ((pt = patternRe.exec(svg))) {
  const target = /xlink:href="#([^"]+)"/.exec(pt[2])?.[1]
  if (target && images.has(target)) patternToImage.set(pt[1], target)
}

// ③ 渲染树摆放：rect/path fill="url(#pattern)"
const placements = new Map() // imageId -> [{x,y,w,h,tag,hint}]
const refRe = /<(rect|path)\b([^>]*)fill="url\(#([^)]+)\)"[^>]*?\/?>/g
let rm
while ((rm = refRe.exec(svg))) {
  const [, tag, attrs, pid] = rm
  const imageId = patternToImage.get(pid)
  if (!imageId) continue
  const num = (k) => Number(new RegExp(`${k}="([\\d.]+)"`).exec(attrs)?.[1] ?? 0)
  const list = placements.get(imageId) ?? []
  list.push({ x: num('x'), y: num('y'), w: num('width'), h: num('height'), tag, hint: nearbyText(rm.index) })
  placements.set(imageId, list)
}

// ④ 落盘（内容去重）+ 清单
const byHash = new Map()
const records = []
const ordered = [...images.entries()].sort((a, b) => {
  const ay = placements.get(a[0])?.[0]?.y ?? 9999
  const by = placements.get(b[0])?.[0]?.y ?? 9999
  return ay - by
})
let seq = 0
for (const [imageId, img] of ordered) {
  const pixel = pngSize(img.buf)
  const hash = crypto.createHash('sha1').update(img.buf).digest('hex').slice(0, 8)
  const dupOf = byHash.get(hash) ?? null
  if (!dupOf) byHash.set(hash, imageId)
  const id = `image${String(seq).padStart(2, '0')}`
  seq += 1
  let file = ''
  if (!dupOf) {
    file = `${id}.${img.ext}`
    fs.writeFileSync(path.join(outDir, file), img.buf)
  }
  records.push({ id, imageId, file, dupOf, pixel, bytes: img.buf.length, native: img, places: placements.get(imageId) ?? [] })
}

const fmtPlaces = (r) =>
  r.places.length ? r.places.map((p) => `(${p.x},${p.y}) ${p.w}×${p.h} <${p.tag}>`).join('  ') : '未找到摆放引用'
const fmtHint = (r) =>
  [...new Set(r.places.flatMap((p) => p.hint))].filter(Boolean).slice(0, 3).join(' / ') || '-'

const md = `# 首页-精细 素材清单（自动提取 v3）

> 提取自 \`docs/design/exports/用户端/02-首页/02-首页-精细/首页-精细-项目化.svg\`：位图原件 ${images.size} 张，去重落盘 ${records.filter((r) => !r.dupOf).length} 个文件。
> 摆放位置/尺寸来自引用 pattern 的 rect/path（393×852 画布坐标）；"邻近文本"为自动捕获线索，**语义命名需人工核对**。

| 文件 | 原件 id | 摆放位置与尺寸 | 原件像素 | 邻近文本线索 | 备注 |
| --- | --- | --- | --- | --- | --- |
${records
  .map(
    (r) =>
      `| ${r.file || '-'} | ${r.imageId} | ${fmtPlaces(r)} | ${r.pixel ? `${r.pixel.w}×${r.pixel.h}` : '?'} | ${fmtHint(r)} |${r.dupOf ? ` 与 ${r.dupOf} 同图 |` : ' |'}`,
  )
  .join('\n')}
`
fs.writeFileSync(path.join(outDir, 'README.md'), md)

console.log(`位图原件 ${images.size} 张，pattern ${patternToImage.size} 个有位图引用，去重落盘 ${records.filter((r) => !r.dupOf).length} 个 → ${outDir}`)
for (const r of records) {
  console.log(
    `${r.file || '-'}  ${fmtPlaces(r)}  native=${r.native.w}×${r.native.h}  ${r.bytes}B  hint=[${fmtHint(r)}]${r.dupOf ? `  与 ${r.dupOf} 同图` : ''}`,
  )
}
