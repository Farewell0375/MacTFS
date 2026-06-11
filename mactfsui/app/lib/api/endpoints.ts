import { apiClient } from "./client"
import type {
  AppConfig,
  CheckMappingTargetResult,
  CheckinResult,
  Collection,
  ConflictInfo,
  ConflictResolution,
  ConflictResolutionResult,
  ConnectResult,
  FileContent,
  FileOperationResult,
  FolderDiffItem,
  GetLatestResult,
  HistoryEntry,
  ItemInfo,
  MappingInfo,
  OperationLogEntry,
  PendingChange,
  ServerItem,
  TextDiff,
  WorkspaceContext,
  WorkspaceInfo,
} from "./types"

// 文件类操作（checkout / add / delete / undo）的统一请求体。
type FileActionBody = { paths: string[]; recursive?: boolean }

/**
 * 读取服务端持久化配置。
 */
export function getConfig() {
  return apiClient.get<{ config: AppConfig }>("/api/config")
}

/**
 * 保存服务端持久化配置。
 */
export function saveConfig(config: AppConfig) {
  return apiClient.put<{ config: AppConfig }>("/api/config", { body: config })
}

/**
 * 使用给定连接信息连接 TFS，成功后服务端会保存配置并建立会话。
 */
export function connect(config: Partial<AppConfig> = {}) {
  return apiClient.post<ConnectResult>("/api/session/connect", { body: config })
}

/**
 * 列出当前账号可见的 Collection。
 */
export function listCollections() {
  return apiClient.get<{ collections: Collection[] }>("/api/collections")
}

/**
 * 浏览服务端目录树节点。
 */
export function getServerTree(params: { path?: string; collection?: string } = {}) {
  return apiClient.get<{ path: string; items: ServerItem[] }>("/api/server-tree", { query: params })
}

/**
 * 读取当前目录下一级文件与文件夹列表。
 */
export function getFolderItems(params: { path?: string; collection?: string } = {}) {
  return apiClient.get<{ path: string; items: ServerItem[] }>("/api/server-folder/items", { query: params })
}

/**
 * 读取当前 Workspace 名称与 Mapping 列表。
 */
export function getWorkspace() {
  return apiClient.get<{ workspace: string; mappings: MappingInfo[] }>("/api/workspace")
}

/**
 * 确保当前 Collection 的默认 Workspace 存在，必要时创建。
 */
export function ensureWorkspace(body: { collection?: string; workspace?: string; comment?: string } = {}) {
  return apiClient.post<{ workspace: WorkspaceInfo }>("/api/workspace/ensure", { body })
}

/**
 * 读取工作台固定上下文（serverUri / collection / workspace / mappings）。
 */
export function getWorkspaceContext() {
  return apiClient.get<{ context: WorkspaceContext }>("/api/workspace/context")
}

/**
 * 读取当前 Workspace 的 Mapping 列表。
 */
export function listMappings() {
  return apiClient.get<{ mappings: MappingInfo[] }>("/api/mappings")
}

/**
 * 预校验 Mapping 目标路径，返回最终本地目标路径及是否已存在。
 */
export function checkMappingTarget(body: { serverPath: string; localParentPath: string }) {
  return apiClient.post<CheckMappingTargetResult>("/api/mappings/check-target", { body })
}

/**
 * 创建 Mapping，可选立即 Get Latest。
 */
export function addMapping(body: { serverPath: string; localPath: string; getLatest?: boolean }) {
  return apiClient.post<{ mapping: MappingInfo; getLatest?: GetLatestResult }>("/api/mappings", { body })
}

/**
 * 删除 Mapping，仅解除映射不删除本地文件。
 */
export function deleteMapping(body: { serverPath?: string; localPath?: string }) {
  return apiClient.delete<{ mappings: MappingInfo[] }>("/api/mappings", { body })
}

/**
 * 获取指定服务端路径的最新文件。
 * force=false（默认）为安全模式，本地改动会产生冲突而不被覆盖；force=true 强制覆盖本地。
 */
export function getLatest(body: { serverPath?: string; recursive?: boolean; force?: boolean } = {}) {
  return apiClient.post<{ result: GetLatestResult }>("/api/files/get-latest", { body })
}

/**
 * 获取指定 changeset 版本并覆盖本地（对应 VS 的 Get Specific Version + Overwrite）。
 */
export function getVersion(body: { serverPath: string; changeset: number; recursive?: boolean }) {
  return apiClient.post<{ result: GetLatestResult }>("/api/files/get-version", { body })
}

/**
 * 对已存在文件或目录执行 checkout。
 */
