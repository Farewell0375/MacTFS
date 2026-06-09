import { useEffect, useState } from "react"
import {
  Download,
  FileText,
  Folder,
  FolderPlus,
  GitCompareArrows,
  History,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react"

import { Button } from "~/components/ui/button"
import { DiffPanel } from "~/components/explorer/diff-panel"
import type { DiffPanelRequest } from "~/components/explorer/diff-panel"
import { HistoryPanel } from "~/components/explorer/history-panel"
import {
  addMapping,
  addFiles,
  checkoutFiles,
  compareFolder,
  deleteFiles,
  getLatest,
  listMappings,
  listServerFolderItems,
  undoFiles,
} from "~/lib/api/endpoints"
import type {
  FolderDiffItem,
  FolderDiffStatus,
  TfsMappingInfo,
  TfsServerItem,
} from "~/lib/api/types"
import { getMactfsBridge } from "~/lib/electron/bridge"

interface FolderItemsPanelProps {
  connected: boolean
  collection: string
  serverPath: string
  actionKey: string
  onPendingChangesRefresh(): void
  onPathEnter(path: string): void
  onSelectedMappedItemChange(mapped: boolean): void
}

interface FolderItemView {
  item: TfsServerItem
  mapping?: TfsMappingInfo
  localPath: string
  mapped: boolean
  status: string
}

interface HistoryTarget {
  path: string
  folder: boolean
  label: string
}

const DIFF_STATUS_LABELS: Record<FolderDiffStatus, string> = {
  localModified: "本地修改",
  remoteChanged: "服务端有更新",
  bothChanged: "本地和服务端都变更",
  localOnly: "本地新增",
  remoteOnly: "服务端新增",
  notDownloaded: "未下载",
  localDeleted: "本地删除",
  pendingEdit: "已签出编辑",
  pendingAdd: "待新增",
  pendingDelete: "待删除",
  upToDate: "已同步",
}

const DIFF_STATUS_CLASSES: Record<FolderDiffStatus, string> = {
  localModified: "border-blue-200 bg-blue-50 text-blue-700",
  remoteChanged: "border-violet-200 bg-violet-50 text-violet-700",
  bothChanged: "border-red-200 bg-red-50 text-red-700",
  localOnly: "border-green-200 bg-green-50 text-green-700",
  remoteOnly: "border-violet-200 bg-violet-50 text-violet-700",
  notDownloaded: "border-amber-200 bg-amber-50 text-amber-700",
  localDeleted: "border-red-200 bg-red-50 text-red-700",
  pendingEdit: "border-blue-200 bg-blue-50 text-blue-700",
  pendingAdd: "border-green-200 bg-green-50 text-green-700",
  pendingDelete: "border-red-200 bg-red-50 text-red-700",
  upToDate: "border-border bg-muted/30 text-muted-foreground",
}

const DIFF_ACTIONS: Record<FolderDiffStatus, string[]> = {
  localModified: ["checkout", "diff"],
  localOnly: ["add", "delete local"],
  localDeleted: ["delete", "restore from server"],
  remoteChanged: ["get latest", "diff"],
  remoteOnly: ["get latest"],
  notDownloaded: ["get latest"],
  pendingEdit: ["checkin", "undo", "diff"],
  pendingAdd: ["checkin", "undo"],
  pendingDelete: ["checkin", "undo"],
  bothChanged: ["diff", "手工处理"],
  upToDate: [],
}

type FileOperationAction = "getLatest" | "checkout" | "add" | "delete" | "undo"

const FILE_OPERATION_LABELS: Record<FileOperationAction, string> = {
  getLatest: "Get Latest",
  checkout: "Checkout",
  add: "Add",
  delete: "Delete",
  undo: "Undo",
}

const DIFF_FILE_ACTIONS: Record<FolderDiffStatus, FileOperationAction[]> = {
  localModified: ["checkout"],
  localOnly: ["add"],
  localDeleted: ["delete"],
  remoteChanged: ["getLatest"],
  remoteOnly: ["getLatest"],
  notDownloaded: ["getLatest"],
  pendingEdit: ["undo"],
  pendingAdd: ["undo"],
  pendingDelete: ["undo"],
  bothChanged: [],
  upToDate: [],
}

/**
 * 根据当前服务端目录展示下一级文件和文件夹，并结合 Mapping 计算本地路径与状态。
 */
export function FolderItemsPanel({
  connected,
  collection,
  serverPath,
  actionKey,
  onPendingChangesRefresh,
  onPathEnter,
  onSelectedMappedItemChange,
}: FolderItemsPanelProps) {
  const [items, setItems] = useState<TfsServerItem[]>([])
  const [mappings, setMappings] = useState<TfsMappingInfo[]>([])
  const [selectedPath, setSelectedPath] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [mappingOpen, setMappingOpen] = useState(false)
  const [mappingLocalPath, setMappingLocalPath] = useState("")
  const [mappingGetLatest, setMappingGetLatest] = useState(false)
  const [mappingSaving, setMappingSaving] = useState(false)
  const [mappingMessage, setMappingMessage] = useState("")
  const [diffs, setDiffs] = useState<FolderDiffItem[]>([])
  const [selectedDiffKeys, setSelectedDiffKeys] = useState<string[]>([])
  const [hideUpToDate, setHideUpToDate] = useState(true)
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareMessage, setCompareMessage] = useState("")
  const [operationLoading, setOperationLoading] = useState("")
  const [operationMessage, setOperationMessage] = useState("")
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget>()
  const [diffRequest, setDiffRequest] = useState<DiffPanelRequest>()
  const [latestSyncedPaths, setLatestSyncedPaths] = useState<string[]>([])

  useEffect(() => {
    onSelectedMappedItemChange(false)
    if (!connected || !collection || !serverPath) {
      setItems([])
      setMappings([])
      setSelectedPath("")
      setDiffs([])
      setSelectedDiffKeys([])
      setCompareMessage("")
      setOperationMessage("")
      setHistoryTarget(undefined)
      setDiffRequest(undefined)
      return
    }

    setItems([])
    setSelectedPath("")
    loadFolderItems()
    setMappingOpen(false)
    setMappingLocalPath("")
    setMappingMessage("")
    setDiffs([])
    setSelectedDiffKeys([])
    setHideUpToDate(true)
    setCompareMessage("")
    setOperationMessage("")
    setHistoryTarget(undefined)
    setDiffRequest(undefined)
  }, [connected, collection, serverPath])

  /**
   * 加载当前目录下一级服务端项，并同步读取 Mapping 供状态展示。
   */
  async function loadFolderItems() {
    const requestServerPath = serverPath
    const requestCollection = collection
    setLoading(true)
    setErrorMessage("")

    const itemResult = await listServerFolderItems(
      requestServerPath,
      requestCollection
    )
    const mappingResult = await listMappings({ collection: requestCollection })

    if (requestServerPath !== serverPath || requestCollection !== collection) {
      return
    }

    setLoading(false)

    if (!itemResult.success) {
      setItems([])
      setErrorMessage(itemResult.errorMessage || itemResult.message)
      return
    }

    setItems(itemResult.data.items)
    setMappings(mappingResult.success ? mappingResult.data.mappings : [])
    setErrorMessage(
      mappingResult.success
        ? ""
        : mappingResult.errorMessage || mappingResult.message
    )
  }

  /**
   * 查找覆盖当前服务端路径的最长 Mapping。
   */
  function findMapping(serverItemPath: string) {
    return mappings
      .filter((mapping) =>
        isSameOrChildPath(serverItemPath, mapping.serverPath)
      )
      .sort(
        (left, right) => right.serverPath.length - left.serverPath.length
      )[0]
  }

  /**
   * 判断服务端路径是否等于 Mapping 根路径或位于其子目录下。
   */
  function isSameOrChildPath(serverItemPath: string, mappingPath: string) {
    const itemPath = serverItemPath.toLowerCase()
    const rootPath = mappingPath.toLowerCase()

    return itemPath === rootPath || itemPath.startsWith(`${rootPath}/`)
  }

  /**
   * 按 Mapping 根路径计算服务端项对应的本地路径。
   */
  function toMappedLocalPath(
    serverItemPath: string,
    mapping?: TfsMappingInfo
  ) {
    if (!mapping) {
      return "-"
    }

    const relativePath = serverItemPath
      .slice(mapping.serverPath.length)
      .replace(/^\//, "")

    return relativePath
      ? `${mapping.localPath}/${relativePath}`
      : mapping.localPath
  }

  /**
   * 按 Mapping 根路径计算服务端项对应的本地路径。
   */
  function toLocalPath(item: TfsServerItem, mapping?: TfsMappingInfo) {
    return toMappedLocalPath(item.serverPath, mapping)
  }

  /**
   * 生成中间列表展示用结构。
   */
  function toFolderItemView(item: TfsServerItem): FolderItemView {
    const mapping = findMapping(item.serverPath)
    const mapped = Boolean(mapping)
    const synced = latestSyncedPaths.some((path) =>
      isSameOrChildPath(item.serverPath, path)
    )

    return {
      item,
      mapping,
      localPath: toLocalPath(item, mapping),
      mapped,
      status: mapped ? (synced ? "upToDate / 已同步" : "notDownloaded / 未下载") : "未映射",
    }
  }

  /**
   * 打开指定服务端路径的历史记录面板。
   */
  function openHistory(path: string, folder: boolean, label: string) {
    setHistoryTarget({ path, folder, label })
  }

  const viewItems = items.map(toFolderItemView)
  const currentMapping = serverPath ? findMapping(serverPath) : undefined
  const currentDirectoryMapped = Boolean(currentMapping)
  const currentDirectoryLocalPath = toMappedLocalPath(
    serverPath,
    currentMapping
  )
  const selectedItem = viewItems.find(
    (viewItem) => viewItem.item.serverPath === selectedPath
  )
  const visibleDiffs = hideUpToDate
    ? diffs.filter((diff) => diff.status !== "upToDate")
    : diffs
  const selectedDiffs = diffs.filter((diff) =>
    selectedDiffKeys.includes(toDiffKey(diff))
  )
  const selectedDiffTargets = selectedDiffs.filter(canOpenLocalLatestDiff)
  const selectedFileActions = (
    ["getLatest", "checkout", "add", "delete", "undo"] as FileOperationAction[]
  ).filter((action) => getDiffsForAction(action).length > 0)
  const allVisibleDiffsSelected =
    visibleDiffs.length > 0 &&
    visibleDiffs.every((diff) =>
      selectedDiffKeys.includes(toDiffKey(diff))
    )

  useEffect(() => {
    onSelectedMappedItemChange(Boolean(selectedItem?.mapped))
  }, [selectedItem?.mapped])

  useEffect(() => {
    if (!actionKey) {
      return
    }

    if (actionKey.startsWith("getLatest:")) {
      runSelectedItemGetLatest()
      return
    }

    if (actionKey.startsWith("history:")) {
      openHistory(
        selectedItem?.item.serverPath || serverPath,
        selectedItem?.item.folder ?? true,
        selectedItem?.item.serverPath || serverPath
      )
    }
  }, [actionKey])

  /**
   * 通过 Electron 主进程选择本地目录。
   */
  async function selectLocalDirectory() {
    const directory = await getMactfsBridge()?.selectDirectory()
    if (directory) {
      setMappingLocalPath(directory)
    }
  }

  /**
   * 创建当前服务端目录到本地目录的 Mapping，成功后刷新列表状态。
   */
  async function createMapping() {
    if (!mappingLocalPath) {
      setMappingMessage("请选择本地目录。")
      return
    }

    setMappingSaving(true)
    setMappingMessage("")

    const result = await addMapping({
      serverPath,
      localPath: mappingLocalPath,
      getLatest: mappingGetLatest,
    })
    setMappingSaving(false)

    if (!result.success) {
      setMappingMessage(result.errorMessage || result.message)
      return
    }

    setMappingOpen(false)
    setMappingLocalPath("")
    setMappingMessage("Mapping 已创建。")
    await loadFolderItems()
  }

  /**
   * 使用服务端路径作为差异项选择 key，保证本地新增项也能稳定勾选。
   */
  function toDiffKey(diff: FolderDiffItem) {
    return diff.serverPath
  }

  /**
   * 调用目录对比 API，返回期间保留明确的 TFS 网络等待提示。
   */
  async function runFolderCompare() {
    if (!currentDirectoryMapped) {
      setCompareMessage("当前目录未映射，不能执行目录对比。")
      return
    }

    setCompareLoading(true)
    setCompareMessage("")
    setSelectedDiffKeys([])

    const result = await compareFolder({
      serverPath,
      localPath: currentDirectoryLocalPath,
      recursive: true,
    })
    setCompareLoading(false)

    if (!result.success) {
      setDiffs([])
      setCompareMessage(result.errorMessage || result.message)
      return
    }

    setDiffs(result.data.diffs)
    setCompareMessage(
      result.data.diffs.length
        ? `目录对比完成，发现 ${result.data.diffs.length} 个差异。`
        : "目录对比完成，未发现差异。"
    )
  }

  /**
   * 进入中间文件列表中的目录，供深层路径不依赖左侧树直接导航。
   */
  function enterFolder(item: TfsServerItem) {
    if (item.folder) {
      onPathEnter(item.serverPath)
    }
  }

  /**
   * 记录本次 UI 会话中已完成 Get Latest 的路径，避免刷新后继续显示旧未下载状态。
   */
  function markLatestSynced(path: string) {
    setLatestSyncedPaths((currentPaths) =>
      currentPaths.includes(path) ? currentPaths : [...currentPaths, path]
    )
  }

  /**
   * 勾选或取消勾选单个差异项，供后续文件操作任务使用选择结果。
   */
  function toggleDiffSelection(diff: FolderDiffItem, checked: boolean) {
    const key = toDiffKey(diff)

    setSelectedDiffKeys((currentKeys) =>
      checked
        ? Array.from(new Set([...currentKeys, key]))
        : currentKeys.filter((currentKey) => currentKey !== key)
    )
  }

  /**
   * 批量勾选或取消当前筛选后的差异项，不影响被 upToDate 筛选隐藏的项。
   */
  function toggleVisibleDiffSelection(checked: boolean) {
    const visibleKeys = visibleDiffs.map(toDiffKey)

    setSelectedDiffKeys((currentKeys) =>
      checked
        ? Array.from(new Set([...currentKeys, ...visibleKeys]))
        : currentKeys.filter((currentKey) => !visibleKeys.includes(currentKey))
    )
  }

  /**
   * 从已选差异中筛出指定文件操作可处理的项。
   */
  function getDiffsForAction(action: FileOperationAction) {
    return selectedDiffs.filter((diff) =>
      DIFF_FILE_ACTIONS[diff.status].includes(action)
    )
  }

  /**
   * 判断目录对比差异项是否支持打开本地文件和服务器 latest 的文本 Diff。
   */
  function canOpenLocalLatestDiff(diff: FolderDiffItem) {
    return (
      !diff.folder &&
      Boolean(diff.localPath) &&
      (diff.status === "localModified" ||
        diff.status === "remoteChanged" ||
        diff.status === "pendingEdit" ||
        diff.status === "bothChanged")
    )
  }

  /**
   * 从目录对比结果打开单个文件的本地 vs latest Diff 面板。
   */
  function openLocalLatestDiff(diff: FolderDiffItem) {
    setDiffRequest({
      type: "localLatest",
      serverPath: diff.serverPath,
      localPath: diff.localPath,
      label: `${diff.serverPath} 本地 ↔ Latest`,
    })
  }

  /**
   * 执行目录对比结果上的文件操作，成功后提示用户重新 Compare。
   */
  async function runDiffFileOperation(action: FileOperationAction) {
    const targets = getDiffsForAction(action)
    if (targets.length === 0) {
      return
    }

    const hasFolder = targets.some((target) => target.folder)
    if (
      action === "checkout" &&
      hasFolder &&
      !window.confirm(
        `将递归签出 ${targets.length} 个已版本控制项，是否继续？`
      )
    ) {
      return
    }

    setOperationLoading(action)
    setOperationMessage("")

    let affected = 0
    for (const target of targets) {
      if (action === "getLatest") {
        const result = await getLatest({
          serverPath: target.serverPath,
          recursive: target.folder,
        })

        if (!result.success) {
          setOperationLoading("")
          setOperationMessage(result.errorMessage || result.message)
          return
        }

        affected += result.data.result?.operations ?? 0
      } else {
        const result =
          action === "checkout"
            ? await checkoutFiles({
                paths: [target.serverPath],
                recursive: target.folder,
              })
            : action === "add"
              ? await addFiles({
                  paths: [target.localPath],
                  recursive: target.folder,
                })
              : action === "delete"
                ? await deleteFiles({
                    paths: [target.serverPath],
                    recursive: target.folder,
                  })
                : await undoFiles({
                    paths: [target.serverPath],
                    recursive: target.folder,
                  })

        if (!result.success) {
          setOperationLoading("")
          setOperationMessage(result.errorMessage || result.message)
          return
        }

        affected += result.data.result?.affected ?? 0
      }
    }

    setOperationLoading("")
    setOperationMessage(
      `${FILE_OPERATION_LABELS[action]} 完成，处理 ${targets.length} 项，影响 ${affected} 项。请重新 Compare 刷新差异。`
    )

    if (action === "getLatest") {
      for (const target of targets) {
        markLatestSynced(target.serverPath)
      }
      setDiffs([])
      setSelectedDiffKeys([])
      await loadFolderItems()
    } else {
      onPendingChangesRefresh()
    }
  }

  /**
   * 对文件列表中选中的项执行 Get Latest，并刷新当前目录列表。
   */
  async function runSelectedItemGetLatest() {
    if (!selectedItem) {
      return
    }

    setOperationLoading("selectedGetLatest")
    setOperationMessage("")

    const result = await getLatest({
      serverPath: selectedItem.item.serverPath,
      recursive: selectedItem.item.folder,
    })
    setOperationLoading("")

    if (!result.success) {
      setOperationMessage(result.errorMessage || result.message)
      return
    }

    setOperationMessage(
      `Get Latest 完成，操作 ${result.data.result?.operations ?? 0} 项。`
    )
    markLatestSynced(selectedItem.item.serverPath)
    setDiffs([])
    setSelectedDiffKeys([])
    await loadFolderItems()
  }

  /**
   * 对文件列表中选中的已映射项执行 checkout，目录操作前要求用户确认。
   */
  async function runSelectedItemCheckout() {
    if (!selectedItem) {
      return
    }

    if (
      selectedItem.item.folder &&
      !window.confirm("将递归签出 1 个已版本控制目录，是否继续？")
    ) {
      return
    }

    setOperationLoading("selectedCheckout")
    setOperationMessage("")

    const result = await checkoutFiles({
      paths: [selectedItem.item.serverPath],
      recursive: selectedItem.item.folder,
    })
    setOperationLoading("")

    if (!result.success) {
      setOperationMessage(result.errorMessage || result.message)
      return
    }

    setOperationMessage(
      `Checkout 完成，影响 ${result.data.result?.affected ?? 0} 项。`
    )
    onPendingChangesRefresh()
  }

  if (!connected) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        未连接
      </div>
    )
  }

  if (!serverPath) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        未选择服务端目录
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 items-center justify-between gap-3 border-b bg-muted/10 px-3">
        <div className="min-w-0 truncate font-mono text-xs text-muted-foreground">
          {serverPath}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!currentDirectoryMapped && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => setMappingOpen((open) => !open)}
            >
              <FolderPlus />
              映射到本地
            </Button>
          )}
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              加载中
            </div>
          )}
        </div>
      </div>

      {(mappingOpen || mappingMessage || currentMapping) && (
        <div className="grid gap-2 border-b bg-muted/10 px-3 py-2 text-xs">
          {currentMapping ? (
            <div className="truncate text-muted-foreground">
              当前目录已映射：{currentDirectoryLocalPath}
            </div>
          ) : (
            mappingOpen && (
              <div className="grid gap-2">
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    className="h-7 rounded-[6px] border bg-background px-2 font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    value={mappingLocalPath}
                    placeholder="选择本地目录"
                    onChange={(event) =>
                      setMappingLocalPath(event.target.value)
                    }
                  />
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={selectLocalDirectory}
                  >
                    选择目录
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={mappingGetLatest}
                      onChange={(event) =>
                        setMappingGetLatest(event.target.checked)
                      }
                    />
                    立即 Get Latest
                  </label>
                  <Button
                    size="xs"
                    disabled={mappingSaving}
                    onClick={createMapping}
                  >
                    {mappingSaving && <Loader2 className="animate-spin" />}
                    创建 Mapping
                  </Button>
                </div>
              </div>
            )
          )}
          {mappingMessage && (
            <div className="truncate text-muted-foreground">
              {mappingMessage}
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="border-b bg-background">
        <div className="flex min-h-9 items-center justify-between gap-3 px-3 py-1.5 text-xs">
          <div className="min-w-0">
            <div className="font-medium">目录对比</div>
            <div className="truncate font-mono text-muted-foreground">
              {currentDirectoryMapped
                ? currentDirectoryLocalPath
                : "当前目录未映射，不能执行对比"}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={() => openHistory(serverPath, true, serverPath)}
            >
              <History />
              History
            </Button>
            {currentDirectoryMapped && (
              <>
                <label className="flex items-center gap-1.5 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={hideUpToDate}
                    onChange={(event) =>
                      setHideUpToDate(event.target.checked)
                    }
                  />
                  隐藏 upToDate
                </label>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={compareLoading}
                  onClick={runFolderCompare}
                >
                  {compareLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <GitCompareArrows />
                  )}
                  Compare
                </Button>
              </>
            )}
          </div>
        </div>

        {compareLoading && (
          <div className="flex items-center gap-2 border-t bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            正在执行目录对比，TFS 网络请求可能需要一段时间。
          </div>
        )}

        {compareMessage && (
          <div className="border-t bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
            {compareMessage}
          </div>
        )}

        {operationMessage && (
          <div className="border-t bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
            {operationMessage}
          </div>
        )}

        {currentDirectoryMapped && diffs.length > 0 && (
          <div className="grid max-h-72 border-t md:grid-cols-[minmax(0,1fr)_260px]">
            <div className="min-h-0 overflow-auto">
              <div className="min-w-[900px]">
                <div className="grid h-7 grid-cols-[32px_minmax(130px,1fr)_122px_minmax(210px,1.2fr)_76px_76px_minmax(160px,1fr)] border-b bg-muted/20 px-3 text-xs font-medium text-muted-foreground">
                  <label className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={allVisibleDiffsSelected}
                      disabled={visibleDiffs.length === 0}
                      aria-label="勾选当前筛选差异"
                      onChange={(event) =>
                        toggleVisibleDiffSelection(event.target.checked)
                      }
                    />
                  </label>
                  <div className="flex items-center">名称</div>
                  <div className="flex items-center">状态</div>
                  <div className="flex items-center">服务端路径</div>
                  <div className="flex items-center">本地版本</div>
                  <div className="flex items-center">最新版本</div>
                  <div className="flex items-center">可用操作</div>
                </div>

                {visibleDiffs.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-muted-foreground">
                    当前筛选无差异项。
                  </div>
                ) : (
                  visibleDiffs.map((diff) => (
                    <div
                      key={toDiffKey(diff)}
                      className="grid h-8 grid-cols-[32px_minmax(130px,1fr)_122px_minmax(210px,1.2fr)_76px_76px_minmax(160px,1fr)] items-center border-b px-3 text-xs"
                    >
                      <label className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedDiffKeys.includes(toDiffKey(diff))}
                          aria-label={`选择 ${diff.name}`}
                          onChange={(event) =>
                            toggleDiffSelection(diff, event.target.checked)
                          }
                        />
                      </label>
                      <div className="flex min-w-0 items-center gap-1.5">
                        {diff.folder ? (
                          <Folder className="size-3.5 shrink-0 text-amber-600" />
                        ) : (
                          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{diff.name}</span>
                      </div>
                      <div className="min-w-0">
                        <span
                          className={`inline-flex max-w-full truncate rounded-[6px] border px-1.5 py-0.5 ${DIFF_STATUS_CLASSES[diff.status]}`}
                        >
                          {diff.status} / {DIFF_STATUS_LABELS[diff.status]}
                        </span>
                      </div>
                      <div className="truncate font-mono text-muted-foreground">
                        {diff.serverPath}
                      </div>
                      <div className="font-mono text-muted-foreground">
                        {diff.localVersion}
                      </div>
                      <div className="font-mono text-muted-foreground">
                        {diff.latestVersion}
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-1">
                        {DIFF_ACTIONS[diff.status].map((action) => (
                          <span
                            key={action}
                            className="rounded-[6px] border bg-background px-1.5 py-0.5 text-muted-foreground"
                          >
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="min-h-0 border-t bg-muted/10 p-2 text-xs md:border-t-0 md:border-l">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-medium">已选差异</span>
                <span className="rounded-[6px] border bg-background px-1.5 py-0.5 text-muted-foreground">
                  {selectedDiffs.length} 项
                </span>
              </div>
              {selectedDiffs.length === 0 ? (
                <div className="text-muted-foreground">
                  勾选差异文件后查看可用操作。
                </div>
              ) : (
                <div className="grid max-h-56 gap-2 overflow-auto">
                  {(selectedFileActions.length > 0 ||
                    selectedDiffs.length > 0) && (
                    <div className="flex flex-wrap gap-1 border-b pb-2">
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={selectedDiffTargets.length !== 1}
                        title="选择一个可对比文件后打开 Diff"
                        onClick={() => {
                          const [target] = selectedDiffTargets
                          if (target) {
                            openLocalLatestDiff(target)
                          }
                        }}
                      >
                        <GitCompareArrows />
                        Diff
                      </Button>
                      {selectedFileActions.map((action) => (
                        <Button
                          key={action}
                          size="xs"
                          variant="outline"
                          disabled={Boolean(operationLoading)}
                          onClick={() => runDiffFileOperation(action)}
                        >
                          {operationLoading === action ? (
                            <Loader2 className="animate-spin" />
                          ) : action === "getLatest" ? (
                            <Download />
                          ) : action === "checkout" ? (
                            <Pencil />
                          ) : action === "add" ? (
                            <Plus />
                          ) : action === "delete" ? (
                            <Trash2 />
                          ) : (
                            <RotateCcw />
                          )}
                          {FILE_OPERATION_LABELS[action]}
                        </Button>
                      ))}
                    </div>
                  )}
                  {selectedDiffs.map((diff) => (
                    <div
                      key={toDiffKey(diff)}
                      className="grid gap-1 border-b pb-2 last:border-b-0 last:pb-0"
                    >
                      <div className="truncate font-mono">{diff.name}</div>
                      <div className="flex flex-wrap gap-1">
                        {DIFF_ACTIONS[diff.status].map((action) => (
                          <span
                            key={action}
                            className="rounded-[6px] border bg-background px-1.5 py-0.5 text-muted-foreground"
                          >
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {historyTarget && (
        <HistoryPanel
          path={historyTarget.path}
          folder={historyTarget.folder}
          label={historyTarget.label}
          onOpenDiff={setDiffRequest}
          onClose={() => setHistoryTarget(undefined)}
        />
      )}

      {diffRequest && (
        <DiffPanel
          request={diffRequest}
          onClose={() => setDiffRequest(undefined)}
        />
      )}

      <div className="grid h-8 grid-cols-[minmax(150px,1fr)_80px_minmax(220px,1.2fr)_minmax(180px,1.1fr)_86px_130px] border-b bg-muted/20 px-3 text-xs font-medium text-muted-foreground">
        <div className="flex items-center">名称</div>
        <div className="flex items-center">类型</div>
        <div className="flex items-center">服务端路径</div>
        <div className="flex items-center">本地路径</div>
        <div className="flex items-center">映射</div>
        <div className="flex items-center">状态</div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {viewItems.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            当前目录无可显示项
          </div>
        ) : (
          viewItems.map((viewItem) => (
            <button
              key={viewItem.item.serverPath}
              className={`grid h-8 w-full grid-cols-[minmax(150px,1fr)_80px_minmax(220px,1.2fr)_minmax(180px,1.1fr)_86px_130px] items-center gap-0 border-b px-3 text-left text-xs ${
                selectedPath === viewItem.item.serverPath
                  ? "bg-primary/10"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => setSelectedPath(viewItem.item.serverPath)}
              onDoubleClick={() => enterFolder(viewItem.item)}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                {viewItem.item.folder ? (
                  <Folder className="size-3.5 shrink-0 text-amber-600" />
                ) : (
                  <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate" title={viewItem.item.name}>
                  {viewItem.item.name}
                </span>
              </div>
              <div className="text-muted-foreground">
                {viewItem.item.folder ? "目录" : "文件"}
              </div>
              <div
                className="truncate font-mono text-muted-foreground"
                title={viewItem.item.serverPath}
              >
                {viewItem.item.serverPath}
              </div>
              <div
                className="truncate font-mono text-muted-foreground"
                title={viewItem.localPath}
              >
                {viewItem.localPath}
              </div>
              <div>{viewItem.mapped ? "已映射" : "未映射"}</div>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`truncate rounded-[6px] border px-1.5 py-0.5 ${
                    viewItem.status.startsWith("upToDate")
                      ? "text-muted-foreground"
                      : viewItem.mapped
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "text-muted-foreground"
                  }`}
                >
                  {viewItem.status}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="flex h-10 items-center justify-between border-t bg-muted/10 px-3 text-xs text-muted-foreground">
        <span>已选中：{selectedPath || "-"}</span>
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="outline"
            disabled={!selectedItem}
            onClick={() =>
              selectedItem &&
              openHistory(
                selectedItem.item.serverPath,
                selectedItem.item.folder,
                selectedItem.item.serverPath
              )
            }
          >
            <History />
            History
          </Button>
          {selectedItem?.mapped && (
            <>
              <Button
                size="xs"
                variant="outline"
                disabled={!selectedPath || Boolean(operationLoading)}
                onClick={runSelectedItemGetLatest}
              >
                {operationLoading === "selectedGetLatest" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Download />
                )}
                Get Latest
              </Button>
              <Button
                size="xs"
                variant="outline"
                disabled={!selectedPath || Boolean(operationLoading)}
                onClick={runSelectedItemCheckout}
              >
                {operationLoading === "selectedCheckout" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Pencil />
                )}
                Checkout
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
