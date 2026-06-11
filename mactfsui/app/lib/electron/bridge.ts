import type { MactfsBridge, ServiceStatus } from "./types"

const DEFAULT_BASE_URL = "http://127.0.0.1:38765"

/**
 * 获取 Electron 暴露的 window.mactfs 桥接对象，非 Electron 环境（含 SSR）返回 null。
 */
export function getBridge(): MactfsBridge | null {
  if (typeof window === "undefined") {
    return null
  }
  return window.mactfs ?? null
}

/**
 * 判断当前是否运行在 Electron 桥接环境中。
 */
export function isElectron(): boolean {
  return getBridge() != null
}

/**
 * 获取本地 API 基础地址，非 Electron 环境回退到默认本地地址。
 */
export async function getApiBaseUrl(): Promise<string> {
  const bridge = getBridge()
  if (!bridge) {
    return DEFAULT_BASE_URL
  }
  return bridge.getApiBaseUrl()
}

/**
 * 获取本地服务 Bearer Token，非 Electron 环境返回 null。
 */
export async function getToken(): Promise<string | null> {
  const bridge = getBridge()
  if (!bridge) {
    return null
  }
  return bridge.getToken()
}

/**
 * 查询本地服务状态，非 Electron 环境返回未就绪状态并说明原因。
 */
export async function getServiceStatus(): Promise<ServiceStatus> {
  const bridge = getBridge()
  if (!bridge) {
    return unavailableStatus()
  }
  return bridge.getServiceStatus()
}

/**
 * 拉起并等待本地服务就绪，非 Electron 环境返回未就绪状态并说明原因。
 */
export async function startService(): Promise<ServiceStatus> {
  const bridge = getBridge()
  if (!bridge) {
    return unavailableStatus()
  }
  return bridge.startService()
}

/**
 * 打开系统目录选择器，非 Electron 环境返回 null。
 */
export async function selectDirectory(): Promise<string | null> {
  const bridge = getBridge()
  if (!bridge) {
    return null
  }
  return bridge.selectDirectory()
}

/**
 * 批量检测本地绝对路径是否存在，非 Electron 环境返回 null 表示无法检测。
 */
export async function pathsExist(paths: string[]): Promise<Record<string, boolean> | null> {
  const bridge = getBridge()
  if (!bridge || paths.length === 0) {
    return bridge ? {} : null
  }
  return bridge.pathsExist(paths)
}

/**
 * 在访达中打开本地路径（目录直接进入，文件定位选中），非 Electron 环境返回 false。
 */
export async function revealPath(targetPath: string, isFolder: boolean): Promise<boolean> {
  const bridge = getBridge()
  if (!bridge) {
    return false
  }
  return bridge.revealPath(targetPath, isFolder)
}

/**
 * 打开系统文件选择器（多选），非 Electron 环境返回 null。
 */
export async function selectFiles(defaultPath?: string): Promise<string[] | null> {
  const bridge = getBridge()
  if (!bridge) {
    return null
  }
  return bridge.selectFiles(defaultPath)
}

/**
 * 构造非 Electron 环境下的占位服务状态。
 */
function unavailableStatus(): ServiceStatus {
  return {
    running: false,
    baseUrl: DEFAULT_BASE_URL,
    tokenAvailable: false,
    health: null,
    error: "当前不在 Electron 桌面环境，无法访问本地服务",
  }
}
