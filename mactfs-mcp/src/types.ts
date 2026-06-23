// 与 Java 后端 ApiResult 对齐的统一响应外壳。
export interface ApiResult<T = Record<string, unknown>> {
  success: boolean
  message?: string
  errorMessage?: string
  operation?: string
  data: T
}

// HTTP 客户端对外返回结构，统一封装网络层与业务层。
export interface ApiResponse<T = Record<string, unknown>> {
  ok: boolean
  status: number
  data: T | null
  errorMessage: string | null
}

// /api/health 返回的 data 字段。
export interface HealthData {
  status?: string
  connected?: boolean
}

// /api/files/status（新增）返回的单文件状态。
export interface FileStatus {
  localPath: string
  serverPath: string | null
  mapped: boolean
  exists: boolean
  serverExists: boolean
  pendingEdit: boolean
  pendingChangeType: string | null
  localVersion: number
  latestVersion: number
  upToDate: boolean
  status: string
}

// /api/files/checkout 返回的 result 字段。
export interface FileOperationResult {
  operation: string
  affected: number
  failures: string[]
}

// tfs_checkout / tfs_add 对每个路径返回的结构化结果（共用一套结构）。
export type PendAction =
  | "checkedOut"
  | "alreadyCheckedOut"
  | "added"
  | "alreadyAdded"
  | "skipped"
  | "error"
export type PendReason =
  | "ok"
  | "notConnected"
  | "clientNotRunning"
  | "notMapped"
  | "newFileNeedsAdd"
  | "notDownloaded"
  | "stale"
  | "notExist"
  | "alreadyTracked"
  | "error"

export interface PendItemResult {
  path: string
  serverPath: string | null
  action: PendAction
  reason: PendReason
  mapped: boolean
  pendingEdit: boolean
  localVersion: number
  latestVersion: number
  upToDate: boolean
  message: string
}
