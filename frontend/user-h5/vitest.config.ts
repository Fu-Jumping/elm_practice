import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

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
