<script setup lang="ts">
/**
 * 新增/编辑地址页（视觉真源：docs/design/exports/用户端/10-个人中心，390 宽）
 * 2026-09-07 TDD 落地（T36-T39）：
 * - 模式：路由含 addressId 为编辑（标题/回显走单查接口），否则新增（PRD 7.16 新增地址页行）
 * - 前端校验复用 validateAddressForm（TC-ADR-002 体验层），校验不过不发请求；业务规则后端兜底
 * - 保存按钮：先校验再只发一次请求，保存中禁用（PRD 7.9"保存中"）；失败保留输入
 * - 编辑地址不存在：提示并返回列表（PRD 顶部栏行）
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addressApi } from '@/services/api'
import { validateAddressForm } from '@/services/validators'
import { toast } from '@/utils/toast'
import type { AddressFormErrors } from '@/services/validators'

const route = useRoute()
const router = useRouter()

const addressId = typeof route.params.addressId === 'string' ? route.params.addressId : ''
const isEdit = addressId !== ''

const form = reactive({
  contactName: '',
  contactSex: '男' as '男' | '女',
  contactPhone: '',
  region: '',
  detail: '',
  label: '',
  isDefault: false,
})

const errors = ref<AddressFormErrors>({})
const loaded = ref(false)
const missing = ref(false)
const saving = ref(false)

const title = computed(() => (isEdit ? '编辑地址' : '新增地址'))

onMounted(async () => {
  if (!isEdit) {
    loaded.value = true
    return
  }
  try {
    const address = await addressApi.getAddress(addressId)
    form.contactName = address.contactName
    form.contactSex = address.contactSex
    form.contactPhone = address.contactPhone
    form.region = address.region
    form.detail = address.detail
    form.label = address.label ?? ''
    form.isDefault = address.isDefault
  } catch {
    // 地址不存在/无权限：提示并返回列表（PRD 顶部栏行）
    missing.value = true
    toast('地址不存在')
    window.setTimeout(() => void router.replace({ name: 'address-list' }), 400)
    return
  }
  loaded.value = true
})

/** 保存：先前端校验（不过不发请求），再只发一次新增/修改请求（PRD 保存按钮行） */
async function save(): Promise<void> {
  if (saving.value) return
  errors.value = validateAddressForm({
    contactName: form.contactName,
    contactSex: form.contactSex,
    contactPhone: form.contactPhone,
    region: form.region,
    detail: form.detail,
  })
  if (Object.keys(errors.value).length > 0) return
  saving.value = true
  try {
    const body = {
      contactName: form.contactName.trim(),
      contactSex: form.contactSex,
      contactPhone: form.contactPhone.trim(),
      region: form.region.trim(),
      detail: form.detail.trim(),
      label: form.label.trim() || undefined,
      isDefault: form.isDefault,
    }
    if (isEdit) await addressApi.updateAddress(addressId, body)
    else await addressApi.addAddress(body)
    void router.push({ name: 'address-list' })
  } catch {
    // 失败不返回、不清空输入（PRD）；提示由 http 层统一 toast
  } finally {
    saving.value = false
  }
}

function goBack(): void {
  if (window.history.length > 1) router.back()
  else void router.replace({ name: 'address-list' })
}
</script>

<template>
  <div class="address-edit-page">
    <header class="ae-header">
      <button class="ae-back" type="button" aria-label="返回" @click="goBack">
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
      <span class="ae-title">{{ title }}</span>
      <span class="ae-header-slot" />
    </header>

    <main class="ae-main">
      <div v-if="missing" class="ae-missing" data-testid="address-missing-tip">
        地址不存在或已删除，即将返回列表…
      </div>

      <template v-else-if="loaded">
        <section class="ae-card">
          <div class="ae-field">
            <label class="ae-label" for="ae-contactName">联系人</label>
            <input
              id="ae-contactName"
              v-model="form.contactName"
              class="ae-input"
              data-testid="input-contactName"
              placeholder="收货人姓名"
              maxlength="20"
            />
            <p v-if="errors.contactName" class="ae-error" data-testid="error-contactName">
              {{ errors.contactName }}
            </p>
          </div>

          <div class="ae-field">
            <label class="ae-label" for="ae-contactSex">性别</label>
            <select id="ae-contactSex" v-model="form.contactSex" class="ae-input" data-testid="input-contactSex">
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>

          <div class="ae-field">
            <label class="ae-label" for="ae-contactPhone">手机号</label>
            <input
              id="ae-contactPhone"
              v-model="form.contactPhone"
              class="ae-input"
              data-testid="input-contactPhone"
              placeholder="11 位手机号"
              maxlength="11"
              inputmode="numeric"
            />
            <p v-if="errors.contactPhone" class="ae-error" data-testid="error-contactPhone">
              {{ errors.contactPhone }}
            </p>
          </div>

          <div class="ae-field">
            <label class="ae-label" for="ae-region">所在地区</label>
            <input
              id="ae-region"
              v-model="form.region"
              class="ae-input"
              data-testid="input-region"
              placeholder="学校 / 小区 / 写字楼"
              maxlength="50"
            />
            <p v-if="errors.region" class="ae-error" data-testid="error-region">
              {{ errors.region }}
            </p>
          </div>

          <div class="ae-field">
            <label class="ae-label" for="ae-detail">详细地址</label>
            <input
              id="ae-detail"
              v-model="form.detail"
              class="ae-input"
              data-testid="input-detail"
              placeholder="楼栋 / 房间号"
              maxlength="100"
            />
            <p v-if="errors.detail" class="ae-error" data-testid="error-detail">
              {{ errors.detail }}
            </p>
          </div>

          <div class="ae-field">
            <label class="ae-label" for="ae-label">标签</label>
            <input
              id="ae-label"
              v-model="form.label"
              class="ae-input"
              data-testid="input-label"
              placeholder="如：学校、家（选填）"
              maxlength="10"
            />
          </div>

          <label class="ae-switch-row">
            <span class="ae-label">设为默认地址</span>
            <input v-model="form.isDefault" type="checkbox" data-testid="input-isDefault" />
          </label>
        </section>

        <button
          class="ae-save"
          type="button"
          data-testid="save-address-btn"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? '保存中' : '保存' }}
        </button>
      </template>
      <p v-else class="ae-skeleton">地址加载中…</p>
    </main>
  </div>
</template>

<style scoped>
.address-edit-page {
  min-height: 100vh;
  background: #f9f9f9;
  padding-bottom: 24px;
}

.ae-header {
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

.ae-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: #ff5a1f;
}

.ae-back svg {
  width: 22px;
  height: 22px;
}

.ae-title {
  font-size: 18px;
  font-weight: 600;
  color: #ff5a1f;
}

.ae-header-slot {
  width: 32px;
}

.ae-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.ae-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #fff;
  border-radius: 8px;
  padding: 14px 12px;
}

.ae-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ae-label {
  font-size: 13px;
  color: #666;
}

.ae-input {
  height: 40px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 14px;
  color: #1a1c1c;
  background: #fff;
  box-sizing: border-box;
}

.ae-error {
  font-size: 12px;
  color: #ba1a1a;
}

.ae-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ae-save {
  padding: 13px;
  border: none;
  border-radius: 12px;
  background: #ff5a1f;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.ae-save:disabled {
  opacity: 0.5;
}

.ae-missing {
  background: #fff;
  border-radius: 8px;
  padding: 40px 12px;
  text-align: center;
  font-size: 14px;
  color: #999;
}

.ae-skeleton {
  padding: 40px 12px;
  text-align: center;
  font-size: 14px;
  color: #999;
}
</style>
