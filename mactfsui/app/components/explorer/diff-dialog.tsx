import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"

import { Badge } from "~/components/ui/badge"
import { Checkbox } from "~/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { api } from "~/lib/api"
import type { TextDiff } from "~/lib/api"
import { cn } from "~/lib/utils"

// Diff 请求：本地 vs latest，或同一服务端文件两个历史版本。
export type DiffRequest =
  | { mode: "localLatest"; serverPath: string; localPath: string }
  | { mode: "revisions"; serverPath: string; sourceChangeset: number; targetChangeset: number }

// 解析后的 Diff 行：种类 + 双侧行号。
interface DiffLine {
  kind: "same" | "removed" | "added"
  text: string
  sourceLine: number | null
  targetLine: number | null
}

/**
 * 把后端返回的前缀行（" " / "-" / "+"）解析为带双侧行号的结构。
 */
function parseDiffLines(raw: string[]): DiffLine[] {
  const result: DiffLine[] = []
  let sourceLine = 0
  let targetLine = 0
  for (const line of raw) {
    const prefix = line.charAt(0)
    const text = line.slice(1)
    if (prefix === "-") {
      sourceLine += 1
      result.push({ kind: "removed", text, sourceLine, targetLine: null })
    } else if (prefix === "+") {
      targetLine += 1
      result.push({ kind: "added", text, sourceLine: null, targetLine })
    } else {
      sourceLine += 1
      targetLine += 1
      result.push({ kind: "same", text, sourceLine, targetLine })
    }
  }
  return result
}

/**
 * 文本 Diff 弹窗：支持 本地 vs 服务器 latest 与 两个历史版本 对比，
 * 提供行号、差异高亮、搜索与仅看差异。
 */
export function DiffDialog({
  request,
  onClose,
}: {
  request: DiffRequest
  onClose: () => void
}) {
  const [diff, setDiff] = useState<TextDiff | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [onlyChanges, setOnlyChanges] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void (async () => {
      const result =
        request.mode === "localLatest"
          ? await api.diffLocalLatest({
              serverPath: request.serverPath,
              localPath: request.localPath,
            })
          : await api.diffRevisions({
              serverPath: request.serverPath,
              sourceChangeset: request.sourceChangeset,
              targetChangeset: request.targetChangeset,
            })
      if (!active) {
        return
      }
      setLoading(false)
      if (!result.ok || !result.data) {
        setError(result.errorMessage ?? "Diff 加载失败")
        return
      }
      setDiff(result.data.diff)
    })()
    return () => {
      active = false
    }
  }, [request])

  const lines = useMemo(() => parseDiffLines(diff?.lines ?? []), [diff])
  const changedCount = useMemo(
    () => lines.filter((line) => line.kind !== "same").length,
    [lines],
  )
  const keyword = search.trim().toLowerCase()
  const visibleLines = useMemo(
    () => (onlyChanges ? lines.filter((line) => line.kind !== "same") : lines),
    [lines, onlyChanges],
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {request.mode === "localLatest" ? "本地 vs 服务器 latest" : "历史版本对比"}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {request.serverPath}
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
          {diff && (
            <>
              <Badge variant="secondary" className="rounded-md bg-red-500/10 text-red-700 dark:text-red-400">
                − {diff.sourceLabel}
              </Badge>
              <Badge variant="secondary" className="rounded-md bg-green-500/10 text-green-700 dark:text-green-400">
                + {diff.targetLabel}
              </Badge>
              <span className="text-muted-foreground">{changedCount} 行差异</span>
            </>
          )}
          <label className="ml-auto flex items-center gap-1.5 text-muted-foreground">
            <Checkbox
              checked={onlyChanges}
              onCheckedChange={(value) => setOnlyChanges(value === true)}
            />
            仅看差异
          </label>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索内容…"
            className="h-7 w-48 text-xs"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/20">
          {loading ? (
            <div className="flex h-60 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              正在生成 Diff…
            </div>
          ) : error ? (
            <div className="flex h-60 items-center justify-center p-6 text-center text-sm text-destructive">
              {error}
            </div>
          ) : visibleLines.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
              {changedCount === 0 ? "两个版本内容一致" : "没有符合条件的行"}
            </div>
          ) : (
            <pre className="min-w-full font-mono text-xs leading-5">
              {visibleLines.map((line, index) => {
                const hit = keyword.length > 0 && line.text.toLowerCase().includes(keyword)
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex",
                      line.kind === "removed" && "bg-red-500/10",
                      line.kind === "added" && "bg-green-500/10",
                      hit && "bg-amber-500/20",
                    )}
                  >
                    <span className="w-10 shrink-0 pr-1 text-right text-muted-foreground/60 select-none">
                      {line.sourceLine ?? ""}
                    </span>
                    <span className="w-10 shrink-0 border-r pr-1 text-right text-muted-foreground/60 select-none">
                      {line.targetLine ?? ""}
                    </span>
                    <span
                      className={cn(
                        "w-5 shrink-0 text-center select-none",
                        line.kind === "removed" && "text-red-600",
                        line.kind === "added" && "text-green-600",
                      )}
                    >
                      {line.kind === "removed" ? "−" : line.kind === "added" ? "+" : ""}
                    </span>
                    <span className="whitespace-pre-wrap break-all">{line.text}</span>
                  </div>
                )
              })}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
