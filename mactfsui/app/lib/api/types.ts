export interface ApiResult<TData = Record<string, unknown>> {
  success: boolean
  message: string
  errorMessage?: string
  operation: string
  startedAt: number
  endedAt: number
  durationMs: number
  logs: string[]
  data: TData
}

export interface HealthData {
  status: string
  host: string
  port: number
  tokenFile: string
  configFile: string
  connected: boolean
}

export interface MappingConfig {
  serverPath?: string
  localPath?: string
}

export interface TfsMappingInfo {
  serverPath: string
  localPath: string
}

export interface TfsWorkspaceInfo {
  name: string
  ownerName: string
  computer: string
  comment: string
  created: boolean
  mappings: TfsMappingInfo[]
}

export interface AppConfig {
  serverUri?: string
  authType?: string
  domain?: string
  username?: string
  password?: string
  collection?: string
  workspace?: string
  mappings?: MappingConfig[]
}

export interface ConfigData {
  config: AppConfig
}

export interface ConnectData {
  serverUri?: string
  collectionCount?: number
}

export interface WorkspaceContextRequest {
  collection: string
}

export interface WorkspaceContextData {
  collection: string
  workspace?: TfsWorkspaceInfo
  mappings: TfsMappingInfo[]
}

export interface TfsCollectionInfo {
  name: string
  id: string
}

export interface TfsServerItem {
  name: string
  path: string
  serverPath: string
  type: "folder" | "file"
  folder: boolean
  latestVersion: number
  checkinDate?: number | null
}

export interface CollectionsData {
  collections: TfsCollectionInfo[]
}

export interface ServerTreeData {
  path: string
  items: TfsServerItem[]
}

export interface MappingsData {
  mappings: TfsMappingInfo[]
}

export interface MappingsRequest {
  collection?: string
}

export interface AddMappingRequest {
  serverPath: string
  localPath: string
  getLatest: boolean
}

export interface AddMappingData {
  mapping?: TfsMappingInfo
  getLatest?: unknown
}

export type FolderDiffStatus =
  | "localModified"
  | "remoteChanged"
  | "bothChanged"
  | "localOnly"
  | "remoteOnly"
  | "notDownloaded"
  | "localDeleted"
  | "pendingEdit"
  | "pendingAdd"
  | "pendingDelete"
  | "upToDate"

export interface CompareFolderRequest {
  serverPath: string
  localPath: string
  recursive: boolean
}

export interface FolderDiffItem {
  serverPath: string
  localPath: string
  name: string
  folder: boolean
  status: FolderDiffStatus
  localVersion: number
  latestVersion: number
}

export interface CompareFolderData {
  diffs: FolderDiffItem[]
}

export type PendingChangeStatus =
  | "pendingEdit"
  | "pendingAdd"
  | "pendingDelete"
  | "pendingRename"
  | "pending"

export interface TfsPendingChangeInfo {
  serverPath: string
  localPath: string
  name: string
  folder: boolean
  status: PendingChangeStatus
  changeType: string
  version: number
}

export interface PendingChangesData {
  pendingChanges: TfsPendingChangeInfo[]
}

export interface PendingChangesRequest {
  collection?: string
  serverPath?: string
}

export interface GetLatestRequest {
  serverPath: string
  recursive: boolean
}

export interface TfsGetLatestResult {
  updated: number
  operations: number
  conflicts: number
  failures: number
  skipped?: string[]
  conflictDetails?: TfsConflictInfo[]
}

export interface GetLatestData {
  result?: TfsGetLatestResult
}

export interface FileOperationRequest {
  paths: string[]
  recursive?: boolean
}

export interface TfsFileOperationResult {
  operation: string
  affected: number
  failures: string[]
  skipped?: string[]
  conflictDetails?: TfsConflictInfo[]
}

export interface FileOperationData {
  result?: TfsFileOperationResult
}

export interface CheckinRequest {
  serverPaths: string[]
  comment: string
}

export interface TfsCheckinResult {
  changeset: number
  submittedChanges: number
}

export interface CheckinData {
  checkin?: TfsCheckinResult
}

export interface TfsHistoryEntry {
  serverPath: string
  name: string
  changeType: string
  itemType: string
  changeset: number
  author: string
  date?: number | null
  comment: string
}

export interface HistoryData {
  history: TfsHistoryEntry[]
}

export interface ChangesetFilesData {
  files: TfsHistoryEntry[]
}

export interface DiffLocalLatestRequest {
  serverPath: string
  localPath: string
}

export interface DiffRevisionsRequest {
  serverPath: string
  sourceChangeset: number
  targetChangeset: number
}

export interface TfsTextDiff {
  sourceLabel: string
  targetLabel: string
  lines: string[]
}

export interface TextDiffData {
  diff?: TfsTextDiff
}

export interface TfsFileContent {
  serverPath: string
  localPath?: string
  changeset: number
  source: "local" | "server"
  size: number
  binary: boolean
  renderable: boolean
  encoding: string
  content: string
}

export interface FileContentRequest {
  serverPath: string
  localPath?: string
  preferLocal?: boolean
}

export interface FileContentData {
  file?: TfsFileContent
}

export interface TfsConflictInfo {
  serverPath: string
  localPath?: string
  fileSize: number
  binary: boolean
  renderable: boolean
  autoMergeable: boolean
  reason: string
}

export interface ApplyConflictChoiceRequest {
  serverPath: string
  choice: "useServer" | "keepLocal" | "autoMerge"
}

export interface TfsOperationLogEntry {
  operation: string
  summary: string
  startedAt: number
  endedAt: number
  durationMs: number
  success: boolean
  errorMessage?: string
}

export interface OperationLogsData {
  logs: TfsOperationLogEntry[]
}
