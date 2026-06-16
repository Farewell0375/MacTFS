import { useEffect, useMemo, useState } from "react"
import { FileText, FolderClosed, Loader2 } from "lucide-react"

import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import type { FolderDiffItem } from "~/lib/api"

/**
 * 添加本地文件弹窗：对选中目录执行目录对比（递归），
 * 自动筛出本地新增（localOnly）的文件 / 目录，勾选后批量加入版本控制（pendingAdd）。
 */
export function AddFilesDialog({
  serverPath,
  onConfirm,
  onClose,
}: {
  serverPath: string
  /** 确认添加所选本地路径，由编排层调用接口并刷新，返回是否成功。 */
  onConfirm: (localPaths: string[]) => Promise<boolean>
  onClose: () => void
}) {
  const [items, setItems] = useState<FolderDiffItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 勾选集合：以本地路径为键，默认全选。
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      const result = await api.compareFolder({ serverPath, recursive: true })
      if (!active) {
        return
      }
      setLoading(false)
      if (!result.ok) {
        setError(result.errorMessage ?? "目录扫描失败")
        return
      }
      setError(null)
      const localOnly = (result.data?.diffs ?? []).filter(
        (item) => item.status === "localOnly" && item.localPath,
      )
      setItems(localOnly)
      setSelected(new Set(localOnly.map((item) => item.localPath)))
    })()
    return () => {
      active = false
    }
  }, [serverPath])

  const allChecked = items.length > 0 && selected.size === items.length
  const selectedPaths = useMemo(
    () => items.filter((item) => selected.has(item.localPath)).map((item) => item.localPath),
    [items, selected],
  )

  /**
   * 勾选 / 取消勾选单项。
   */
  const toggle = (localPath: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(localPath)) {
        next.delete(localPath)
      } else {
        next.add(localPath)
      }
      return next
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="flex max-h-[80svh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>添加本地文件</DialogTitle>
          <DialogDescription className="font-mono text-xs">{serverPath}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
          {loading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              正在扫描本地新增文件…
            </div>
          ) : error ? (
            <div className="flex h-32 items-center justify-center text-sm text-destructive">{error}</div>
          ) : items.length === 0 ? (
            <div className="flex h-32 items-center justify-center px-6 text-center text-sm text-muted-foreground">
              没有发现本地新增的文件，本地内容与服务器一致
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 w-8">
                    <Checkbox
                      checked={allChecked}
                      onCheckedChange={(value) =>
                        setSelected(
                          value === true
                            ? new Set(items.map((item) => item.localPath))
                            : new Set(),
                        )
                      }
                      aria-label="全选 / 清空"
                    />
                  </TableHead>
                  <TableHead className="h-8 text-xs text-muted-foreground">名称</TableHead>
                  <TableHead className="h-8 text-xs text-muted-foreground">本地路径</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.localPath}
                    className="cursor-pointer select-none"
                    onClick={() => toggle(item.localPath)}
                  >
                    <TableCell className="py-1.5">
                      <Checkbox
                        checked={selected.has(item.localPath)}
                        onCheckedChange={() => toggle(item.localPath)}
                        aria-label={`选择 ${item.name}`}
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="flex items-center gap-1.5">
                        {item.folder ? (
                          <FolderClosed className="size-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate text-sm">{item.name}</span>
                      </span>
                    </TableCell>
                    <TableCell
                      className="max-w-0 truncate py-1.5 font-mono text-xs text-muted-foreground"
                      title={item.localPath}
                    >
                      {item.localPath}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <p className="shrink-0 text-xs text-muted-foreground">
          添加后产生「挂起新增」，可在挂起更改面板审查、撤销，签入后进入服务器；目录会连同其内容一并添加。
        </p>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button
            disabled={selectedPaths.length === 0 || busy}
            onClick={() => {
              void (async () => {
                setBusy(true)
                const ok = await onConfirm(selectedPaths)
                setBusy(false)
                if (ok) {
                  onClose()
                }
              })()
            }}
          >
            {busy ? "正在添加…" : `添加所选（${selectedPaths.length} 项）`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
