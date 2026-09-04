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
    },
  }),
)
