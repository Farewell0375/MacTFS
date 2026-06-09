import { useEffect, useState } from "react"
import { GitCompareArrows, Loader2, RefreshCw, Search, X } from "lucide-react"

import { Button } from "~/components/ui/button"
import { diffLocalLatest, diffRevisions } from "~/lib/api/endpoints"
import type { TfsTextDiff } from "~/lib/api/types"

export type DiffPanelRequest =
  | {
      type: "localLatest"
      serverPath: string
      localPath: string
      label: string
    }
  | {
      type: "revisions"
      serverPath: string
      sourceChangeset: number
      targetChangeset: number
      label: string
    }

interface DiffPanelProps {
  request: DiffPanelRequest
  onClose(): void
}

interface DiffRow {
  source?: string
  target?: string
  kind: "same" | "removed" | "added"
}

/**
 * 展示文本 Diff 面板，支持本地 vs latest 和两个历史版本对比。
 */
export function DiffPanel({ request, onClose }: DiffPanelProps) {
  const [diff, setDiff] = useState<TfsTextDiff>()
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadDiff()
  }, [request])

  const rows = diff ? toDiffRows(diff.lines) : []
  const lowerSearch = search.trim().toLowerCase()

  /**
   * 根据当前请求类型加载文本 diff。
   */
  async function loadDiff() {
    setLoading(true)
    setMessage("")

    const result =
      request.type === "localLatest"
        ? await diffLocalLatest({
            serverPath: request.serverPath,
            localPath: request.localPath,
          })
        : await diffRevisions({
            serverPath: request.serverPath,
            sourceChangeset: request.sourceChangeset,
            targetChangeset: request.targetChangeset,
          })
    setLoading(false)

    if (!result.success || !result.data.diff) {
      setDiff(undefined)
      setMessage(
        result.errorMessage ||
          result.message ||
          "大文件、二进制或不支持类型无法展示文本 diff。"
      )
      return
    }

    setDiff(result.data.diff)
  }

  /**
   * 将后端统一 diff lines 转为左右两栏展示行。
   */
  function toDiffRows(lines: string[]): DiffRow[] {
    return lines.map((line) => {
      const prefix = line.charAt(0)
      const content = line.slice(1)
      if (prefix === "-") {
        return { source: content, kind: "removed" }
      }
      if (prefix === "+") {
        return { target: content, kind: "added" }
      }
      return { source: content, target: content, kind: "same" }
    })
  }

  return (
    <div className="flex h-[min(720px,calc(100svh-96px))] min-h-0 flex-col bg-background">
      <div className="flex min-h-9 items-center justify-between gap-3 px-3 py-1.5 text-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-medium">
            <GitCompareArrows className="size-3.5" />
            Diff
          </div>
          <div className="truncate font-mono text-muted-foreground">
            {request.label}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div className="flex h-7 items-center gap-1 rounded-[6px] border bg-background px-2">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              className="w-36 bg-transparent text-xs outline-none"
              value={search}
              placeholder="搜索"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={loading}
            title="刷新 Diff"
            onClick={loadDiff}
          >
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          </Button>
          <Button size="icon-xs" variant="ghost" title="关闭" onClick={onClose}>
            <X />
          </Button>
        </div>
      </div>

      {message && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {message}
        </div>
      )}

      {diff && (
        <div className="min-h-0 flex-1 border-t">
          <div className="grid h-8 grid-cols-2 border-b bg-muted/20 px-3 text-xs font-medium text-muted-foreground">
            <div className="flex min-w-0 items-center truncate font-mono">
              {diff.sourceLabel}
            </div>
            <div className="flex min-w-0 items-center truncate border-l pl-3 font-mono">
              {diff.targetLabel}
            </div>
          </div>
          <div className="h-[calc(100%-2rem)] overflow-auto font-mono text-xs">
            {rows.length === 0 ? (
              <div className="px-3 py-4 text-muted-foreground">
                无可展示 diff 内容。
              </div>
            ) : (
              rows.map((row, index) => (
                <div
                  key={`${index}:${row.kind}`}
                  className={`grid min-h-6 grid-cols-[48px_minmax(0,1fr)_48px_minmax(0,1fr)] border-b ${
                    lowerSearch &&
                    `${row.source || ""}\n${row.target || ""}`
                      .toLowerCase()
                      .includes(lowerSearch)
                      ? "bg-amber-50"
                      : ""
                  }`}
                >
                  <div className="bg-muted/20 px-2 py-1 text-right text-muted-foreground">
                    {index + 1}
                  </div>
                  <div
                    className={`whitespace-pre-wrap px-2 py-1 ${
                      row.kind === "removed"
                        ? "bg-red-50 text-red-700"
                        : ""
                    }`}
                  >
                    {row.source ?? ""}
                  </div>
                  <div className="border-l bg-muted/20 px-2 py-1 text-right text-muted-foreground">
                    {index + 1}
                  </div>
                  <div
                    className={`whitespace-pre-wrap px-2 py-1 ${
                      row.kind === "added"
                        ? "bg-green-50 text-green-700"
                        : ""
                    }`}
                  >
                    {row.target ?? ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
