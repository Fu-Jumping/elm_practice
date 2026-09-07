/**
 * 演示图片解析（2026-09-07，素材：组长提供的 demo-images 素材包，清单见仓库根"图片清单.md"）
 * URL 口径（三方统一）：/demo-images/<文件名>，不带域名与端口
 * 兜底链：接口 image 非空 → 接口值；为空 → 演示映射（对照表见清单）；无映射 → 占位图/空串
 * 说明：演示映射仅服务于固定演示数据（课程口径）；后端 seed 填写 image 后接口值自动优先
 */

const DEMO_DIR = '/demo-images'

/** 商品图演示映射（mock 商品号 → 素材文件，对照"图片清单.md"商品表） */
const DEMO_PRODUCT_IMAGES: Record<string, string> = {
  p101: `${DEMO_DIR}/product-m002-01.jpg`,
  p102: `${DEMO_DIR}/product-m002-02.jpg`,
  p103: `${DEMO_DIR}/product-m002-03.jpg`,
  p104: `${DEMO_DIR}/product-m002-04.jpg`,
  p105: `${DEMO_DIR}/product-m002-05.jpg`,
  p106: `${DEMO_DIR}/product-m002-06.jpg`,
  p201: `${DEMO_DIR}/product-m001-04.jpg`,
  p202: `${DEMO_DIR}/product-m001-05.jpg`,
  p203: `${DEMO_DIR}/product-m001-06.jpg`,
  p204: `${DEMO_DIR}/product-m003-01.jpg`,
  p205: `${DEMO_DIR}/product-m003-03.jpg`,
  p206: `${DEMO_DIR}/product-m004-01.jpg`,
  p207: `${DEMO_DIR}/product-m004-02.jpg`,
  p208: `${DEMO_DIR}/product-m005-01.jpg`,
  p209: `${DEMO_DIR}/product-m005-02.jpg`,
}

/** 店招演示映射（stores.image） */
const DEMO_STORE_IMAGES: Record<string, string> = {
  m001: `${DEMO_DIR}/store-m001.jpg`,
  m002: `${DEMO_DIR}/store-m002.jpg`,
  m003: `${DEMO_DIR}/store-m003.jpg`,
  m004: `${DEMO_DIR}/store-m004.jpg`,
  m005: `${DEMO_DIR}/store-m005.jpg`,
}

/** 通用商品占位图（首页素材，与设计稿缩略图同款） */
export const PRODUCT_IMAGE_PLACEHOLDER = '/design-assets/首页-精细/product-thumb-1.png'

/** 商品图片解析：接口值优先 → 演示映射 → 占位图 */
export function productImageSrc(productId: string, image: string | undefined): string {
  if (image) return image
  return DEMO_PRODUCT_IMAGES[productId] ?? PRODUCT_IMAGE_PLACEHOLDER
}

/** 店招图片解析：接口值优先 → 演示映射 → 空串（横幅回退渐变） */
export function storeImageSrc(storeId: string, image: string | undefined): string {
  if (image) return image
  return DEMO_STORE_IMAGES[storeId] ?? ''
}
