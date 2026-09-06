/**
 * 地址域 mock（契约 §3.3 后端替身：查询只返回当前用户地址，空则 []）
 * 种子对齐契约 §2 固定演示数据：默认地址 = 天津大学北洋园校区，12号楼 304室
 * 地址列表为模块级内存态并导出（与 cart mock 同风格），供测试隔离重灌与联调演示
 * PATCH/DELETE/{addressId} 待地址管理页任务接入（9/7 第一批仅锁查询侧）
 */
import type { Address } from '@/services/api/types'
import type { MockHandler } from './index'
import { fail, ok } from './index'

/** 种子数据（测试 beforeEach 重灌用）：与 addressMockState 初始态保持同一份 */
export const ADDRESS_SEED: Address[] = [
  {
    addressId: 'da001',
    contactName: '张同学',
    contactSex: '男',
    contactPhone: '13800000001',
    region: '天津大学北洋园校区',
    detail: '12号楼 304室',
    label: '学校',
    isDefault: true,
  },
]

export const addressMockState: Address[] = ADDRESS_SEED.map((item) => ({ ...item }))

export const addressMocks: Record<string, MockHandler> = {
  'GET /me/addresses': () => {
    // 响应必须返回拷贝（与 cart mock 同因：避免响应式新旧代理同源导致更新静默失效）
    return ok<Address[]>(addressMockState.map((item) => ({ ...item })))
  },
}
