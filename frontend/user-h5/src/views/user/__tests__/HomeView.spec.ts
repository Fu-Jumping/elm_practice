import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HomeView from '../HomeView.vue'

// 9/3 初始化验收样例测试：跑通 Vitest 脚手架（测试场景由人设计，AI 只辅助脚手架）
describe('HomeView（初始化验收 Hello 页）', () => {
  it('渲染 Hello 标题', () => {
    const wrapper = mount(HomeView)
    expect(wrapper.find('h1').text()).toContain('Hello')
  })
})
