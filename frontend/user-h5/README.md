# user-h5

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run E2E Tests with [Playwright](https://playwright.dev/)

```sh
npm run test:e2e
```

- 用例目录 `e2e/`；`vitest.config.ts` 已 `exclude: e2e/**`，避免 Vitest 误收集。
- `playwright.config.ts`：`channel: 'chrome'` 复用本机 Chrome（不下载 Playwright 浏览器二进制），
  `webServer` 自动拉起 `npm run dev`（`.env.development` 为 mock 模式，**无需后端**），已在跑则复用。
- 新机器首次运行：`npm install`（`@playwright/test` 已在 devDependencies）且本机需装有 Chrome。
- 产物 `test-results/`、`playwright-report/` 已 gitignore，不入库。

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
