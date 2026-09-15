/**
 * 定位文案（用户端共用口径，PRD 7.16.1 首页-定位与频道栏 / 搜索结果页-搜索头部 /
 * 分类商家列表页-顶部栏）：
 * - 已登录且有地址：取默认地址 region（缺省 detail），地址字段不允许由前端拼接；
 * - 已登录但无地址：显示占位「选择收货地址」，不得用演示地址冒充真实地址；
 * - 未登录 / 读取失败：回退课程演示地址「天津大学北洋园校区」并标记为演示数据。
 *
 * 2026-09-13（TODO-USER-005）：常量由 HomeView 的同值局部常量提取而来，
 * 供搜索结果页复用；HomeView 暂未改为引用本文件（避免在本批改动首页引入回归）。
 * 2026-09-15（负责人口径变更·方案 C，三态）：升级为三态解析器 + 占位常量，旧「HomeView
 * 暂未引用」的重复定义已消除，三页（HomeView / SearchResultView / CategoryStoreListView）
 * 统一走本文件，成为定位文案唯一出口。
 */
export const DEMO_LOCATION = '天津大学北洋园校区'

/** 已登录但没有任何收货地址时的占位文案（PRD 7.16.1：不得显示演示地址冒充真实地址） */
export const ADDRESS_PLACEHOLDER = '选择收货地址'

/** 定位栏状态：文案 + 是否为演示数据标记 */
export interface LocationState {
  text: string
  /** true = 当前展示的是课程演示地址（未登录或读取失败），UI 需标记为演示数据 */
  isDemoLocation: boolean
}

/** 解析所需的最小地址形状（真实 Address 的超集，便于单测构造） */
interface AddressLike {
  isDefault?: boolean
  region?: string
  detail?: string
}

/**
 * 定位三态解析（纯函数）：
 * - 未登录 → 演示地址 + 演示标记；
 * - 已登录有可用地址 → 默认地址 region（缺省 detail），不标记；
 * - 已登录无地址（或无可用文案）→ 占位「选择收货地址」，不标记。
 */
export function resolveLocationState(input: {
  isLoggedIn: boolean
  addresses?: readonly AddressLike[] | null
}): LocationState {
  if (!input.isLoggedIn) return { text: DEMO_LOCATION, isDemoLocation: true }
  const list = input.addresses ?? []
  const def = list.find((item) => item.isDefault) ?? list[0]
  // PRD：地址字段不允许由前端随意拼接——优先 region，缺省 detail
  const text = def?.region || def?.detail
  if (text) return { text, isDemoLocation: false }
  return { text: ADDRESS_PLACEHOLDER, isDemoLocation: false }
}

/** 读取地址失败时的状态（PRD 检查列：保留默认演示地址并标记为演示数据） */
export const LOCATION_LOAD_FAILED: LocationState = {
  text: DEMO_LOCATION,
  isDemoLocation: true,
}
