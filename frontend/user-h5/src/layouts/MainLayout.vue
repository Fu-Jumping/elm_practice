<script setup lang="ts">
import { nextTick, onUnmounted, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { resolveNavKind, type NavKind } from '@/router/navHistory'
import TabBar from '@/components/TabBar.vue'

const route = useRoute()
const router = useRouter()
const mainEl = ref<HTMLElement | null>(null)

/**
 * 内容区滚动管线（2026-09-08 负责人需求：返回停留原浏览位置）
 * app-main 为独立滚动容器，window 级 scrollBehavior 不生效（9/7 T65/T66 需求的真实现落点）：
 * - scroll 持续记录各路由 fullPath 的停留位置（模块级表，跨布局卸载保留）
 * - 路由切换后按 navHistory 判定：back/forward → 恢复该路由位置；push/replace → 置顶
 * 配合 KeepAlive(HomeView)：返回首页不重挂载，内容高度完整，恢复瞬时无骨架屏竞态
 */
const savedScrolls = new Map<string, number>()

/** 恢复窗口期内不记录滚动：恢复赋值被临时高度钳制时会回读出错误值，写回会污染下次恢复 */
let restoreLockUntil = 0
/** beforeEach 快照的目标恢复位置（换页瞬间浏览器内部滚动不再可信，恢复以快照为准） */
let pendingRestore: number | null = null

function onContentScroll(): void {
  if (Date.now() < restoreLockUntil) return
  if (mainEl.value) savedScrolls.set(route.fullPath, mainEl.value.scrollTop)
}

function readHistoryPosition(): number | null {
  const position = window.history.state?.position
  return typeof position === 'number' ? position : null
}

/** 停留/最大条目号：布局挂载时从当前条目起算；条目号缺失（memory history 等）一律按 replace 置顶 */
let settledPos = readHistoryPosition()
let maxSeenPos = settledPos ?? -1

const removeBeforeEach = router.beforeEach((to) => {
  // 换页瞬间（popstate→DOM 替换之间）浏览器可能自行调整内容区滚动并触发 scroll 事件，
  // 该回读值不代表用户停留位置——beforeEach 先快照目标并提前锁记录，锁至恢复窗口结束
  pendingRestore = savedScrolls.get(to.fullPath) ?? null
  restoreLockUntil = Date.now() + 600
})

const removeAfterEach = router.afterEach(async (to) => {
  await nextTick()
  // 等两帧再定位：KeepAlive 插回的页面首帧高度未定型（布局/图片未完成），
  // 立即恢复会被浏览器按临时高度钳制（取证：t=8ms h=931 → t=42ms 才到 1614）
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  )
  const next = readHistoryPosition()
  const kind: NavKind =
    next == null || settledPos == null ? 'replace' : resolveNavKind(settledPos, maxSeenPos, next)
  settledPos = next
  if (next != null && next > maxSeenPos) maxSeenPos = next

  const target = mainEl.value
  if (!target) return
  const restore = pendingRestore
  pendingRestore = null
  if ((kind === 'back' || kind === 'forward') && restore != null) {
    applyScroll(target, restore)
    // KeepAlive 插回的页面内容高度会分帧长回（取证 844→…→1614），单次赋值会被临时高度
    // 钳制（传 842 实停 171）：在 120/360ms 补两次赋值，高度定型后自然落位；
    // 落位后把权威值回写记录表（锁定期内的 scroll 事件已被忽略，避免旧值/污染值滞留）
    for (const delay of [120, 360]) {
      setTimeout(() => {
        if (mainEl.value) applyScroll(mainEl.value, restore)
      }, delay)
    }
    setTimeout(() => {
      savedScrolls.set(to.fullPath, restore)
    }, 480)
    return
  }
  applyScroll(target, 0)
})

function applyScroll(el: HTMLElement, top: number): void {
  el.scrollTop = top
}

onUnmounted(() => {
  removeBeforeEach()
  removeAfterEach()
})
</script>

<template>
  <div class="app-shell">
    <main ref="mainEl" class="app-main" @scroll="onContentScroll">
      <RouterView v-slot="{ Component }">
        <!-- 首页缓存：返回保持滚动位置与浏览状态（列表数据经 onActivated 重读）；其余页不缓存维持现状 -->
        <KeepAlive :include="['HomeView']">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </main>
    <!-- meta.tab 决定是否渲染底部导航，禁止各页自带底栏 -->
    <TabBar v-if="route.meta.tab" />
  </div>
</template>

<style scoped>
.app-shell {
  /* H5 桌面预览时居中约束；验收视口 320–430 */
  max-width: 430px;
  margin: 0 auto;
  /* 长列表+固定底栏：壳固定视口高，内容区独立滚动（首页复刻工程策略 2026-09-05） */
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
}

.app-main {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* 关闭浏览器滚动锚定：返回恢复/置顶由本布局滚动管线独占控制，
     否则 DOM 大改（KeepAlive 换页）时 Chrome 会自行调整 scrollTop 干扰恢复值（2026-09-08 取证） */
  overflow-anchor: none;
  /* 设计稿无常驻滚动条；移动端为 overlay 滚动条，桌面预览对齐隐藏（复刻验收检查项） */
  scrollbar-width: none;
}

.app-main::-webkit-scrollbar {
  display: none;
}
</style>
