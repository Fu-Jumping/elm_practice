"""检查演示目录的店铺、分类、商品和图片是否仍然一一对应。

只读公共接口，不需要账号；适合发布后和现场演示前执行：
    python deploy/catalog-check.py --base-url http://127.0.0.1:4100/user/api/v1
"""
from __future__ import annotations

import argparse
import json
import urllib.request


EXPECTED = {
    "m001": {
        "categories": {"c201": "招牌", "c202": "配菜"},
        "products": {
            "p201": ("c201", "家常豆腐", "product-m001-04.jpg"),
            "p202": ("c201", "鱼香肉丝", "product-m001-05.jpg"),
            "p203": ("c202", "米饭", "product-m001-06.jpg"),
        },
    },
    "m002": {
        "categories": {"c101": "主食", "c102": "小食", "c103": "饮品"},
        "products": {
            "p101": ("c101", "香辣鸡腿堡", "product-m002-01.jpg"),
            "p102": ("c101", "劲脆鸡腿堡", "product-m002-02.jpg"),
            "p103": ("c101", "老北京鸡肉卷", "product-m002-03.jpg"),
            "p104": ("c102", "黄金鸡块（5块）", "product-m002-04.jpg"),
            "p105": ("c103", "九珍果汁", "product-m002-05.jpg"),
            "p106": ("c101", "热辣香骨鸡（5块）", "product-m002-06.jpg"),
        },
    },
    "m003": {
        "categories": {"c301": "招牌", "c302": "配菜"},
        "products": {"p204": ("c301", "巨无霸", "product-m003-01.jpg"), "p205": ("c302", "薯条（大）", "product-m003-03.jpg")},
    },
    "m004": {
        "categories": {"c401": "招牌", "c402": "配菜"},
        "products": {"p206": ("c401", "羊肉串（10串）", "product-m004-01.jpg"), "p207": ("c402", "烤茄子", "product-m004-02.jpg")},
    },
    "m005": {
        "categories": {"c501": "招牌", "c502": "配菜"},
        "products": {"p208": ("c501", "精品肥牛", "product-m005-01.jpg"), "p209": ("c502", "手切鲜羊肉", "product-m005-02.jpg")},
    },
}


def get_json(url: str) -> dict | list:
    with urllib.request.urlopen(url, timeout=8) as response:
        return json.load(response)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:4100/user/api/v1")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")
    errors: list[str] = []
    for store_id, expected in EXPECTED.items():
        cats = get_json(f"{base}/stores/{store_id}/categories")["data"]
        cat_map = {row["categoryId"]: row["name"] for row in cats}
        if cat_map != expected["categories"]:
            errors.append(f"{store_id} categories: {cat_map!r}")

        products = get_json(f"{base}/stores/{store_id}/products")["data"]
        product_map = {
            row["productId"]: (row["categoryId"], row["name"], row.get("image", "").rsplit("/", 1)[-1])
            for row in products
        }
        if product_map != expected["products"]:
            errors.append(f"{store_id} products: {product_map!r}")
        for _, _, filename in expected["products"].values():
            image_url = f"{base.rsplit('/api/v1', 1)[0]}/demo-images/{filename}"
            try:
                with urllib.request.urlopen(image_url, timeout=8) as response:
                    if response.status != 200:
                        errors.append(f"image {filename}: HTTP {response.status}")
            except Exception as exc:  # pragma: no cover - network diagnostic
                errors.append(f"image {filename}: {exc}")

    if errors:
        print("CATALOG_CHECK_FAIL")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    print(f"CATALOG_CHECK_OK stores={len(EXPECTED)} products={sum(len(v['products']) for v in EXPECTED.values())}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
