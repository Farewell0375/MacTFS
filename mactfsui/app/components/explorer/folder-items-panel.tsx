import { useEffect, useState } from "react"
import { FileText, Folder, Loader2, RefreshCw } from "lucide-react"

import { ContextMenu } from "~/components/app/context-menu"
import type { ContextMenuItem, ContextMenuState } from "~/components/app/context-menu"
import { SimpleDialog } from "~/components/app/simple-dialog"
import { Button } from "~/components/ui/button"
import { ConflictDialog } from "~/components/explorer/conflict-dialog"
import { DiffPanel } from "~/components/explorer/diff-panel"
import type { DiffPanelRequest } from "~/components/explorer/diff-panel"
import { FileViewerDialog } from "~/components/explorer/file-viewer-dialog"
import { FolderCompareDialog } from "~/components/explorer/folder-compare-dialog"
import { HistoryPanel } from "~/components/explorer/history-panel"
import { MappingDialog } from "~/components/explorer/mapping-dialog"
import {
  checkoutFiles,
  deleteFiles,
  getLatest,
  listMappings,
  listPendingChanges,
  listServerFolderItems,
  undoFiles,
} from "~/lib/api/endpoints"
import type {
  FolderDiffItem,
  TfsConflictInfo,
  TfsMappingInfo,
  TfsPendingChangeInfo,
  TfsServerItem,
} from "~/lib/api/types"

interface FolderItemsPanelProps {
  connected: boolean
  collection: string
  serverPath: string
  refreshKey: number
  onPendingChangesRefresh(): void
  onPathEnter(path: string): void
  onSelectedMappedItemChange(mapped: boolean): void
}

interface FolderItemView {
  item: TfsServerItem
  mapping?: TfsMappingInfo
  pending?: TfsPendingChangeInfo
  localPath: string
  mapped: boolean
  status: string
}

interface HistoryTarget {
  path: string
  folder: boolean
  label: string
}

interface FileViewTarget {
  serverPath: string
  localPath?: string
  preferLocal: boolean
}

/**
 * 展示当前目录下一级文件和文件夹，复杂对象操作通过右键菜单和弹窗编排。
 */
