import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  server: {
    // 服务器部署（2026-09-08）：固定 5173（架构约定 §5），/api 同源转发后端，
    // 绕开 CORS 与 Cookie 域限制（与 user-h5 同口径）；配合 VITE_API_BASE_URL=/api/v1
    port: 5173,
    proxy: {
      '/api': {
        // 后端挂载 4000（8080 被其他应用占用）
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
})
