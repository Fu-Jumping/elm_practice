import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import pxToViewport from 'postcss-px-to-viewport-8-plugin'
import { vwScaleCapPlugin } from './src/utils/vwScaleCap'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 端口与后端地址经环境变量注入（PR #36 评审建议）：本地开发与服务器部署不再互相覆盖。
  // 本地默认：5173 + 契约默认后端 4000；服务器部署在 .env.development.local 覆盖
  // VITE_DEV_PORT=5174、VITE_PROXY_TARGET=http://127.0.0.1:4000（端口口径见 BUG-20260908-007）
  const devPort = Number(env.VITE_DEV_PORT) || 5173
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://127.0.0.1:4000'

  return {
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
      // 固定端口（架构约定 §5：本地 5173，服务器部署 5174 经 VITE_DEV_PORT 覆盖）
      port: devPort,
      // 端口被占用时直接报错退出，不静默顺延（2026-09-08 部署实测：顺延导致前后端端口互换）
      strictPort: true,
      watch: {
        // 其他工具在工程目录写入 .<name>.<pid>.<uuid>.tmpdir/ 临时文件时，Windows 下 chokidar
        // watch 这些文件会报 EBUSY 并让 dev server 直接退出（2026-09-08 两次复现，含 src/ 与工程根目录）；
        // 忽略临时文件可彻底规避，不影响源码热更新。
        ignored: (filePath: string) => filePath.includes('.tmpdir') || filePath.endsWith('.tmp'),
      },
      // 联调代理（9/7）：/api 同源转发后端——绕开 CORS 与 Cookie 域限制，
      // 手机经局域网 IP 访问 dev server 时接口同源可用（配合 VITE_API_BASE_URL=/api/v1）
      proxy: {
        '/api': {
          target: proxyTarget,
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
            // SHOW-QA-002（2026-09-13 修复）：max-width 不参与换算。
            // `.app-shell`/`.cart-bar` 等 5 处 `max-width: 430px` 的语义是「桌面预览时居中约束」，
            // 换算成 110.256vw 后上限随视口放大而失效（1280 视口实测 1411px），
            // 而 430px 在移动端验收视口 320–430 内根本不会触发，故排除该属性对移动端零影响。
            // 全库 px `max-width` 仅此 5 处且取值一致（430px），排除后行为唯一。
            propList: ['*', '!max-width'],
          }),
          // 缩放上限（TODO-USER-112）：vw 只跟视口走，`.app-shell` 的 max-width 锁得住宽度、锁不住缩放
          // ——视口 1163px 时整页被放大 3 倍（购物车栏 317px 盖住半屏）。紧接换算收口为
          // `min(Nvw, N×4.3px)`：视口 ≤430px 时恒取 vw 原值（移动端逐像素不变），>430px 时
          // 冻结在 430px 口径。详见 src/utils/vwScaleCap.ts。
          vwScaleCapPlugin,
        ],
      },
    },
  }
})
