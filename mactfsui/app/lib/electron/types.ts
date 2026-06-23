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

// MCP 子进程运行状态，由 Electron 主进程汇总（含 /healthz 探活）。
export interface McpStatus {
  running: boolean
  healthy: boolean
  pid: number | null
  sseUrl: string
  startedAt: number | null
  uptimeMs: number
  restartCount: number
  lastExitCode: number | null
  lastError: string | null
  entryResolved: boolean
}

// MCP 单行运行日志（来自子进程 stdout/stderr）。
export interface McpLogEntry {
  ts: number
  stream: "stdout" | "stderr"
  line: string
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
  getMcpStatus(): Promise<McpStatus>
  getMcpLogs(): Promise<McpLogEntry[]>
}

declare global {
  interface Window {
    mactfs?: MactfsBridge
  }
}
