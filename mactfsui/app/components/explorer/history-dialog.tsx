import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
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

/**
 * History 弹窗：展示文件或目录历史（最近记录）。
 * 目录历史可点击 changeset 查看影响文件；文件历史可勾选两个版本，
 * 通过 onDiffRevisions 进入版本对比（FE-008 提供 Diff 弹窗）。
 */
export function HistoryDialog({
  serverPath,
  folder,
  onClose,
  onDiffRevisions,
}: {
  serverPath: string
  folder: boolean
  onClose: () => void
  onDiffRevisions?: (serverPath: string, source: number, target: number) => void
}) {
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

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      const result = await api.getHistory({ path: serverPath, folder })
      if (!active) {
        return
      }
      setLoading(false)
      if (!result.ok) {
        setError(result.errorMessage ?? "历史加载失败")
        return
      }
      setEntries(result.data?.history ?? [])
    })()
    return () => {
      active = false
    }
  }, [serverPath, folder])

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

  const canDiff = onDiffRevisions != null && !folder && selected.length === 2

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[80svh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {changesetFiles ? `Changeset ${changesetFiles.changeset} 的文件` : "历史记录"}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{serverPath}</DialogDescription>
        </DialogHeader>

        {changesetFiles && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChangesetFiles(null)}
            >
              <ArrowLeft data-icon="inline-start" />
              返回历史列表
            </Button>
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
            <ChangesetFilesTable files={changesetFiles.files} />
          ) : entries.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              没有历史记录
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="hover:bg-transparent">
                  {!folder && <TableHead className="h-8 w-8" />}
                  <TableHead className="h-8 w-24 text-xs text-muted-foreground">Changeset</TableHead>
                  <TableHead className="h-8 w-20 text-xs text-muted-foreground">类型</TableHead>
                  <TableHead className="h-8 w-28 text-xs text-muted-foreground">作者</TableHead>
                  <TableHead className="h-8 w-36 text-xs text-muted-foreground">时间</TableHead>
                  <TableHead className="h-8 text-xs text-muted-foreground">注释</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow
                    key={`${entry.changeset}-${entry.serverPath}`}
                    className="cursor-default select-none"
                    onDoubleClick={() => {
                      if (folder) {
                        void openChangeset(entry.changeset)
                      }
                    }}
                  >
                    {!folder && (
                      <TableCell className="py-1.5">
                        <Checkbox
                          checked={selected.includes(entry.changeset)}
                          onCheckedChange={() => toggleSelected(entry.changeset)}
                          aria-label={`选择 changeset ${entry.changeset}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="py-1.5 font-mono text-xs">
                      {folder ? (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {changesetFiles
              ? `${changesetFiles.files.length} 个文件`
              : folder
                ? "双击记录或点击 changeset 编号查看影响文件"
                : "勾选两个版本可进行对比"}
          </p>
          {!folder && onDiffRevisions && (
            <Button
              size="sm"
              disabled={!canDiff}
              onClick={() => {
                const [a, b] = [...selected].sort((x, y) => x - y)
                onDiffRevisions(serverPath, a, b)
              }}
            >
              对比所选版本
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Changeset 影响文件列表（目录历史下钻视图）。
 */
function ChangesetFilesTable({ files }: { files: HistoryEntry[] }) {
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
          <TableRow key={file.serverPath} className="select-none">
            <TableCell className="py-1.5 text-xs">{file.changeType}</TableCell>
            <TableCell className="max-w-0 truncate py-1.5 font-mono text-xs" title={file.serverPath}>
              {file.serverPath}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
