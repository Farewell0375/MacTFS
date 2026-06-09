import { useEffect, useState } from "react"
import { FileText, Folder, GitCompareArrows, Loader2, RefreshCw } from "lucide-react"

import { ContextMenu } from "~/components/app/context-menu"
import type { ContextMenuItem, ContextMenuState } from "~/components/app/context-menu"
import { Button } from "~/components/ui/button"
import {
  addFiles,
  checkoutFiles,
  compareFolder,
  deleteFiles,
  getLatest,
  undoFiles,
} from "~/lib/api/endpoints"
import type { FolderDiffItem, FolderDiffStatus } from "~/lib/api/types"

interface FolderCompareDialogProps {
  serverPath: string
  localPath: string
  open: boolean
  onPendingChangesRefresh(): void
  onOpenDiff(diff: FolderDiffItem): void
}

const STATUS_LABELS: Record<FolderDiffStatus, string> = {
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

/**
 * 展示已映射目录的差异结果，并通过右键菜单执行差异项操作。
 */
export function FolderCompareDialog({
  serverPath,
  localPath,
  open,
  onPendingChangesRefresh,
  onOpenDiff,
}: FolderCompareDialogProps) {
  const [diffs, setDiffs] = useState<FolderDiffItem[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [hideUpToDate, setHideUpToDate] = useState(true)
  const [loading, setLoading] = useState(false)
  const [operationPath, setOperationPath] = useState("")
  const [message, setMessage] = useState("")
  const [menu, setMenu] = useState<ContextMenuState>()

  useEffect(() => {
    if (open) {
      loadCompare()
    }
  }, [open, serverPath, localPath])

  const visibleDiffs = diffs.filter((diff) => {
    if (hideUpToDate && diff.status === "upToDate") {
      return false
    }
    return statusFilter === "all" || diff.status === statusFilter
  })

  /**
   * 调用目录对比 API，返回当前本地目录与服务器目录的元数据差异。
   */
  async function loadCompare() {
    setLoading(true)
    setMessage("")
    const result = await compareFolder({
      serverPath,
      localPath,
      recursive: true,
    })
    setLoading(false)

    if (!result.success) {
      setDiffs([])
      setMessage(result.errorMessage || result.message)
      return
    }

    setDiffs(result.data.diffs)
    setMessage(
      result.data.diffs.length
        ? `发现 ${result.data.diffs.length} 个差异。`
        : "未发现差异。"
    )
  }

  /**
   * 执行单个目录对比差异项上的文件操作，完成后保留用户重新对比入口。
   */
  async function runDiffAction(action: string, diff: FolderDiffItem) {
    setOperationPath(diff.serverPath)
    setMessage("")
    const result =
      action === "getLatest"
        ? await getLatest({
            serverPath: diff.serverPath,
            recursive: diff.folder,
          })
        : action === "checkout"
          ? await checkoutFiles({
              paths: [diff.serverPath],
              recursive: diff.folder,
            })
          : action === "add"
            ? await addFiles({
                paths: [diff.localPath],
                recursive: diff.folder,
              })
            : action === "delete"
              ? await deleteFiles({
                  paths: [diff.serverPath],
                  recursive: diff.folder,
                })
              : await undoFiles({
                  paths: [diff.serverPath],
                  recursive: diff.folder,
                })
    setOperationPath("")

    if (!result.success) {
      setMessage(result.errorMessage || result.message)
      return
    }

    if (action !== "getLatest") {
      onPendingChangesRefresh()
    }
    setMessage("操作完成，请重新对比刷新差异。")
  }

  /**
   * 根据差异状态生成右键菜单项，避免不可执行状态展示错误操作。
   */
  function buildMenuItems(diff: FolderDiffItem): ContextMenuItem[] {
    return [
      {
        key: "diff",
        label: "比较本地与服务器 Latest",
        hidden:
          diff.folder ||
          !["localModified", "remoteChanged", "bothChanged", "pendingEdit"].includes(
            diff.status
          ),
        onSelect: () => onOpenDiff(diff),
      },
      {
        key: "getLatest",
        label: "获取最新版本",
        hidden: !["remoteChanged", "remoteOnly", "notDownloaded"].includes(diff.status),
        onSelect: () => runDiffAction("getLatest", diff),
      },
      {
        key: "checkout",
        label: "签出",
        hidden: !["localModified"].includes(diff.status),
        onSelect: () => runDiffAction("checkout", diff),
      },
      {
        key: "add",
        label: "新增本地文件到服务器",
        hidden: diff.status !== "localOnly",
        onSelect: () => runDiffAction("add", diff),
      },
      {
        key: "delete",
        label: "删除",
        hidden: diff.status !== "localDeleted",
        danger: true,
        onSelect: () => runDiffAction("delete", diff),
      },
      {
        key: "undo",
        label: "撤销挂起更改",
        hidden: !diff.status.startsWith("pending"),
        onSelect: () => runDiffAction("undo", diff),
      },
    ]
  }

  if (!open) {
    return null
  }

  return (
    <div className="flex h-[min(720px,calc(100svh-96px))] min-h-0 flex-col">
      <ContextMenu menu={menu} onClose={() => setMenu(undefined)} />
      <div className="flex min-h-10 shrink-0 items-center justify-between gap-3 border-b px-3 text-xs">
        <div className="min-w-0 truncate font-mono text-muted-foreground">
          {localPath}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label className="flex items-center gap-1.5 text-muted-foreground">
            <input
              type="checkbox"
              checked={hideUpToDate}
              onChange={(event) => setHideUpToDate(event.target.checked)}
            />
            隐藏已同步
          </label>
          <select
            className="h-7 rounded-[6px] border bg-background px-2"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">全部状态</option>
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" disabled={loading} onClick={loadCompare}>
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            重新对比
          </Button>
        </div>
      </div>

      {message && (
        <div className="border-b bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
          {message}
        </div>
      )}

      <div className="grid h-8 shrink-0 grid-cols-[minmax(160px,1fr)_128px_minmax(260px,1.4fr)_80px_80px] border-b bg-muted/20 px-3 text-xs font-medium text-muted-foreground">
        <div className="flex items-center">名称</div>
        <div className="flex items-center">状态</div>
        <div className="flex items-center">服务端路径</div>
        <div className="flex items-center">本地版本</div>
        <div className="flex items-center">最新版本</div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {visibleDiffs.map((diff) => (
          <div
            key={diff.serverPath}
            className="grid h-8 grid-cols-[minmax(160px,1fr)_128px_minmax(260px,1.4fr)_80px_80px] items-center border-b px-3 text-xs hover:bg-muted/50"
            onContextMenu={(event) => {
              event.preventDefault()
              setMenu({
                x: event.clientX,
                y: event.clientY,
                items: buildMenuItems(diff),
              })
            }}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              {operationPath === diff.serverPath ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin" />
              ) : diff.folder ? (
                <Folder className="size-3.5 shrink-0 text-amber-600" />
              ) : (
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{diff.name}</span>
            </div>
            <div className="truncate">{STATUS_LABELS[diff.status]}</div>
            <div className="truncate font-mono text-muted-foreground">
              {diff.serverPath}
            </div>
            <div className="font-mono text-muted-foreground">
              {diff.localVersion}
            </div>
            <div className="font-mono text-muted-foreground">
              {diff.latestVersion}
            </div>
          </div>
        ))}
        {visibleDiffs.length === 0 && !loading && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            当前筛选无差异项
          </div>
        )}
        {loading && (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <GitCompareArrows className="size-4" />
            正在对比
          </div>
        )}
      </div>
    </div>
  )
}
