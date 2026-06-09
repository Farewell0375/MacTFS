import { apiRequest } from "./client"

import type {
  AppConfig,
  AddMappingData,
  AddMappingRequest,
  CheckinData,
  CheckinRequest,
  ChangesetFilesData,
  CompareFolderData,
  CompareFolderRequest,
  CollectionsData,
  FileOperationData,
  FileOperationRequest,
  ConfigData,
  ConnectData,
  DiffLocalLatestRequest,
  DiffRevisionsRequest,
  GetLatestData,
  GetLatestRequest,
  HistoryData,
  MappingsData,
  MappingsRequest,
  OperationLogsData,
  PendingChangesData,
  PendingChangesRequest,
  ServerTreeData,
  TextDiffData,
} from "./types"

/**
 * 读取后端保存的默认连接配置，用于再次打开时回填表单。
 */
export function getConfig() {
  return apiRequest<ConfigData>("/api/config")
}

/**
 * 提交连接配置给后端；连接成功时后端会保存为默认配置。
 */
export function connectSession(config: AppConfig) {
  return apiRequest<ConnectData>("/api/session/connect", {
    method: "POST",
    body: config,
  })
}

/**
 * 加载当前连接可见的 TFS Collection 列表。
 */
export function listCollections() {
  return apiRequest<CollectionsData>("/api/collections")
}

/**
 * 加载指定 Collection 和服务端路径下的目录节点。
 */
export function listServerTree(path: string, collection?: string) {
  const params = new URLSearchParams({ path })
  if (collection) {
    params.set("collection", collection)
  }

  return apiRequest<ServerTreeData>(`/api/server-tree?${params.toString()}`)
}

/**
 * 加载当前 Workspace 的 Mapping 列表，用于判断服务端项是否已映射到本地。
 */
export function listMappings(request: MappingsRequest = {}) {
  const params = new URLSearchParams()
  if (request.collection) {
    params.set("collection", request.collection)
  }

  const query = params.toString()
  return apiRequest<MappingsData>(
    query ? `/api/mappings?${query}` : "/api/mappings"
  )
}

/**
 * 加载指定目录下一级文件和文件夹，供中间文件列表展示。
 */
export function listServerFolderItems(path: string, collection?: string) {
  const params = new URLSearchParams({ path })
  if (collection) {
    params.set("collection", collection)
  }

  return apiRequest<ServerTreeData>(
    `/api/server-folder/items?${params.toString()}`
  )
}

/**
 * 创建服务端路径到本地目录的 Mapping，可选择保存后立即 Get Latest。
 */
export function addMapping(request: AddMappingRequest) {
  return apiRequest<AddMappingData>("/api/mappings", {
    method: "POST",
    body: request,
  })
}

/**
 * 对已映射目录执行元数据级目录对比，返回差异文件状态列表。
 */
export function compareFolder(request: CompareFolderRequest) {
  return apiRequest<CompareFolderData>("/api/compare/folder", {
    method: "POST",
    body: request,
  })
}

/**
 * 查询当前 Workspace 的挂起更改列表，供右侧 Inspector 分组展示。
 */
export function listPendingChanges(request: PendingChangesRequest = {}) {
  const params = new URLSearchParams()
  if (request.collection) {
    params.set("collection", request.collection)
  }
  if (request.serverPath) {
    params.set("serverPath", request.serverPath)
  }

  const query = params.toString()
  return apiRequest<PendingChangesData>(
    query ? `/api/pending-changes?${query}` : "/api/pending-changes"
  )
}

/**
 * 获取指定服务端路径的最新版本，目录按 recursive 参数递归。
 */
export function getLatest(request: GetLatestRequest) {
  return apiRequest<GetLatestData>("/api/files/get-latest", {
    method: "POST",
    body: request,
  })
}

/**
 * 对已映射且本地存在的文件或目录执行 checkout。
 */
export function checkoutFiles(request: FileOperationRequest) {
  return apiRequest<FileOperationData>("/api/files/checkout", {
    method: "POST",
    body: request,
  })
}

/**
 * 将本地新增文件加入 pending add。
 */
export function addFiles(request: FileOperationRequest) {
  return apiRequest<FileOperationData>("/api/files/add", {
    method: "POST",
    body: request,
  })
}

/**
 * 对已版本控制文件或目录执行 pending delete。
 */
export function deleteFiles(request: FileOperationRequest) {
  return apiRequest<FileOperationData>("/api/files/delete", {
    method: "POST",
    body: request,
  })
}

/**
 * 撤销指定路径上的 pending changes。
 */
export function undoFiles(request: FileOperationRequest) {
  return apiRequest<FileOperationData>("/api/files/undo", {
    method: "POST",
    body: request,
  })
}

/**
 * 将 Included Changes 对应的 serverPaths 提交到 TFS。
 */
export function checkin(request: CheckinRequest) {
  return apiRequest<CheckinData>("/api/checkin", {
    method: "POST",
    body: request,
  })
}

/**
 * 查询文件或目录最近历史记录。
 */
export function queryHistory(path: string, folder: boolean) {
  const params = new URLSearchParams({ path, folder: String(folder) })
  return apiRequest<HistoryData>(`/api/history?${params.toString()}`)
}

/**
 * 查询指定 changeset 影响的文件列表。
 */
export function queryChangesetFiles(changeset: number) {
  const params = new URLSearchParams({ changeset: String(changeset) })
  return apiRequest<ChangesetFilesData>(
    `/api/history/changeset?${params.toString()}`
  )
}

/**
 * 生成本地文件和服务器 latest 之间的文本 diff。
 */
export function diffLocalLatest(request: DiffLocalLatestRequest) {
  return apiRequest<TextDiffData>("/api/diff/local-latest", {
    method: "POST",
    body: request,
  })
}

/**
 * 生成同一服务端文件两个历史版本之间的文本 diff。
 */
export function diffRevisions(request: DiffRevisionsRequest) {
  return apiRequest<TextDiffData>("/api/diff/revisions", {
    method: "POST",
    body: request,
  })
}

/**
 * 读取本地 API 服务最近操作日志，供底部 Console 手动刷新。
 */
export function listOperationLogs() {
  return apiRequest<OperationLogsData>("/api/logs")
}
