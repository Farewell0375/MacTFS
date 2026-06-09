// 服务端统一响应结构，对应 MacTfsServer.ApiResult。
export interface ApiResult<T = Record<string, unknown>> {
  success: boolean
  message?: string
  errorMessage?: string
  operation?: string
  startedAt?: number
  endedAt?: number
  durationMs?: number
  logs?: string[]
  data: T
}

// API 客户端对外返回结构，统一封装网络层与业务层成功/失败。
export interface ApiResponse<T = Record<string, unknown>> {
  ok: boolean
  status: number
  result: ApiResult<T> | null
  data: T | null
  errorMessage: string | null
}

// API 请求选项。
export interface ApiRequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  signal?: AbortSignal
}

// 单条 Mapping 配置，对应服务端 MappingConfig。
export interface MappingConfig {
  serverPath: string
  localPath: string
}

// 服务端持久化配置，对应 MacTfsServer.AppConfig。
export interface AppConfig {
  serverUri?: string
  authType?: string
  domain?: string
  username?: string
  password?: string
  collection?: string
  workspace?: string
  mappings: MappingConfig[]
}

// 连接结果摘要，对应 /api/session/connect 返回的概要字段。
export interface ConnectResult {
  serverUri?: string
  collectionCount?: number
}

// Collection 信息，对应 core TfsCollectionInfo。
export interface Collection {
  name: string
  id: string
}

// 服务端目录项，对应服务端 serverItems 序列化结构。
export interface ServerItem {
  name: string
  path: string
  serverPath: string
  type: "folder" | "file"
  folder: boolean
  latestVersion: number
  checkinDate: number | null
}

// Workspace Mapping 信息，对应 core TfsMappingInfo。
export interface MappingInfo {
  serverPath: string
  localPath: string
}

// Workspace 概要，对应 core TfsWorkspaceInfo。
export interface WorkspaceInfo {
  name: string
  ownerName: string
  computer: string
  comment: string
  created: boolean
  mappings: MappingInfo[]
}

// 工作台固定上下文，对应 /api/workspace/context 的 context 字段。
export interface WorkspaceContext {
  serverUri?: string
  authType?: string
  collection?: string
  workspace?: string
  connected: boolean
  mappings: MappingInfo[]
}

// Mapping 目标预校验结果，对应 /api/mappings/check-target。
export interface CheckMappingTargetResult {
  serverPath: string
  localParentPath: string
  name: string
  targetPath: string
  exists: boolean
  allowed: boolean
}

// Get Latest 结果，对应 core TfsGetLatestResult。
export interface GetLatestResult {
  updated: number
  operations: number
  conflicts: number
  failures: number
}

// 文件操作结果，对应 core TfsFileOperationResult。
export interface FileOperationResult {
  operation: string
  affected: number
  failures: string[]
}

// 挂起更改项，对应 core TfsPendingChangeInfo。
export interface PendingChange {
  serverPath: string
  localPath: string
  name: string
  folder: boolean
  status: string
  changeType: string
  version: number
}

// 签入结果，对应 core TfsCheckinResult。
export interface CheckinResult {
  changeset: number
  submittedChanges: number
}

// 目录对比项，对应 core TfsFolderDiffItem。
export interface FolderDiffItem {
  serverPath: string
  localPath: string
  name: string
  folder: boolean
  status: string
  localVersion: number
  latestVersion: number
}

// 历史记录项，对应 core TfsHistoryEntry。
export interface HistoryEntry {
  serverPath: string
  name: string
  changeType: string
  itemType: string
  changeset: number
  author: string
  date: number | null
  comment: string
}

// 文件内容，对应 core TfsFileContent，binary / tooLarge 时 content 为空串。
export interface FileContent {
  serverPath: string
  changeset: number
  content: string
  binary: boolean
  size: number
  tooLarge: boolean
}

// 文本 Diff，对应 core TfsTextDiff。
export interface TextDiff {
  sourceLabel: string
  targetLabel: string
  lines: string[]
}

// 冲突明细，对应 core TfsConflictInfo。
export interface ConflictInfo {
  conflictId: number
  type: string
  serverPath: string | null
  localPath: string | null
  yourServerItem: string | null
  theirServerItem: string | null
  baseServerItem: string | null
  resolved: boolean
}

// 第一版支持的冲突取舍：采用服务器版本或保留本地版本。
export type ConflictResolution = "takeServer" | "keepLocal"

// 冲突应用结果，对应 core TfsConflictResolution。
export interface ConflictResolutionResult {
  conflictId: number
  resolution: string
  resolved: boolean
  remainingConflicts: number
}

// 操作日志项，对应服务端 OperationLogEntry。
export interface OperationLogEntry {
  operation: string
  summary: string
  startedAt: number
  endedAt: number
  durationMs: number
  success: boolean
  errorMessage: string | null
}
