<script setup lang="ts">
/**
 * 地址列表页（视觉真源：docs/design/exports/用户端/10-个人中心，390 宽）
 * 2026-09-07 TDD 落地（T31-T35）：
 * - 地址来自当前用户地址接口，默认地址置顶并带"默认"标识（PRD 7.9/7.16）
 * - 空态展示无数据提示与"新增地址"按钮；未登录转登录带 redirect
 * - 管理场景点击地址卡进入编辑；设为默认调用更新接口（成功后其他地址取消默认）
 * - 删除需要二次确认并调用删除接口（后端自动改派默认，刷新列表回读）
 * TODO(第三批 TDD)：确认订单场景的地址选择回填（PRD：选择结果回填，不直接创建订单）
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addressApi } from '@/services/api'
import { useSessionStore } from '@/stores/sessionStore'
import { toast } from '@/utils/toast'
import type { Address } from '@/services/api/types'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()

/** 选择模式（确认订单场景，PRD 873：点击地址卡选中并返回，不直接创建订单） */
const selectMode = computed(() => route.query.select === '1')
const returnStoreId = typeof route.query.storeId === 'string' ? route.query.storeId : ''

const addresses = ref<Address[]>([])
const loaded = ref(false)

/** 默认地址置顶（后端列表已排，前端兜底再排一次） */
const sortedAddresses = computed(() =>
  [...addresses.value].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
)

onMounted(async () => {
  if (!sessionStore.isLoggedIn) {
    await sessionStore.checkLogin()
    if (!sessionStore.isLoggedIn) {
      void router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return
    }
  }
  await refresh()
})

async function refresh(): Promise<void> {
  try {
    addresses.value = await addressApi.getAddresses()
  } catch {
    addresses.value = []
  }
  loaded.value = true
}

/** 设为默认（TC-ADR-003：后端互斥，前端刷新回读最新排序与标识） */
async function setDefault(address: Address): Promise<void> {
  try {
    await addressApi.updateAddress(address.addressId, { isDefault: true })
    await refresh()
  } catch {
    // 失败恢复原状态并提示（http 层已 toast）
  }
}

/** 删除：二次确认（PRD），成功后刷新列表（默认改派由后端完成） */
async function remove(address: Address): Promise<void> {
  if (!window.confirm('确定删除该收货地址吗？')) return
  try {
    await addressApi.removeAddress(address.addressId)
    await refresh()
  } catch {
    // 失败保留原列表（http 层已 toast）
  }
}

function onCardClick(address: Address): void {
  // 确认订单场景：选中并返回（回传 addressId）；管理场景：进入编辑
  if (selectMode.value) {
    void router.replace({
      name: 'order-confirm',
      query: { storeId: returnStoreId, addressId: address.addressId },
    })
    return
  }
  void router.push({ name: 'address-edit', params: { addressId: address.addressId } })
}

function goNew(): void {
  void router.push({ name: 'address-new' })
}

function goBack(): void {
  if (window.history.length > 1) router.back()
  else void router.replace({ name: 'home' })
}
</script>

<template>
  <div class="address-list-page">
    <header class="al-header">
      <button class="al-back" type="button" aria-label="返回" @click="goBack">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M15 4.5L7.5 12L15 19.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <span class="al-title">收货地址</span>
      <!-- 设计稿顶栏仅「返回 + 标题」（05-收货地址 .headerTaskFocusedTop :10-33），右侧占位保持标题居中 -->
      <span class="al-header-slot" />
    </header>

    <main class="al-main">
      <template v-if="loaded">
        <section
          v-for="address in sortedAddresses"
          :key="address.addressId"
          class="al-card"
          data-testid="address-card"
          :data-testid-card-id="address.addressId"
          @click="onCardClick(address)"
        >
          <div class="al-card-main" :data-testid="`address-card-${address.addressId}`">
            <div class="al-contact">
              <span class="al-name">{{ address.contactName }}</span>
              <span class="al-sex">{{ address.contactSex }}</span>
              <span class="al-phone">{{ address.contactPhone }}</span>
              <span
                v-if="address.isDefault"
                class="al-default-tag"
                :data-testid="`default-tag-${address.addressId}`"
              >
                默认
              </span>
              <span v-if="address.label" class="al-label">{{ address.label }}</span>
            </div>
            <p class="al-detail">{{ address.region }} {{ address.detail }}</p>
          </div>
          <div class="al-actions">
            <button
              v-if="!address.isDefault"
              class="al-action"
              type="button"
              :data-testid="`set-default-${address.addressId}`"
              @click.stop="setDefault(address)"
            >
              设为默认
            </button>
            <button
              class="al-action al-action--danger"
              type="button"
              :data-testid="`delete-${address.addressId}`"
              @click.stop="remove(address)"
            >
              删除
            </button>
          </div>
        </section>

        <div v-if="sortedAddresses.length === 0" class="al-empty" data-testid="address-empty">
          <p>暂无收货地址</p>
          <button class="al-empty-add" type="button" @click="goNew">新增地址</button>
        </div>
      </template>
      <p v-else class="al-skeleton">地址加载中…</p>
    </main>

    <!-- 固定底栏「新增地址」：设计稿 .footerFixedBottomAct（05-收货地址 :113-151）
         白底 + border-top 1px #e5e5e5，padding 11/12/24，按钮 h48/radius 8 -->
    <footer class="al-footer">
      <button class="al-footer-btn" type="button" data-testid="add-address-btn" @click="goNew">
        新增地址
      </button>
    </footer>
  </div>
