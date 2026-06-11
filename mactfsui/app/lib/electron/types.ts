// 本地 API 服务健康信息，对应服务端 /api/health 的 data 字段。
export interface ServiceHealth {
  status: string
  host: string
  port: number
  tokenFile: string
  configFile: string
  connected: boolean
}

// 渲染进程感知的本地服务状态，由 Electron 主进程计算返回。
export interface ServiceStatus {
  running: boolean
  baseUrl: string
  tokenAvailable: boolean
  health: ServiceHealth | null
  error: string | null
}

// preload 暴露到 window.mactfs 的窄接口契约。
export interface MactfsBridge {
  isElectron: true
  getApiBaseUrl(): Promise<string>
  getToken(): Promise<string | null>
  getServiceStatus(): Promise<ServiceStatus>
  startService(): Promise<ServiceStatus>
  selectDirectory(): Promise<string | null>
  pathsExist(paths: string[]): Promise<Record<string, boolean>>
  revealPath(targetPath: string, isFolder: boolean): Promise<boolean>
}

declare global {
  interface Window {
    mactfs?: MactfsBridge
  }
}
