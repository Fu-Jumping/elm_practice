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
      </template>
      <p v-else class="ae-skeleton">地址加载中…</p>
    </main>

    <!-- 固定底栏「保存」：设计稿 .fixedActionButtonAtB（06-新增收货地址 :59-98）
         白底 + border-top 1px #e5e5e5，padding 15/16/16、高 77px；按钮 radius 4px
         渲染条件与改造前一致（仅表单加载完成且地址存在时出现） -->
    <footer v-if="loaded && !missing" class="ae-footer">
      <button
        class="ae-save"
        type="button"
        data-testid="save-address-btn"
        :disabled="saving"
        @click="save"
      >
        {{ saving ? '保存中' : '保存' }}
      </button>
    </footer>
  </div>
</template>

<style scoped>
.address-edit-page {
  /* 固定底栏高度（设计稿 .fixedActionButtonAtB h77）；内容底部留白 = 底栏高 + 16px 安全间距，
     保证滚动到底时「设为默认地址」行不被底栏遮挡 */
  --ae-footer-h: 77px;
  min-height: 100vh;
  background: #f9f9f9;
  padding-bottom: calc(var(--ae-footer-h) + 16px);
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

/* 通栏行式：设计稿 .mainContentCanvas（padding-top 12px、row-gap 16px、无左右留白） */
.ae-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px 0 0;
}

/* 表单区：设计稿 .form（06-新增收货地址 :121-127）通栏白底，无圆角无阴影 */
.ae-card {
  display: flex;
  flex-direction: column;
  background: #fff;
}

/* 表单行：设计稿 .contactPersonRow/.phoneNumberRow/.areaRow/.tagSelectionRow（:161-171、230-239、273-282、344-353）
   padding 16/16/15、min-height 56、border-bottom 1px #e5e5e5；行内是「标签 + 值」文本，无输入框边线 */
.ae-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-height: 56px;
  padding: 16px 16px 15px;
  border-bottom: 1px solid var(--color-border-light);
}

/* 行标签：设计稿 .text3（:129-139）宽 96、padding-right 16、16px/500 #1a1c1c */
.ae-label {
  flex-shrink: 0;
  width: 96px;
  padding-right: 16px;
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  color: #1a1c1c;
}

/* 行值：设计稿 .text4（:150-158）为纯文本，无边框，占位色 #999999 */
.ae-input {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  font-size: 16px;
  line-height: 24px;
  color: #1a1c1c;
}

.ae-input::placeholder {
  color: #999;
}

/* 校验提示：换行到行下方（设计稿无错误态，保留既有提示样式） */
.ae-error {
  flex-basis: 100%;
  margin: 4px 0 0;
  font-size: 12px;
  color: #ba1a1a;
}

/* 设为默认行：设计稿 .setDefaultSwitch（:382-392）padding 15/16；上一行的 1px 底边线即分隔线 */
.ae-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 15px 16px;
}

/* 该行文案不套用表单行 96px 标签宽度（否则「设为默认地址」被挤换行） */
.ae-switch-row .ae-label {
  width: auto;
  padding-right: 0;
}

/* 固定底栏：设计稿 .fixedActionButtonAtB（06-新增收货地址 :59-98）
   白底 + 上边线 1px #e5e5e5，padding 15/16/16、高 77px
   固定定位按页面壳宽度居中（对齐 MainLayout 的 430px 壳），窄视口不产生横向溢出 */
.ae-footer {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 430px;
  height: var(--ae-footer-h);
  padding: 15px 16px 16px;
  background: #fff;
  border-top: 1px solid var(--color-border-light);
}

/* 保存按钮：设计稿 .button2（:80-96）radius 4px、上下 padding 12px、字号 16px/行高 20px */
.ae-save {
  padding: 12px 0;
  border: none;
  border-radius: 4px;
  background: #ff5a1f;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  line-height: 20px;
}

.ae-save:disabled {
  opacity: 0.5;
}

.ae-missing {
  margin: 0 12px;
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