export function FolderItemsPanel({
  connected,
  collection,
  serverPath,
  refreshKey,
  onPendingChangesRefresh,
  onPathEnter,
  onSelectedMappedItemChange,
}: FolderItemsPanelProps) {
  const [items, setItems] = useState<TfsServerItem[]>([])
  const [mappings, setMappings] = useState<TfsMappingInfo[]>([])
  const [pendingChanges, setPendingChanges] = useState<TfsPendingChangeInfo[]>([])
  const [selectedPath, setSelectedPath] = useState("")
  const [loading, setLoading] = useState(false)
  const [operationPath, setOperationPath] = useState("")
  const [message, setMessage] = useState("")
  const [menu, setMenu] = useState<ContextMenuState>()
  const [mappingPath, setMappingPath] = useState("")
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget>()
  const [fileViewTarget, setFileViewTarget] = useState<FileViewTarget>()
  const [compareTarget, setCompareTarget] = useState<FolderItemView>()
  const [diffRequest, setDiffRequest] = useState<DiffPanelRequest>()
  const [conflicts, setConflicts] = useState<TfsConflictInfo[]>([])

  useEffect(() => {
    onSelectedMappedItemChange(false)
    if (!connected || !collection || !serverPath) {
      setItems([])
      setMappings([])
      setPendingChanges([])
      setSelectedPath("")
      return
    }

    setSelectedPath("")
    loadFolderItems()
  }, [connected, collection, serverPath, refreshKey])

  const viewItems = items.map(toFolderItemView)
  const currentMapping = findMapping(serverPath)
  const currentDirectoryLocalPath = toMappedLocalPath(serverPath, currentMapping)
  const selectedItem = viewItems.find(
    (viewItem) => viewItem.item.serverPath === selectedPath
  )

  useEffect(() => {
    onSelectedMappedItemChange(Boolean(selectedItem?.mapped))
  }, [selectedItem?.mapped])

  /**
   * 加载当前目录 items、Workspace mappings 和 pending changes，用于表格状态和菜单判断。
   */
  async function loadFolderItems() {
    const requestServerPath = serverPath
    const requestCollection = collection
    setLoading(true)
    setMessage("")

    const itemResult = await listServerFolderItems(
      requestServerPath,
      requestCollection
    )
    const mappingResult = await listMappings({ collection: requestCollection })
    const pendingResult = await listPendingChanges({
      collection: requestCollection,
      serverPath: requestServerPath,
    })
    setLoading(false)

    if (requestServerPath !== serverPath || requestCollection !== collection) {
      return
    }

    if (!itemResult.success) {
      setItems([])
      setMessage(itemResult.errorMessage || itemResult.message)
      return
    }

    setItems(itemResult.data.items)
    setMappings(mappingResult.success ? mappingResult.data.mappings : [])
    setPendingChanges(
      pendingResult.success ? pendingResult.data.pendingChanges : []
    )
    setMessage(
      mappingResult.success
        ? pendingResult.success
          ? ""
          : pendingResult.errorMessage || pendingResult.message
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
      .sort((left, right) => right.serverPath.length - left.serverPath.length)[0]
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
   * 查找当前项上的 pending change，目录按包含关系判断。
   */
  function findPendingChange(item: TfsServerItem) {
    return pendingChanges.find((change) =>
      item.folder
        ? isSameOrChildPath(change.serverPath, item.serverPath)
        : change.serverPath === item.serverPath
    )
  }

  /**
   * 生成中间列表展示用结构。
   */
  function toFolderItemView(item: TfsServerItem): FolderItemView {
    const mapping = findMapping(item.serverPath)
    const pending = findPendingChange(item)

    return {
      item,
      mapping,
      pending,
      localPath: toMappedLocalPath(item.serverPath, mapping),
      mapped: Boolean(mapping),
      status: pending?.status || (mapping ? "mapped" : "unmapped"),
    }
  }

  /**
   * 打开文件或文件夹历史弹窗。
   */
  function openHistory(path: string, folder: boolean) {
    setHistoryTarget({
      path,
      folder,
      label: path,
    })
  }

  /**
   * 执行 Get Latest，并在后端返回冲突明细时打开统一冲突弹窗。
   */
  async function runGetLatest(viewItem: FolderItemView) {
    setOperationPath(viewItem.item.serverPath)
    setMessage("")
    const result = await getLatest({
      serverPath: viewItem.item.serverPath,
      recursive: viewItem.item.folder,
    })
    setOperationPath("")

    const conflictDetails = result.data.result?.conflictDetails || []
    if (conflictDetails.length > 0) {
      setConflicts(conflictDetails)
      return
    }

    if (!result.success) {
      setMessage(result.errorMessage || result.message)
      return
    }

    await loadFolderItems()
  }

  /**
   * 执行 checkout，目录递归操作前使用原生确认减少误操作。
   */
  async function runCheckout(viewItem: FolderItemView) {
    if (
      viewItem.item.folder &&
      !window.confirm("将递归签出当前目录，是否继续？")
    ) {
      return
    }

    setOperationPath(viewItem.item.serverPath)
    setMessage("")
    const result = await checkoutFiles({
      paths: [viewItem.item.serverPath],
      recursive: viewItem.item.folder,
    })
    setOperationPath("")

    const conflictDetails = result.data.result?.conflictDetails || []
    if (conflictDetails.length > 0) {
      setConflicts(conflictDetails)
      return
    }

    if (!result.success) {
      setMessage(result.errorMessage || result.message)
      return
    }

    onPendingChangesRefresh()
    await loadFolderItems()
  }

  /**
   * 对版本控制项执行 pending delete。
   */
  async function runDelete(viewItem: FolderItemView) {
    setOperationPath(viewItem.item.serverPath)
    setMessage("")
    const result = await deleteFiles({
      paths: [viewItem.item.serverPath],
      recursive: viewItem.item.folder,
    })
    setOperationPath("")

    if (!result.success) {
      setMessage(result.errorMessage || result.message)
      return
    }

    onPendingChangesRefresh()
    await loadFolderItems()
  }

  /**
   * 撤销当前对象上的 pending change。
   */
  async function runUndo(viewItem: FolderItemView) {
    setOperationPath(viewItem.item.serverPath)
    setMessage("")
    const result = await undoFiles({
      paths: [viewItem.item.serverPath],
      recursive: viewItem.item.folder,
    })
    setOperationPath("")

    if (!result.success) {
      setMessage(result.errorMessage || result.message)
      return
    }

    onPendingChangesRefresh()
    await loadFolderItems()
  }

  /**
   * 根据对象状态生成右键菜单，保持 pending add/edit 等判断集中在列表项模型上。
   */
  function buildMenuItems(viewItem: FolderItemView): ContextMenuItem[] {
    const pendingAdd = viewItem.pending?.status === "pendingAdd"
    const pendingEdit = viewItem.pending?.status === "pendingEdit"

    return [
      {
        key: "open",
        label: viewItem.item.folder ? "打开" : "查看",
        onSelect: () =>
          viewItem.item.folder
            ? onPathEnter(viewItem.item.serverPath)
            : setFileViewTarget({
                serverPath: viewItem.item.serverPath,
                localPath: viewItem.mapped ? viewItem.localPath : undefined,
                preferLocal: viewItem.mapped,
              }),
      },
      {
        key: "getLatest",
        label: "获取最新版本",
        disabled: !viewItem.mapped || pendingEdit,
        onSelect: () => runGetLatest(viewItem),
      },
      {
        key: "checkout",
        label: "签出",
        disabled: !viewItem.mapped || pendingAdd,
        onSelect: () => runCheckout(viewItem),
      },
      {
        key: "add",
        label: "新增本地文件到服务器",
        hidden: !viewItem.item.folder,
        disabled: !viewItem.mapped,
        onSelect: () => setCompareTarget(viewItem),
      },
      {
        key: "delete",
        label: "删除",
        disabled: pendingAdd,
        danger: true,
        onSelect: () => runDelete(viewItem),
      },
      {
        key: "undo",
        label: "撤销挂起更改",
        disabled: !viewItem.pending,
        onSelect: () => runUndo(viewItem),
      },
      {
        key: "history",
        label: "查看历史",
        onSelect: () => openHistory(viewItem.item.serverPath, viewItem.item.folder),
      },
      {
        key: "compareFolder",
        label: "与服务器目录对比",
        hidden: !viewItem.item.folder,
        disabled: !viewItem.mapped,
        onSelect: () => setCompareTarget(viewItem),
      },
      {
        key: "diffLatest",
        label: "比较本地与服务器 Latest",
        hidden: viewItem.item.folder || pendingAdd,
        disabled: !viewItem.mapped,
        onSelect: () =>
          setDiffRequest({
            type: "localLatest",
            serverPath: viewItem.item.serverPath,
            localPath: viewItem.localPath,
            label: `${viewItem.item.serverPath} 本地 ↔ Latest`,
          }),
      },
      {
        key: "mapping",
        label: "映射到本地",
        hidden: viewItem.mapped,
        disabled: !viewItem.item.folder,
        onSelect: () => setMappingPath(viewItem.item.serverPath),
      },
    ]
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
      <ContextMenu menu={menu} onClose={() => setMenu(undefined)} />

      <div className="flex h-9 items-center justify-between gap-3 border-b bg-muted/10 px-3">
        <div className="min-w-0 truncate font-mono text-xs text-muted-foreground">
          {serverPath}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!currentMapping && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => setMappingPath(serverPath)}
            >
              映射到本地
            </Button>
          )}
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={loading}
            title="刷新当前目录"
            onClick={loadFolderItems}
          >
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          </Button>
        </div>
      </div>

      <div className="flex h-8 items-center gap-3 border-b px-3 text-xs text-muted-foreground">
        <span className="truncate font-mono">
          {currentMapping ? currentDirectoryLocalPath : "当前目录未映射"}
        </span>
        {message && <span className="truncate text-destructive">{message}</span>}
      </div>

      <div className="grid h-8 grid-cols-[minmax(170px,1fr)_80px_minmax(260px,1.3fr)_minmax(220px,1.1fr)_100px] border-b bg-muted/20 px-3 text-xs font-medium text-muted-foreground">
        <div className="flex items-center">名称</div>
        <div className="flex items-center">类型</div>
        <div className="flex items-center">服务端路径</div>
        <div className="flex items-center">本地路径</div>
        <div className="flex items-center">状态</div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {viewItems.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            当前目录无可显示项
          </div>
        ) : (
          viewItems.map((viewItem) => (
            <div
              key={viewItem.item.serverPath}
              className={`grid h-8 grid-cols-[minmax(170px,1fr)_80px_minmax(260px,1.3fr)_minmax(220px,1.1fr)_100px] items-center border-b px-3 text-left text-xs ${
                selectedPath === viewItem.item.serverPath
                  ? "bg-primary/10"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => setSelectedPath(viewItem.item.serverPath)}
              onDoubleClick={() =>
                viewItem.item.folder && onPathEnter(viewItem.item.serverPath)
              }
              onContextMenu={(event) => {
                event.preventDefault()
                setSelectedPath(viewItem.item.serverPath)
                setMenu({
                  x: event.clientX,
                  y: event.clientY,
                  items: buildMenuItems(viewItem),
                })
              }}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                {operationPath === viewItem.item.serverPath ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                ) : viewItem.item.folder ? (
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
              <div className="truncate">{viewItem.status}</div>
            </div>
          ))
        )}
      </div>

      <SimpleDialog
        open={Boolean(mappingPath)}
        title="Mapping"
        description={mappingPath}
        className="w-[min(680px,calc(100vw-48px))]"
        onClose={() => setMappingPath("")}
      >
        <MappingDialog
          open={Boolean(mappingPath)}
          serverPath={mappingPath}
          onClose={() => setMappingPath("")}
          onSaved={loadFolderItems}
        />
      </SimpleDialog>

      <SimpleDialog
        open={Boolean(historyTarget)}
        title="History"
        description={historyTarget?.label}
        onClose={() => setHistoryTarget(undefined)}
      >
        {historyTarget && (
          <HistoryPanel
            path={historyTarget.path}
            folder={historyTarget.folder}
            label={historyTarget.label}
            onOpenDiff={setDiffRequest}
            onClose={() => setHistoryTarget(undefined)}
          />
        )}
      </SimpleDialog>

      <SimpleDialog
        open={Boolean(fileViewTarget)}
        title="File Viewer"
        description={fileViewTarget?.serverPath}
        onClose={() => setFileViewTarget(undefined)}
      >
        {fileViewTarget && (
          <FileViewerDialog
            open={Boolean(fileViewTarget)}
            serverPath={fileViewTarget.serverPath}
            localPath={fileViewTarget.localPath}
            preferLocal={fileViewTarget.preferLocal}
            onClose={() => setFileViewTarget(undefined)}
          />
        )}
      </SimpleDialog>

      <SimpleDialog
        open={Boolean(compareTarget)}
        title="Folder Compare"
        description={compareTarget?.item.serverPath}
        onClose={() => setCompareTarget(undefined)}
      >
        {compareTarget && (
          <FolderCompareDialog
            open={Boolean(compareTarget)}
            serverPath={compareTarget.item.serverPath}
            localPath={compareTarget.localPath}
            onPendingChangesRefresh={onPendingChangesRefresh}
            onOpenDiff={(diff: FolderDiffItem) =>
              setDiffRequest({
                type: "localLatest",
                serverPath: diff.serverPath,
                localPath: diff.localPath,
                label: `${diff.serverPath} 本地 ↔ Latest`,
              })
            }
          />
        )}
      </SimpleDialog>

      <SimpleDialog
        open={Boolean(diffRequest)}
        title="Diff"
        description={diffRequest?.label}
        onClose={() => setDiffRequest(undefined)}
      >
        {diffRequest && (
          <DiffPanel
            request={diffRequest}
            onClose={() => setDiffRequest(undefined)}
          />
        )}
      </SimpleDialog>

      <SimpleDialog
        open={conflicts.length > 0}
        title="Resolve Conflicts"
        onClose={() => setConflicts([])}
      >
        <ConflictDialog
          open={conflicts.length > 0}
          conflicts={conflicts}
          onOpenDiff={(conflict) =>
            conflict.localPath &&
            setDiffRequest({
              type: "localLatest",
              serverPath: conflict.serverPath,
              localPath: conflict.localPath,
              label: `${conflict.serverPath} 本地 ↔ Latest`,
            })
          }
          onApplied={() => {
            setConflicts([])
            onPendingChangesRefresh()
            loadFolderItems()
          }}
        />
      </SimpleDialog>
    </div>
  )
}
