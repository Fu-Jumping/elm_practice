import '@/styles/tokens.css'
import '@/styles/base.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 全局错误兜底（架构约定 §5）：避免未捕获异常白屏
app.config.errorHandler = (err, _instance, info) => {
  console.error('[app error]', err, info)
}

app.mount('#app')
