import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

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
import { cn, formatDateTime } from "~/lib/utils"

/**
 * 获取特定版本弹窗：输入或从该对象历史中点选 changeset，
 * 确认后把对象本地内容整体切到该变更集时刻（目录为递归覆盖），
 * 对应 VS 的 Get Specific Version + Overwrite。
 */
export function GetVersionDialog({
  serverPath,
  folder,
  onConfirm,
  onClose,
}: {
  serverPath: string
  folder: boolean
  /** 确认后执行获取，由编排层调用 get-version 接口并刷新。 */
  onConfirm: (changeset: number) => Promise<boolean>
  onClose: () => void
}) {
  const [input, setInput] = useState("")
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
      setError(null)
      setEntries(result.data?.history ?? [])
    })()
    return () => {
      active = false
    }
  }, [serverPath, folder])

  const changeset = /^\d+$/.test(input.trim()) ? Number(input.trim()) : null
  const valid = changeset != null && changeset > 0

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="flex max-h-[80svh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>获取特定版本</DialogTitle>
          <DialogDescription className="font-mono text-xs">{serverPath}</DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm text-muted-foreground">Changeset</span>
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="输入编号或从下方历史点选"
            className="h-8 w-56 font-mono text-sm"
            inputMode="numeric"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
          {loading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              正在加载历史…
            </div>
          ) : error ? (
            <div className="flex h-32 items-center justify-center text-sm text-destructive">{error}</div>
          ) : entries.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              没有历史记录，可直接输入 changeset 编号
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 w-24 text-xs text-muted-foreground">Changeset</TableHead>
                  <TableHead className="h-8 w-28 text-xs text-muted-foreground">作者</TableHead>
                  <TableHead className="h-8 w-36 text-xs text-muted-foreground">时间</TableHead>
                  <TableHead className="h-8 text-xs text-muted-foreground">注释</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow
                    key={`${entry.changeset}-${entry.serverPath}`}
                    className={cn(
                      "cursor-pointer select-none",
                      changeset === entry.changeset && "bg-primary/10 hover:bg-primary/10",
                    )}
                    onClick={() => setInput(String(entry.changeset))}
                  >
                    <TableCell className="py-1.5 font-mono text-xs">{entry.changeset}</TableCell>
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

        <p className="shrink-0 text-xs font-medium text-destructive">
          确认后{folder ? "该目录（递归）" : "该文件"}的本地内容会被所选版本覆盖，
          本地未签入的修改无法恢复。
        </p>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button
            variant="destructive"
            disabled={!valid || busy}
            onClick={() => {
              if (changeset == null) {
                return
              }
              void (async () => {
                setBusy(true)
                const ok = await onConfirm(changeset)
                setBusy(false)
                if (ok) {
                  onClose()
                }
              })()
            }}
          >
            {busy ? "正在获取…" : changeset != null ? `获取 C${changeset}` : "获取此版本"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
