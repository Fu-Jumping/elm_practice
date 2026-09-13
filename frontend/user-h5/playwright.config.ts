import { defineConfig } from '@playwright/test'

/**
 * E2E 配置（架构约定 §6：E2E = Playwright，只写 3–5 条关键路径）
 *
 * - `testDir: './e2e'` 必须：默认 testDir 为项目根，会把 src 下的 Vitest 用例
 *   一并当 E2E 收集，实测直接抛 .vue / TS 解析错误（2026-09-08 取证）。
 * - `channel: 'chrome'` 复用本机 Chrome，免下载 Playwright 浏览器二进制。
 * - `webServer` 自动拉起 dev server；**自 2026-09-13 起以 `--mode mock` 启动**：
 *   `.env.development.local` 是开发者本机常驻的 real 模式覆盖（联调用，口径见 BUG-20260908-001），
 *   会让 E2E 打到真实后端（本机不装 MySQL → 代理 ECONNREFUSED），而保真度巡检与交互回归都需要
 *   确定的数据源。`--mode mock` 只加载 `.env.mock` / `.env` / `.env.local`，**不读** `.env.development*`。
 *   注意：`reuseExistingServer` 会复用已在 5173 跑着的 dev server——若那是 real 模式的联调实例，
 *   请先停掉再跑 E2E，否则数据源不一致。
 */
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
  },
  webServer: {
    command: 'npm run dev -- --mode mock',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
