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
    // 固定端口（架构约定 §5：5173 / 5174）
    port: 5173,
    // 联调代理（9/7）：/api 同源转发后端——绕开 CORS 与 Cookie 域限制，
    // 手机经局域网 IP 访问 dev server 时接口同源可用（配合 VITE_API_BASE_URL=/api/v1）
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      // 演示图片由前端 public/demo-images 伺服（同源，无需代理）。
      // 原计划代理转发后端伺服（口径 b），实测 404：后端 application.properties 关闭了
      // 静态资源映射（add-mappings=false，API-only 设计）——后端若开启可恢复代理（2026-09-07 留痕）
    },
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
