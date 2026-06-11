import { useCallback, useState } from "react"
import { Loader2, Search } from "lucide-react"

import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { api } from "~/lib/api"
import type { HistoryEntry, MappingInfo } from "~/lib/api"
import { resolveLocalPath } from "~/lib/tfs"
import { cn, formatDateTime } from "~/lib/utils"

/**
 * 合并向导弹窗：源（当前对象）→ 目标路径（必须已映射），
 * 加载待合并 changeset 候选后支持「全部合并」或选择单个合并；
 * 结果为挂起更改，冲突由编排层进入既有冲突弹窗。
 */
export function MergeDialog({
  sourceServerPath,
  mappings,
  onMerge,
  onClose,
}: {
  sourceServerPath: string
  mappings: MappingInfo[]
  /** 执行合并（changeset 为 undefined 表示全部），由编排层调用接口并刷新。 */
  onMerge: (targetServerPath: string, changeset: number | undefined) => Promise<boolean>
  onClose: () => void
}) {
  const [target, setTarget] = useState("")
  const [candidates, setCandidates] = useState<HistoryEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = target.trim()
  const targetMapped = trimmed.length > 2 && resolveLocalPath(mappings, trimmed) != null
  const validation =
    trimmed.length === 0
      ? null
      : !trimmed.startsWith("$/") || trimmed.length <= 2
        ? "目标路径必须以 $/ 开头"
        : trimmed === sourceServerPath
          ? "目标路径不能与源路径相同"
          : !targetMapped
            ? "目标路径未映射，请先在工作区中映射"
            : null
  const targetReady = trimmed.length > 2 && validation == null

  /**
   * 加载源 → 目标的待合并候选列表。
   */
  const loadCandidates = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelected(null)
    const result = await api.mergeCandidates({
      sourceServerPath,
      targetServerPath: trimmed,
    })
    setLoading(false)
    if (!result.ok) {
      setCandidates(null)
      setError(result.errorMessage ?? "候选查询失败（请确认源与目标存在分支关系）")
      return
    }
    setCandidates(result.data?.candidates ?? [])
  }, [sourceServerPath, trimmed])

  /**
   * 执行合并：changeset 为 undefined 表示合并全部候选。
   */
  const handleMerge = useCallback(
    (changeset: number | undefined) => {
      void (async () => {
        setBusy(true)
        const ok = await onMerge(trimmed, changeset)
        setBusy(false)
        if (ok) {
          onClose()
        }
      })()
    },
    [onMerge, trimmed, onClose],
  )

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>合并</DialogTitle>
          <DialogDescription>
            将源分支的变更集合并到目标分支，结果为挂起更改，冲突需逐个处理
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-3">
          <div className="space-y-1.5">
            <Label>源路径</Label>
            <p className="rounded-md border bg-muted/40 px-2.5 py-1.5 font-mono text-xs">
              {sourceServerPath}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mergeTarget">目标路径（必须已映射）</Label>
            <div className="flex gap-2">
              <Input
                id="mergeTarget"
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value)
                  setCandidates(null)
                }}
                placeholder="$/Project/Branch"
                disabled={busy}
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
                disabled={!targetReady || loading || busy}
                onClick={() => void loadCandidates()}
              >
                <Search data-icon="inline-start" />
                查询候选
              </Button>
            </div>
            {validation != null && <p className="text-xs text-destructive">{validation}</p>}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
          {loading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              正在查询待合并变更集…
            </div>
          ) : candidates == null ? (
            <div className="flex h-32 items-center justify-center px-6 text-center text-sm text-muted-foreground">
              输入目标路径并点击「查询候选」，查看可合并的变更集
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              没有待合并的变更集，两个分支已同步
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 w-24 text-xs text-muted-foreground">Changeset</TableHead>
                  <TableHead className="h-8 w-24 text-xs text-muted-foreground">类型</TableHead>
                  <TableHead className="h-8 w-28 text-xs text-muted-foreground">作者</TableHead>
                  <TableHead className="h-8 w-36 text-xs text-muted-foreground">时间</TableHead>
                  <TableHead className="h-8 text-xs text-muted-foreground">注释</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((entry) => (
                  <TableRow
                    key={entry.changeset}
                    className={cn(
                      "cursor-pointer select-none",
                      selected === entry.changeset && "bg-primary/10 hover:bg-primary/10",
                    )}
                    onClick={() =>
                      setSelected((prev) => (prev === entry.changeset ? null : entry.changeset))
                    }
                  >
                    <TableCell className="py-1.5 font-mono text-xs">{entry.changeset}</TableCell>
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

        {error && <p className="shrink-0 text-sm text-destructive">{error}</p>}
        <p className="shrink-0 text-xs text-muted-foreground">
          合并只产生挂起更改，不会直接写入服务器；出现冲突会进入冲突处理弹窗，签入前可撤销。
        </p>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button
            variant="outline"
            disabled={!targetReady || busy || candidates == null || candidates.length === 0 || selected == null}
            onClick={() => handleMerge(selected ?? undefined)}
          >
            合并所选（{selected != null ? `C${selected}` : "未选择"}）
          </Button>
          <Button
            disabled={!targetReady || busy || candidates == null || candidates.length === 0}
            onClick={() => handleMerge(undefined)}
          >
            {busy ? "正在合并…" : "全部合并"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
