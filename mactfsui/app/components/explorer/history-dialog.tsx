import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, CloudDownload, Loader2 } from "lucide-react"

import { ConfirmDialog } from "~/components/app/confirm-dialog"
import { FileViewDialog } from "~/components/explorer/file-view-dialog"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { api } from "~/lib/api"
import type { HistoryEntry } from "~/lib/api"
import { formatDateTime } from "~/lib/utils"

// 历史弹窗当前查看的目标（支持从 changeset 文件下钻到单文件历史后返回）。
interface HistoryTarget {
  serverPath: string
  folder: boolean
}

// 「获取此版本」待确认信息。
interface VersionConfirm {
  serverPath: string
  changeset: number
  folder: boolean
}

/**
 * History 弹窗：展示文件或目录历史（最近记录）。
 * 目录历史可下钻 changeset 影响文件；changeset 文件支持右键查看此版本 /
 * 查看该文件历史（可返回）/ 获取此版本；文件历史可勾选两个版本进入版本对比；
 * 每条记录支持「获取此版本…」（确认后用该版本覆盖本地）。
 */
export function HistoryDialog({
  serverPath,
  folder,
  onClose,
  onDiffRevisions,
  onGetVersion,
}: {
  serverPath: string
  folder: boolean
  onClose: () => void
  onDiffRevisions?: (serverPath: string, source: number, target: number) => void
  onGetVersion?: (serverPath: string, changeset: number, folder: boolean) => Promise<boolean>
}) {
  const [target, setTarget] = useState<HistoryTarget>({ serverPath, folder })
  // 下钻历史目标栈：从 changeset 文件进入单文件历史后可逐级返回。
  const [targetStack, setTargetStack] = useState<HistoryTarget[]>([])
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 目录历史下钻：当前查看的 changeset 文件列表，null 表示在历史主列表。
  const [changesetFiles, setChangesetFiles] = useState<{
    changeset: number
    files: HistoryEntry[]
  } | null>(null)
  const [filesLoading, setFilesLoading] = useState(false)
  // 文件历史勾选的 changeset（最多两个），用于版本对比。
  const [selected, setSelected] = useState<number[]>([])
  const [confirmVersion, setConfirmVersion] = useState<VersionConfirm | null>(null)
  // 「查看此版本内容」叠加的文件查看弹窗目标。
  const [viewVersion, setViewVersion] = useState<{ serverPath: string; changeset: number } | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      const result = await api.getHistory({ path: target.serverPath, folder: target.folder })
      if (!active) {
        return
      }
      setLoading(false)
      if (!result.ok) {
        setError(result.errorMessage ?? "历史加载失败")
        return
      }
      setError(null)
      setEntries(result.data?.history ?? [])
    })()
    return () => {
      active = false
    }
  }, [target])

  /**
   * 目录历史下钻：加载指定 changeset 影响的文件列表。
   */
  const openChangeset = useCallback(async (changeset: number) => {
    setFilesLoading(true)
    const result = await api.getChangesetFiles({ changeset })
    setFilesLoading(false)
    if (!result.ok) {
      setError(result.errorMessage ?? "Changeset 文件加载失败")
      return
    }
    setError(null)
    setChangesetFiles({ changeset, files: result.data?.files ?? [] })
  }, [])

  /**
   * 从 changeset 文件切换到该文件的历史（压栈当前目标，可返回）。
   */
  const openFileHistory = useCallback(
    (fileServerPath: string) => {
      setTargetStack((prev) => [...prev, target])
      setTarget({ serverPath: fileServerPath, folder: false })
      setChangesetFiles(null)
      setSelected([])
    },
    [target],
  )

  /**
   * 返回上一级历史目标。
   */
  const backToPreviousTarget = useCallback(() => {
    setTargetStack((prev) => {
      const next = [...prev]
      const previous = next.pop()
      if (previous) {
        setTarget(previous)
        setChangesetFiles(null)
        setSelected([])
      }
      return next
    })
  }, [])

  /**
   * 勾选 / 取消勾选用于对比的 changeset，最多保留两个（先进先出）。
   */
  const toggleSelected = useCallback((changeset: number) => {
    setSelected((prev) => {
      if (prev.includes(changeset)) {
        return prev.filter((item) => item !== changeset)
      }
      const next = [...prev, changeset]
      return next.length > 2 ? next.slice(next.length - 2) : next
    })
  }, [])

  const canDiff = onDiffRevisions != null && !target.folder && selected.length === 2

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[88svh] max-h-[88svh] flex-col sm:max-w-[88vw]">
        <DialogHeader>
          <DialogTitle>
            {changesetFiles ? `Changeset ${changesetFiles.changeset} 的文件` : "历史记录"}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {target.serverPath}
          </DialogDescription>
        </DialogHeader>

        {(changesetFiles || targetStack.length > 0) && (
          <div className="flex items-center gap-2">
            {changesetFiles && (
              <Button variant="ghost" size="sm" onClick={() => setChangesetFiles(null)}>
                <ArrowLeft data-icon="inline-start" />
                返回历史列表
              </Button>
            )}
            {!changesetFiles && targetStack.length > 0 && (
              <Button variant="ghost" size="sm" onClick={backToPreviousTarget}>
                <ArrowLeft data-icon="inline-start" />
                返回上级历史
              </Button>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
          {loading || filesLoading ? (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              正在加载…
            </div>
          ) : error ? (
            <div className="flex h-40 items-center justify-center text-sm text-destructive">
              {error}
            </div>
          ) : changesetFiles ? (
            <ChangesetFilesTable
              files={changesetFiles.files}
              changeset={changesetFiles.changeset}
              onViewVersion={(fileServerPath) =>
                setViewVersion({ serverPath: fileServerPath, changeset: changesetFiles.changeset })
              }
              onOpenFileHistory={openFileHistory}
              onGetVersion={
                onGetVersion
                  ? (fileServerPath) =>
                      setConfirmVersion({
                        serverPath: fileServerPath,
                        changeset: changesetFiles.changeset,
                        folder: false,
                      })
                  : undefined
              }
            />
          ) : entries.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              没有历史记录
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="hover:bg-transparent">
                  {!target.folder && <TableHead className="h-8 w-8" />}
                  <TableHead className="h-8 w-24 text-xs text-muted-foreground">Changeset</TableHead>
                  <TableHead className="h-8 w-20 text-xs text-muted-foreground">类型</TableHead>
                  <TableHead className="h-8 w-28 text-xs text-muted-foreground">作者</TableHead>
                  <TableHead className="h-8 w-36 text-xs text-muted-foreground">时间</TableHead>
                  <TableHead className="h-8 text-xs text-muted-foreground">注释</TableHead>
                  {onGetVersion && <TableHead className="h-8 w-12 text-xs text-muted-foreground" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow
                    key={`${entry.changeset}-${entry.serverPath}`}
                    className="cursor-default select-none"
                    onDoubleClick={() => {
                      if (target.folder) {
                        void openChangeset(entry.changeset)
                      }
                    }}
                  >
                    {!target.folder && (
                      <TableCell className="py-1.5">
                        <Checkbox
                          checked={selected.includes(entry.changeset)}
                          onCheckedChange={() => toggleSelected(entry.changeset)}
                          aria-label={`选择 changeset ${entry.changeset}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="py-1.5 font-mono text-xs">
                      {target.folder ? (
                        <button
                          type="button"
                          className="text-primary underline-offset-2 hover:underline"
                          onClick={() => void openChangeset(entry.changeset)}
                        >
                          {entry.changeset}
                        </button>
                      ) : (
                        entry.changeset
                      )}
                    </TableCell>
                    <TableCell className="py-1.5 text-xs">{entry.changeType}</TableCell>
                    <TableCell className="max-w-0 truncate py-1.5 text-xs">{entry.author}</TableCell>
                    <TableCell className="py-1.5 text-xs text-muted-foreground">
                      {formatDateTime(entry.date)}
                    </TableCell>
                    <TableCell className="max-w-0 truncate py-1.5 text-xs" title={entry.comment}>
                      {entry.comment || "—"}
                    </TableCell>
                    {onGetVersion && (
                      <TableCell className="py-1.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={`获取此版本（C${entry.changeset}，覆盖本地）`}
                          onClick={() =>
                            setConfirmVersion({
                              serverPath: target.serverPath,
                              changeset: entry.changeset,
                              folder: target.folder,
                            })
                          }
                        >
                          <CloudDownload />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {changesetFiles
              ? `${changesetFiles.files.length} 个文件 · 右键文件可查看此版本 / 历史 / 获取`
              : target.folder
                ? "双击记录或点击 changeset 编号查看影响文件"
                : "勾选两个版本可进行对比"}
          </p>
          {!target.folder && onDiffRevisions && (
            <Button
              size="sm"
              disabled={!canDiff}
              onClick={() => {
                const [a, b] = [...selected].sort((x, y) => x - y)
                onDiffRevisions(target.serverPath, a, b)
              }}
            >
              对比所选版本
            </Button>
          )}
        </div>

        {confirmVersion && onGetVersion && (
          <ConfirmDialog
            title={`获取版本 C${confirmVersion.changeset}`}
            description={
              <>
                <p>
                  将把 <span className="font-mono text-xs">{confirmVersion.serverPath}</span>{" "}
                  的本地内容替换为 changeset {confirmVersion.changeset} 的版本。
                </p>
                <p className="mt-2 font-medium text-destructive">
                  本地未签入的修改会被覆盖，且无法恢复。确定继续吗？
                </p>
              </>
            }
            confirmLabel="获取此版本"
            danger
            onConfirm={async () => {
              await onGetVersion(
                confirmVersion.serverPath,
                confirmVersion.changeset,
                confirmVersion.folder,
              )
              setConfirmVersion(null)
            }}
            onClose={() => setConfirmVersion(null)}
          />
        )}

        {viewVersion && (
          <FileViewDialog
            serverPath={viewVersion.serverPath}
            localPath={null}
            changeset={viewVersion.changeset}
            onClose={() => setViewVersion(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Changeset 影响文件列表（目录历史下钻视图），行级右键菜单提供对象操作。
 */
function ChangesetFilesTable({
  files,
  changeset,
  onViewVersion,
  onOpenFileHistory,
  onGetVersion,
}: {
  files: HistoryEntry[]
  changeset: number
  onViewVersion: (serverPath: string) => void
  onOpenFileHistory: (serverPath: string) => void
  onGetVersion?: (serverPath: string) => void
}) {
  if (files.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        该 changeset 没有文件记录
      </div>
    )
  }
  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-8 w-20 text-xs text-muted-foreground">类型</TableHead>
          <TableHead className="h-8 text-xs text-muted-foreground">服务端路径</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => (
          <ContextMenu key={file.serverPath}>
            <ContextMenuTrigger asChild>
              <TableRow className="cursor-default select-none">
                <TableCell className="py-1.5 text-xs">{file.changeType}</TableCell>
                <TableCell
                  className="max-w-0 truncate py-1.5 font-mono text-xs"
                  title={file.serverPath}
                >
                  {file.serverPath}
                </TableCell>
              </TableRow>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56">
              <ContextMenuItem onSelect={() => onViewVersion(file.serverPath)}>
                查看此版本内容
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => onOpenFileHistory(file.serverPath)}>
                查看该文件历史
              </ContextMenuItem>
              {onGetVersion && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    variant="destructive"
                    onSelect={() => onGetVersion(file.serverPath)}
                  >
                    获取此版本（C{changeset}）…
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </TableBody>
    </Table>
  )
}
