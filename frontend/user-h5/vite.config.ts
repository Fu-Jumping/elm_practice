import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import pxToViewport from 'postcss-px-to-viewport-8-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // vueDevTools 悬浮球/覆盖层会遮挡移动端视口底部的购物车栏与去结算按钮（9/7 联调实测，
    // 点击被透明覆盖层截胡），且验收演示不需要；需要调试时临时恢复此行
    // import vueDevTools from 'vite-plugin-vue-devtools'
    // vueDevTools(),
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
