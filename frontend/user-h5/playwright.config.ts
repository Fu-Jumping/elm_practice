import { defineConfig } from '@playwright/test'

/**
 * E2E 配置（架构约定 §6：E2E = Playwright，只写 3–5 条关键路径）
 *
 * - `testDir: './e2e'` 必须：默认 testDir 为项目根，会把 src 下的 Vitest 用例
 *   一并当 E2E 收集，实测直接抛 .vue / TS 解析错误（2026-09-08 取证）。
 * - `channel: 'chrome'` 复用本机 Chrome，免下载 Playwright 浏览器二进制。
 * - `webServer` 自动拉起 dev server（.env.development 为 mock 模式，无需后端）；
 *   已在跑则复用，避免与联调中的 5173 端口冲突。
 */
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
