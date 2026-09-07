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

function goEdit(address: Address): void {
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
      <button class="al-add" type="button" data-testid="add-address-btn" @click="goNew">
        新增地址
      </button>
    </header>

    <main class="al-main">
      <template v-if="loaded">
        <section
          v-for="address in sortedAddresses"
          :key="address.addressId"
          class="al-card"
          data-testid="address-card"
          :data-testid-card-id="address.addressId"
          @click="goEdit(address)"
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
  </div>
</template>

<style scoped>
.address-list-page {
  min-height: 100vh;
  background: #f9f9f9;
  padding-bottom: 24px;
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

.al-add {
  border: none;
  background: none;
  color: #ff5a1f;
  font-size: 14px;
  font-weight: 600;
}

.al-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.al-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
}

.al-contact {
  display: flex;
  align-items: center;
  gap: 6px;
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

.al-default-tag {
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: #ff5a1f;
  background: rgba(255, 90, 31, 0.1);
}

.al-label {
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  color: #666;
  background: #f3f3f3;
}

.al-detail {
  margin-top: 4px;
  font-size: 14px;
  color: #1a1c1c;
}

.al-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f3f3f3;
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

.al-empty {
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
