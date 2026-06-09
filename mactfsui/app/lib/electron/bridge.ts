export interface ServiceStatus {
  baseUrl: string
  running: boolean
  connected: boolean
  message: string
  tokenFile: string
  configFile?: string
  started?: boolean
}

export interface MacTfsBridge {
  getToken(): Promise<string>
  getServiceStatus(): Promise<ServiceStatus>
  selectDirectory(): Promise<string | null>
}

declare global {
  interface Window {
    mactfs?: MacTfsBridge
  }
}

/**
 * 返回 preload 暴露的 macTFS 桥接对象，避免组件直接依赖 Electron 细节。
 */
export function getMactfsBridge() {
  return window.mactfs
}