</template>

<style scoped>
.address-list-page {
  /* 固定底栏高度（设计稿 .footerFixedBottomAct h85）；内容底部留白 = 底栏高 + 16px 安全间距，
     保证滚动到底时最后一个地址行不被底栏遮挡 */
  --al-footer-h: 85px;
  min-height: 100vh;
  background: #f9f9f9;
  padding-bottom: calc(var(--al-footer-h) + 16px);
}

.al-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 12px;
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
}

.al-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: #ff5a1f;
}

.al-back svg {
  width: 22px;
  height: 22px;
}

.al-title {
  font-size: 18px;
  font-weight: 600;
  color: #ff5a1f;
}

.al-header-slot {
  width: 32px;
}

/* 通栏行式：设计稿 .mainContentArea（padding-top 12px、无左右留白、行间无缝）——§2.2 不加卡片壳 */
.al-main {
  display: flex;
  flex-direction: column;
  padding: 12px 0 0;
}

/* 地址行：设计稿 .addressCardDefault/.addressCardSecondary（05-收货地址 :153-204）
   通栏白底、无圆角无阴影，padding 10/10/9，行间 border-bottom 1px #e5e5e5 */
.al-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 10px 10px 9px;
  border-bottom: 1px solid var(--color-border-light);
}

/* 设计稿最后一行 .addressCardThird（:238-247）：无底边线、padding 10px */
.al-card:last-child {
  border-bottom: none;
  padding-bottom: 10px;
}

/* 左侧信息区：设计稿 .leftContent（:167-174）纵向 4px 行距、右侧留 12px */
.al-card-main {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  align-items: flex-start;
  min-width: 0;
  padding-right: 12px;
  row-gap: 4px;
}

.al-contact {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.al-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1c1c;
}

.al-sex,
.al-phone {
  font-size: 13px;
  color: #666;
}

/* 默认徽标：设计稿 .backgroundBorder（05-收货地址 :182-201）
   border-radius 2px、border 1px #ffb59e、padding 1px 5px、字号 10px；配色保留项目品牌橙 #ff5a1f 系（项目规则 §5） */
.al-default-tag {
  padding: 1px 5px;
  border: 1px solid #ffb59e;
  border-radius: 2px;
  font-size: 10px;
  font-weight: 500;
  line-height: 14px;
  color: #ff5a1f;
  background: rgba(255, 90, 31, 0.1);
}

/* 普通标签：设计稿 .background（05-收货地址 :264-282）border-radius 2px、padding 2px 6px、背景 #e2e2e2 */
.al-label {
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 10px;
  line-height: 14px;
  color: #666;
  background: #e2e2e2;
}

.al-detail {
  margin: 4px 0 0;
  font-size: 14px;
  color: #1a1c1c;
}

/* 右侧编辑区：设计稿 .buttonRightAction（:101-111）以 border-left 1px #e5e5e5 分隔，padding 8/8/8/7 */
.al-actions {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  flex-shrink: 0;
  align-items: flex-end;
  justify-content: center;
  row-gap: 8px;
  padding: 8px 8px 8px 7px;
  border-left: 1px solid var(--color-border-light);
}

.al-action {
  border: none;
  background: none;
  font-size: 13px;
  color: #666;
}

.al-action--danger {
  color: #ba1a1a;
}

/* 固定底栏：设计稿 .footerFixedBottomAct（05-收货地址 :113-151）
   白底 + 上边线 1px #e5e5e5，padding 11/12/24、高 85px；按钮 h48/radius 8/#ff5a1f
   固定定位按页面壳宽度居中（对齐 MainLayout 的 430px 壳），窄视口不产生横向溢出 */
.al-footer {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 430px;
  height: var(--al-footer-h);
  padding: 11px 12px 24px;
  background: #fff;
  border-top: 1px solid var(--color-border-light);
}

.al-footer-btn {
  height: 48px;
  border: none;
  border-radius: 8px;
  background: #ff5a1f;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.al-empty {
  margin: 0 12px;
  background: #fff;
  border-radius: 8px;
  padding: 40px 12px;
  text-align: center;
}

.al-empty p {
  font-size: 14px;
  color: #999;
}

.al-empty-add {
  margin-top: 16px;
  padding: 10px 24px;
  border: none;
  border-radius: 12px;
  background: #ff5a1f;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.al-skeleton {
  padding: 40px 12px;
  text-align: center;
  font-size: 14px;
  color: #999;
}
</style>
