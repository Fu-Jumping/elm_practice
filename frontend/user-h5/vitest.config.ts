import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfigExport from './vite.config'

// vite.config.ts 自 2026-09-09 起为函数式配置（按 mode 注入 dev 端口与代理目标，见
// BUG-20260908-007 端口口径）。mergeConfig 不支持函数式配置，直接合并会在启动时报
// "Cannot merge config in form of callback"，因此先按其签名解析成配置对象再合并。
const viteConfig =
  typeof viteConfigExport === 'function'
    ? (viteConfigExport as (env: { mode: string; command: string }) => object)({
        mode: 'test',
        command: 'serve',
      })
    : viteConfigExport

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      // 测试环境不读 .env.development：显式声明 mock 模式，会话链路用例走工程内 mock（2026-09-04）
      env: { VITE_API_MODE: 'mock' },
      // 用例内含 mock 延迟（每次请求 200–500ms）且 22 个文件并行执行，默认 5s 单测超时在负载下会误判
      // （2026-09-08 T18 偶发 "Test timed out in 5000ms"）；放宽到 20s，仅影响失败判定时延
      testTimeout: 20000,
    },
  }),
)
