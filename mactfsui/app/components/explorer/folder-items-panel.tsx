import { useEffect, useMemo, useState } from "react"
import { AlertCircle, FolderOpen, RefreshCw } from "lucide-react"

import { Button } from "~/components/ui/button"

import { FileTargetMenu } from "~/components/app/file-target-menu"
import { FileIcon } from "~/components/explorer/file-icon"
import { Badge } from "~/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { api } from "~/lib/api"
import type { ServerItem } from "~/lib/api"
import { pathsExist } from "~/lib/electron"
import type { FileActionId, FileTarget, WorkspaceSession } from "~/lib/tfs"
import {
  makeFileTarget,
  resolveItemLocalState,
  resolveLocalPath,
  statusBadgeClass,
  statusLabel,
} from "~/lib/tfs"
import { cn, formatDateTime } from "~/lib/utils"

// 文件列表行：服务端目录项 + 推导出的本地路径与本地状态。
interface FolderItemRow {
  item: ServerItem
  localPath: string | null
  localState: string
}

/**
 * 中间主工作区：展示当前目录下一级文件 / 文件夹列表，
 * 单击选中、双击目录进入，行级右键菜单与左侧树共用同一套动作模型。
 */
export function FolderItemsPanel({
  session,
  selectedServerPath,
  pendingByServerPath,
  refreshToken,
  onNavigate,
  onFileAction,
  onRefresh,
}: {
  session: WorkspaceSession
  selectedServerPath: string
  pendingByServerPath: Record<string, string>
  refreshToken: number
  onNavigate: (serverPath: string) => void
  onFileAction: (target: FileTarget, action: FileActionId) => void
  onRefresh: () => void
}) {
  const [items, setItems] = useState<ServerItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItemPath, setSelectedItemPath] = useState<string | null>(null)
  // 本地路径 -> 是否存在；null 表示当前环境无法检测。
  const [existsMap, setExistsMap] = useState<Record<string, boolean> | null>(null)

  // 当前路径变化时加载目录内容，并批量检测映射目标的本地存在性。
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setSelectedItemPath(null)
    void (async () => {
      const result = await api.getFolderItems({
        path: selectedServerPath,
        collection: session.collection,
      })
      if (!active) {
        return
      }
      setLoading(false)
      if (!result.ok) {
        setItems([])
        setError(result.errorMessage ?? "目录加载失败")
        return
      }
      const list = result.data?.items ?? []
      setItems(list)
      const localPaths = list
        .map((item) => resolveLocalPath(session.mappings, item.serverPath))
        .filter((path): path is string => path != null)
      const exists = await pathsExist(localPaths)
      if (active) {
        setExistsMap(exists)
      }
    })()
    return () => {
      active = false
    }
  }, [selectedServerPath, session.collection, session.mappings, refreshToken])

  // 组合行数据：推导本地路径与 已映射 / 未映射 / 未下载 状态。
  const rows = useMemo<FolderItemRow[]>(
    () =>
      items.map((item) => {
        const localPath = resolveLocalPath(session.mappings, item.serverPath)
        const localExists =
          localPath == null || existsMap == null
            ? null
            : existsMap[localPath] ?? false
        return {
          item,
          localPath,
          localState: resolveItemLocalState(localPath != null, localExists),
        }
      }),
    [items, session.mappings, existsMap],
  )

  const currentLocalPath = resolveLocalPath(session.mappings, selectedServerPath)
  const selectedRow = rows.find((row) => row.item.serverPath === selectedItemPath)

  // 中间区域空白处右键的目标：当前目录本身（与目录树右键同一套菜单）。
  const currentFolderTarget = makeFileTarget({
    source: "list",
    folder: true,
    serverPath: selectedServerPath,
    mappings: session.mappings,
    pendingStatus: pendingByServerPath[selectedServerPath] ?? null,
  })

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-card">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b bg-muted/40 px-3">
        <span className="shrink-0 text-xs text-muted-foreground">当前路径</span>
        <span className="min-w-0 truncate font-mono text-xs">{selectedServerPath}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {currentLocalPath ? (
            <span className="font-mono">{currentLocalPath}</span>
          ) : (
            "未映射到本地"
          )}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          className="shrink-0"
          onClick={onRefresh}
          disabled={loading}
          aria-label="刷新当前目录"
          title="刷新当前目录"
        >
          <RefreshCw className={cn(loading && "animate-spin")} />
        </Button>
      </div>

      <FileTargetMenu target={currentFolderTarget} onAction={onFileAction}>
      {/* 由 table-container 自身承担纵横滚动：表头 sticky 不随内容滚走，横向滚动条始终贴可视区底部 */}
      <div className="min-h-0 flex-1 overflow-hidden [&_[data-slot=table-container]]:h-full [&_[data-slot=table-container]]:overflow-auto">
        {loading ? (
          <ItemsSkeleton />
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6">
            <AlertCircle className="size-8 text-destructive/60" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <FolderOpen className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">当前目录为空</p>
            <p className="text-xs text-muted-foreground/70">
              右键空白处可对当前目录执行获取、映射或添加本地文件
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-[oklch(0.972_0.003_286)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 text-xs text-muted-foreground">名称</TableHead>
                <TableHead className="h-8 w-24 text-xs text-muted-foreground">状态</TableHead>
                <TableHead className="h-8 w-20 text-right text-xs text-muted-foreground">
                  最新版本
                </TableHead>
                <TableHead className="h-8 w-36 text-xs text-muted-foreground">
                  上次签入时间
                </TableHead>
                <TableHead className="h-8 text-xs text-muted-foreground">本地路径</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => {
                const selected = row.item.serverPath === selectedItemPath
                const target = makeFileTarget({
                  source: "list",
                  folder: row.item.folder,
                  serverPath: row.item.serverPath,
                  mappings: session.mappings,
                  pendingStatus: pendingByServerPath[row.item.serverPath] ?? null,
                })
                return (
                  <FileTargetMenu
                    key={row.item.serverPath}
                    target={target}
                    onAction={onFileAction}
                  >
                  <TableRow
                    data-state={selected ? "selected" : undefined}
                    className="animate-in fade-in cursor-default select-none fill-mode-backwards duration-200"
                    style={{ animationDelay: `${Math.min(index, 12) * 18}ms` }}
                    onClick={() => setSelectedItemPath(row.item.serverPath)}
                    onContextMenu={(event) => {
                      // 阻止冒泡到外层「当前目录」菜单，避免双菜单。
                      event.stopPropagation()
                      setSelectedItemPath(row.item.serverPath)
                    }}
                    onDoubleClick={() => {
                      if (row.item.folder) {
                        onNavigate(row.item.serverPath)
                      }
                    }}
                  >
                    <TableCell className="py-1.5">
                      <span className="flex items-center gap-1.5" title={row.item.serverPath}>
                        <FileIcon
                          name={row.item.name}
                          folder={row.item.folder}
                          mapped={row.item.folder && row.localPath != null}
                        />
                        <span className="truncate text-sm">{row.item.name}</span>
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge
                        variant="secondary"
                        className={cn("gap-1.5 rounded-md", statusBadgeClass(row.localState))}
                      >
                        <span className="size-1.5 rounded-full bg-current opacity-60" />
                        {statusLabel(row.localState)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-xs">
                      {row.item.latestVersion > 0 ? row.item.latestVersion : "—"}
                    </TableCell>
                    <TableCell className="py-1.5 text-xs text-muted-foreground">
                      {formatDateTime(row.item.checkinDate)}
                    </TableCell>
                    <TableCell className="max-w-0 truncate py-1.5 font-mono text-xs text-muted-foreground">
                      {row.localPath ?? "—"}
                    </TableCell>
                  </TableRow>
                  </FileTargetMenu>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
      </FileTargetMenu>

      <div className="flex h-8 shrink-0 items-center gap-2 border-t px-3 text-xs text-muted-foreground">
        {selectedRow ? (
          <>
            <span className="font-medium text-foreground">{selectedRow.item.name}</span>
            <span className="truncate font-mono">{selectedRow.item.serverPath}</span>
            <span className="ml-auto shrink-0">
              {statusLabel(selectedRow.localState)}
              {selectedRow.item.latestVersion > 0 &&
                ` · 版本 ${selectedRow.item.latestVersion}`}
            </span>
          </>
        ) : (
          <span>
            {rows.length > 0 ? `${rows.length} 个对象 · 未选中` : "未选中对象"}
          </span>
        )}
      </div>
    </section>
  )
}

/**
 * 目录加载骨架屏：模拟表格行的占位条，替代纯文字 loading。
 */
function ItemsSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-3"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <span className="size-4 rounded bg-muted" />
          <span className="h-3.5 rounded bg-muted" style={{ width: `${160 + ((index * 53) % 120)}px` }} />
          <span className="h-3.5 w-14 rounded-full bg-muted" />
          <span className="ml-auto h-3 w-28 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
