import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import pxToViewport from 'postcss-px-to-viewport-8-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 固定端口（架构约定 §5：5173 / 5174），契约 CORS 已放行
    port: 5173,
  },
  css: {
    postcss: {
      plugins: [
        // vw 移动端适配（架构约定 §3.5）：设计稿宽 390，验收视口 320–430
        // minPixelValue=1：1px 细边框不缩放，保证 hairline 清晰
        pxToViewport({
          viewportWidth: 390,
          unitPrecision: 3,
          viewportUnit: 'vw',
          fontViewportUnit: 'vw',
          minPixelValue: 1,
          mediaQuery: false,
        }),
      ],
    },
  },
})
