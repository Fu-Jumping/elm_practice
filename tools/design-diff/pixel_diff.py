#!/usr/bin/env python3
"""设计稿像素比对（TODO-USER-024，§4.2）——一次性取证工具，**不作为 CI 门禁**。

为什么不进门禁（§4.2 口径 2、3）：
  1. 商家卡等区域渲染**真实数据**，与设计稿占位内容天然不同（实测该区域差异 33.3%），
     不掩膜会把「内容不同」误报成「复刻不准」；
  2. `screen.png` 共 29 张、15 种尺寸，多数是 390 宽或被高度裁切的基线，
     只有首页/启动页精细版是 786×1704（393×852@2x）可直接整图对齐。

三条必须遵守的口径：
  ① 53px 状态栏偏移校正：设计稿画布含 `9:41` 状态栏、H5 实现不含
     （见 docs/design/exports/用户端/02-首页/02-首页-精细/README.md §2.2），
     故比对前把设计稿 y 起点下移 53px（@2x 为 106px）；
  ② 数据驱动区域必须掩膜：`--mask-band 商家卡` 把该横带排除后再算整体指标；
  ③ 整图百分比只对「画布 393 的精细版」有意义，其余页面只做分带指标。

运行示例：
  python tools/design-diff/pixel_diff.py \
      --design docs/design/exports/用户端/02-首页/02-首页-精细/screen.png \
      --impl frontend/user-h5/test-results/design-diff/impl-home.png \
      --bands frontend/user-h5/test-results/design-diff/bands.json \
      --out frontend/user-h5/test-results/design-diff
"""
from __future__ import annotations

import argparse
import json
import os
from typing import Any

import numpy as np
from PIL import Image

# 超阈判定：任一分量通道差 > 该值即计为「差异像素」（@8bit）
DEFAULT_THRESHOLD = 32
# 对齐搜索范围（@2x 像素）
ALIGN_RANGE = 12


def load_pair(design_path: str, impl_path: str) -> tuple[np.ndarray, np.ndarray]:
    design = Image.open(design_path).convert("RGB")
    impl = Image.open(impl_path).convert("RGB")
    w = min(design.width, impl.width)
    h = min(design.height, impl.height)
    if (w, h) != (design.width, design.height) or (w, h) != (impl.width, impl.height):
        print(f"[提示] 尺寸不一致，按较小者对齐：设计 {design.size} / 实现 {impl.size} → {w}x{h}")
    d = np.asarray(design.crop((0, 0, w, h)), dtype=np.int16)
    i = np.asarray(impl.crop((0, 0, w, h)), dtype=np.int16)
    return d, i


def diff_metrics(a: np.ndarray, b: np.ndarray, threshold: int) -> dict[str, Any]:
    """两张同尺寸图的重叠区域指标。

    max_delta：逐像素三通道最大绝对差；diff_ratio：超阈像素占比；mad：平均绝对差。
    """
    h = min(a.shape[0], b.shape[0])
    w = min(a.shape[1], b.shape[1])
    if h == 0 or w == 0:
        return {"diff_ratio": None, "mad": None, "pixels": 0}
    aa = a[:h, :w].astype(np.int16)
    bb = b[:h, :w].astype(np.int16)
    max_delta = np.abs(aa - bb).max(axis=2)
    return {
        "diff_ratio": round(float((max_delta > threshold).mean()) * 100, 2),
        "mad": round(float(np.abs(aa - bb).mean()), 2),
        "pixels": int(h * w),
        "size": f"{w}x{h}",
    }


def band_metrics(
    design: np.ndarray,
    impl: np.ndarray,
    bands: list[dict[str, Any]],
    threshold: int,
    status_offset: int,
) -> list[dict[str, Any]]:
    """分带指标：按实现页面的实测 y 区间（@1x）切带，设计稿加偏移后同区间比较。"""
    out = []
    for band in bands:
        if not band.get("found"):
            out.append({"label": band["label"], "found": False})
            continue
        top2x = int(round(band["top"] * 2)) + status_offset
        bottom2x = int(round(band["bottom"] * 2)) + status_offset
        if bottom2x <= top2x:
            out.append({"label": band["label"], "found": False, "reason": "空区间"})
            continue
        d_band = design[top2x:bottom2x]
        i_band = impl[top2x - status_offset : bottom2x - status_offset]
        m = diff_metrics(d_band, i_band, threshold)
        out.append({"label": band["label"], "found": True, "y_1x": [band["top"], band["bottom"]], **m})
    return out


def mask_band_rows(shape: tuple[int, int], bands: list[dict[str, Any]], label: str, status_offset: int) -> np.ndarray:
    """构造行掩膜：True = 参与比对。把指定带（如商家卡）整行排除。"""
    h = shape[0]
    keep = np.ones(h, dtype=bool)
    for band in bands:
        if band.get("label") != label or not band.get("found"):
            continue
        top2x = int(round(band["top"] * 2))
        bottom2x = int(round(band["bottom"] * 2))
        keep[max(0, top2x) : max(0, bottom2x)] = False
    return keep


