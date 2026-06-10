import { useEffect, useMemo, useState } from "react"
import { FileText, FolderClosed, Loader2 } from "lucide-react"

import { FileTargetMenu } from "~/components/app/file-target-menu"
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
}: {
  session: WorkspaceSession
  selectedServerPath: string
  pendingByServerPath: Record<string, string>
  refreshToken: number
  onNavigate: (serverPath: string) => void
  onFileAction: (target: FileTarget, action: FileActionId) => void
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

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b px-3">
        <span className="shrink-0 text-xs text-muted-foreground">当前路径</span>
        <span className="min-w-0 truncate font-mono text-xs">{selectedServerPath}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {currentLocalPath ? (
            <span className="font-mono">{currentLocalPath}</span>
          ) : (
            "未映射到本地"
          )}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            正在加载目录…
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center p-6 text-sm text-destructive">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            当前目录为空
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
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
              {rows.map((row) => {
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
                    className="cursor-default select-none"
                    onClick={() => setSelectedItemPath(row.item.serverPath)}
                    onContextMenu={() => setSelectedItemPath(row.item.serverPath)}
                    onDoubleClick={() => {
                      if (row.item.folder) {
                        onNavigate(row.item.serverPath)
                      }
                    }}
                  >
                    <TableCell className="py-1.5">
                      <span className="flex items-center gap-1.5" title={row.item.serverPath}>
                        {row.item.folder ? (
                          <FolderClosed className="size-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate text-sm">{row.item.name}</span>
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge
                        variant="secondary"
                        className={cn("rounded-md", statusBadgeClass(row.localState))}
                      >
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