export function checkout(body: FileActionBody) {
  return apiClient.post<{ result: FileOperationResult }>("/api/files/checkout", { body })
}

/**
 * 将本地新增文件加入 pending add。
 */
export function addFiles(body: FileActionBody) {
  return apiClient.post<{ result: FileOperationResult }>("/api/files/add", { body })
}

/**
 * 对已版本控制文件或目录执行 pending delete。
 */
export function deleteFiles(body: FileActionBody) {
  return apiClient.post<{ result: FileOperationResult }>("/api/files/delete", { body })
}

/**
 * 撤销指定路径上的挂起更改。
 */
export function undoFiles(body: FileActionBody) {
  return apiClient.post<{ result: FileOperationResult }>("/api/files/undo", { body })
}

/**
 * 重命名文件或目录（同目录改名），产生 rename 挂起更改。
 */
export function renameFile(body: { serverPath: string; newName: string }) {
  return apiClient.post<{ result: FileOperationResult }>("/api/files/rename", { body })
}

/**
 * 回滚变更集（只产生挂起更改）：single 仅反做该 changeset，toVersion 反做其后全部改动。
 */
export function rollback(body: { serverPath: string; mode: "single" | "toVersion"; changeset: number }) {
  return apiClient.post<{ result: GetLatestResult }>("/api/files/rollback", { body })
}

/**
 * 分支：把源路径分叉到目标路径（产生 branch 挂起更改），changeset 缺省为 latest。
 */
export function branch(body: { sourceServerPath: string; targetServerPath: string; changeset?: number }) {
  return apiClient.post<{ result: FileOperationResult }>("/api/files/branch", { body })
}

/**
 * 读取当前 Workspace 的挂起更改。
 */
export function getPendingChanges(params: { serverPath?: string } = {}) {
  return apiClient.get<{ pendingChanges: PendingChange[] }>("/api/pending-changes", { query: params })
}

/**
 * 提交带注释的签入，paths 为空时签入全部挂起更改。
 */
export function checkin(body: { paths?: string[]; comment: string }) {
  return apiClient.post<{ checkin: CheckinResult }>("/api/checkin", { body })
}

/**
 * 读取服务端对象（文件或目录）的属性信息，供属性弹窗展示。
 */
export function getItemInfo(params: { serverPath: string }) {
  return apiClient.get<{ item: ItemInfo }>("/api/items/info", { query: params })
}

/**
 * 读取服务器内容（latest 或指定 changeset），或读取本地映射文件内容。
 */
export function getFileContent(params: { serverPath?: string; localPath?: string; changeset?: number }) {
  return apiClient.get<{ content: FileContent }>("/api/files/content", { query: params })
}

/**
 * 对已映射目录执行目录对比。
 */
export function compareFolder(body: { serverPath: string; localPath?: string; recursive?: boolean }) {
  return apiClient.post<{ diffs: FolderDiffItem[] }>("/api/compare/folder", { body })
}

/**
 * 查询文件或目录历史。
 */
export function getHistory(params: { path: string; folder?: boolean }) {
  return apiClient.get<{ history: HistoryEntry[] }>("/api/history", { query: params })
}

/**
 * 查询指定 changeset 影响的文件列表。
 */
export function getChangesetFiles(params: { changeset: number }) {
  return apiClient.get<{ files: HistoryEntry[] }>("/api/history/changeset", { query: params })
}

/**
 * 生成本地文件与服务器 latest 的文本 Diff。
 */
export function diffLocalLatest(body: { serverPath: string; localPath: string }) {
  return apiClient.post<{ diff: TextDiff }>("/api/diff/local-latest", { body })
}

/**
 * 生成同一服务端文件两个 changeset 之间的文本 Diff。
 */
export function diffRevisions(body: { serverPath: string; sourceChangeset: number; targetChangeset: number }) {
  return apiClient.post<{ diff: TextDiff }>("/api/diff/revisions", { body })
}

/**
 * 查询当前 Workspace 的冲突明细。
 */
export function listConflicts(params: { serverPath?: string; recursive?: boolean } = {}) {
  return apiClient.get<{ conflicts: ConflictInfo[] }>("/api/conflicts", { query: params })
}

/**
 * 对单个冲突应用取舍（采用服务器版本或保留本地版本）。
 */
export function applyConflict(body: { conflictId: number; resolution: ConflictResolution }) {
  return apiClient.post<{ resolution: ConflictResolutionResult }>("/api/conflicts/apply", { body })
}

/**
 * 读取最近操作日志。
 */
export function getLogs() {
  return apiClient.get<{ logs: OperationLogEntry[] }>("/api/logs")
}