def apply_row_mask(a: np.ndarray, b: np.ndarray, keep: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    h = min(a.shape[0], b.shape[0], keep.shape[0])
    return a[:h][keep[:h]], b[:h][keep[:h]]


def best_shift(design: np.ndarray, impl: np.ndarray, threshold: int, rng: int) -> dict[str, Any]:
    """最优整体位移搜索：在 ±rng 内找使平均绝对差最小的 (dx, dy)。"""
    best = {"dx": 0, "dy": 0, "mad": None, "diff_ratio": None}
    h = min(design.shape[0], impl.shape[0])
    w = min(design.shape[1], impl.shape[1])
    for dy in range(-rng, rng + 1):
        for dx in range(-rng, rng + 1):
            ys, ye = max(0, dy), min(h, h + dy)
            xs, xe = max(0, dx), min(w, w + dx)
            if ye - ys < 100 or xe - xs < 100:
                continue
            a = design[ys:ye, xs:xe].astype(np.int16)
            b = impl[ys - dy : ye - dy, xs - dx : xe - dx].astype(np.int16)
            mad = float(np.abs(a - b).mean())
            if best["mad"] is None or mad < best["mad"]:
                ratio = float((np.abs(a - b).max(axis=2) > threshold).mean()) * 100
                best = {"dx": dx, "dy": dy, "mad": round(mad, 2), "diff_ratio": round(ratio, 2)}
    return best


def write_diff_image(design: np.ndarray, impl: np.ndarray, threshold: int, out_path: str) -> None:
    """差异可视化：底图为实现灰度，超阈像素标红。"""
    h = min(design.shape[0], impl.shape[0])
    w = min(design.shape[1], impl.shape[1])
    a = design[:h, :w].astype(np.int16)
    b = impl[:h, :w].astype(np.int16)
    mask = np.abs(a - b).max(axis=2) > threshold
    gray = np.asarray(Image.fromarray(b.astype(np.uint8)).convert("L"))
    rgb = np.stack([gray, gray, gray], axis=2)
    rgb[mask] = [255, 0, 0]
    Image.fromarray(rgb.astype(np.uint8)).save(out_path)


def main() -> None:
    ap = argparse.ArgumentParser(description="设计稿像素比对（取证用，非门禁）")
    ap.add_argument("--design", required=True, help="设计稿基准图（如 02-首页-精细/screen.png）")
    ap.add_argument("--impl", required=True, help="实现截图（scripts/shot-design-compare.cjs 产出）")
    ap.add_argument("--bands", help="分带 JSON（bands.json，可选）")
    ap.add_argument("--out", required=True, help="输出目录")
    ap.add_argument("--threshold", type=int, default=DEFAULT_THRESHOLD, help="超阈阈值（0-255，默认 32）")
    ap.add_argument("--status-bar-px", type=int, default=53, help="设计稿状态栏偏移（@1x，默认 53）")
    ap.add_argument("--mask-band", default="商家卡", help="需要掩膜的数据驱动带名（默认 商家卡）")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    status2x = args.status_bar_px * 2

    design, impl = load_pair(args.design, args.impl)

    report: dict[str, Any] = {
        "design": args.design,
        "impl": args.impl,
        "threshold": args.threshold,
        "status_bar_offset_1x": args.status_bar_px,
        "note": "本工具用于取证，不作 CI 门禁；主门禁是几何/色值/结构断言（见 e2e/design-fidelity.spec.ts）",
    }

    # ① 原始整图（设计稿含状态栏）
    report["raw"] = diff_metrics(design, impl, args.threshold)

    # ② 53px 状态栏偏移校正后（设计稿去掉顶部 106px，与实现同起点比较）
    d_corr = design[status2x:]
    report["corrected"] = diff_metrics(d_corr, impl, args.threshold)

    # ③ 最优整体位移
    report["best_shift"] = best_shift(d_corr, impl, args.threshold, ALIGN_RANGE)

    # ④ 分带指标（含掩膜前后各一份整体值）
    bands: list[dict[str, Any]] = []
    if args.bands and os.path.exists(args.bands):
        with open(args.bands, encoding="utf-8") as f:
            bands = json.load(f).get("bands", [])
        report["bands"] = band_metrics(d_corr, impl, bands, args.threshold, status2x)
    else:
        report["bands"] = []
        print("[提示] 未提供 bands.json，跳过分带指标")

    if bands:
        keep_impl = mask_band_rows(impl.shape, bands, args.mask_band, 0)
        keep_design = np.ones(d_corr.shape[0], dtype=bool)
        keep_design[: min(keep_impl.shape[0], d_corr.shape[0])] = keep_impl[: d_corr.shape[0]]
        d_masked, i_masked = apply_row_mask(d_corr, impl, keep_design * keep_impl[: d_corr.shape[0]])
        report["masked"] = {
            "masked_band": args.mask_band,
            **diff_metrics(d_masked, i_masked, args.threshold),
        }

    write_diff_image(d_corr, impl, args.threshold, os.path.join(args.out, "diff.png"))
    report_path = os.path.join(args.out, "report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    # 控制台摘要
    print(f"[整图 · 原始]        超阈 {report['raw']['diff_ratio']}%  平均绝对差 {report['raw']['mad']}")
    print(
        f"[整图 · 53px 校正后] 超阈 {report['corrected']['diff_ratio']}%  平均绝对差 {report['corrected']['mad']}"
    )
    print(
        f"[最优位移]           dx={report['best_shift']['dx']} dy={report['best_shift']['dy']}"
        f"  → 超阈 {report['best_shift']['diff_ratio']}%"
    )
    for b in report.get("bands", []):
        if b.get("found"):
            print(f"  · {b['label']}: 超阈 {b['diff_ratio']}%")
    if "masked" in report:
        print(f"[掩膜「{args.mask_band}」后] 超阈 {report['masked']['diff_ratio']}%")
    print(f"[产物] {report_path} / {os.path.join(args.out, 'diff.png')}")


if __name__ == "__main__":
    main()
