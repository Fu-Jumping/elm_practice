/**
 * 轻提示工具（自建，架构约定 §3.1：用户端不引入 UI 组件库）
 * TODO(页面开发期)：接入自建 Toast 视觉组件；当前回退 console，保证请求层联调期可用
 */
type ToastListener = (message: string) => void

const listeners = new Set<ToastListener>()

export function toast(message: string): void {
  console.warn('[toast]', message)
  listeners.forEach((listener) => listener(message))
}

export function onToast(listener: ToastListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
