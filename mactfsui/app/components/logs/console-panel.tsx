import { useCallback, useEffect, useMemo, useState } from "react"
import { Bot, CheckCircle2, Loader2, RefreshCw, User, XCircle } from "lucide-react"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { ScrollArea } from "~/components/ui/scroll-area"
import { api } from "~/lib/api"
import type { OperationLogEntry, OperationSource } from "~/lib/api"
import { cn, formatDateTime } from "~/lib/utils"

// 来源过滤选项：全部 / 仅手动 / 仅 AI。
type SourceFilter = "all" | "ui" | "mcp"

/**
 * 归一化操作来源：旧记录可能缺省 source，统一按「手动(ui)」处理。
 */
function normalizeSource(entry: OperationLogEntry): OperationSource {
  return entry.source === "mcp" ? "mcp" : "ui"
}

/**
 * 把毫秒耗时格式化为可读文本。
 */
function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs} ms`
  }
  return `${(durationMs / 1000).toFixed(1)} s`
}

/**
 * 底部 Operation Console：展示最近操作日志（操作、摘要、起止时间、耗时、结果），
 * 随主要操作完成自动刷新，长操作执行期间显示执行中提示。
 */
export function ConsolePanel({
  refreshToken,
  busy,
  busyText,
}: {
  refreshToken: number
  busy: boolean
  busyText: string | null
}) {
  const [logs, setLogs] = useState<OperationLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all")

  /**
   * 拉取最近操作日志。
   */
  const loadLogs = useCallback(async () => {
    setLoading(true)
    const result = await api.getLogs()
    setLoading(false)
    if (!result.ok) {
      setError(result.errorMessage ?? "操作日志加载失败")
      return
    }
    setError(null)
    setLogs(result.data?.logs ?? [])
  }, [])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs, refreshToken])

  // 各来源计数，供过滤按钮展示数量。
  const counts = useMemo(() => {
    let mcp = 0
    for (const entry of logs) {
      if (normalizeSource(entry) === "mcp") {
        mcp += 1
      }
    }
    return { all: logs.length, mcp, ui: logs.length - mcp }
  }, [logs])

  // 按来源过滤后，最新的操作排在最上面。
  const ordered = useMemo(() => {
    const filtered =
      sourceFilter === "all"
        ? logs
        : logs.filter((entry) => normalizeSource(entry) === sourceFilter)
    return [...filtered].sort((a, b) => b.startedAt - a.startedAt)
  }, [logs, sourceFilter])

  return (
    <footer className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-card">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b bg-muted/40 px-3">
        <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          操作日志
        </span>
        {busy && (
          <span className="flex items-center gap-1.5 text-xs text-primary">
            <Loader2 className="size-3 animate-spin" />
            {busyText ?? "正在执行…"}
          </span>
        )}

        {/* 来源过滤：全部 / 手动 / AI */}
        <div className="ml-auto flex items-center gap-0.5 rounded-md border bg-background/60 p-0.5">
          <SourceFilterButton
            active={sourceFilter === "all"}
            label="全部"
            count={counts.all}
            onClick={() => setSourceFilter("all")}
          />
          <SourceFilterButton
            active={sourceFilter === "ui"}
            label="手动"
            count={counts.ui}
            onClick={() => setSourceFilter("ui")}
          />
          <SourceFilterButton
            active={sourceFilter === "mcp"}
            label="AI"
            count={counts.mcp}
            onClick={() => setSourceFilter("mcp")}
          />
        </div>

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => void loadLogs()}
          disabled={loading}
          aria-label="刷新日志"
        >
          <RefreshCw className={cn(loading && "animate-spin")} />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {error ? (
          <p className="px-3 py-2 text-xs text-destructive">{error}</p>
        ) : ordered.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            {loading
              ? "正在加载操作日志…"
              : sourceFilter === "mcp"
                ? "暂无 AI 操作记录"
                : sourceFilter === "ui"
                  ? "暂无手动操作记录"
                  : "暂无操作日志"}
          </p>
        ) : (
          <ul className="px-2 py-1">
            {ordered.map((entry, index) => (
              <li
                key={`${entry.startedAt}-${entry.operation}-${index}`}
                className="animate-in fade-in slide-in-from-top-1 flex h-7 items-center gap-2 rounded fill-mode-backwards px-1.5 text-xs duration-200 transition-colors hover:bg-muted"
                style={{ animationDelay: `${Math.min(index, 6) * 25}ms` }}
                title={entry.errorMessage ?? entry.summary}
              >
                {entry.success ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-green-600" />
                ) : (
                  <XCircle className="size-3.5 shrink-0 text-destructive" />
                )}
                <SourceBadge source={normalizeSource(entry)} />
                <span className="w-36 shrink-0 truncate font-mono text-muted-foreground">
                  {entry.operation}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {entry.summary}
                  {!entry.success && entry.errorMessage && (
                    <span className="text-destructive">　{entry.errorMessage}</span>
                  )}
                </span>
                <span className="w-32 shrink-0 text-right text-muted-foreground">
                  {formatDateTime(entry.startedAt)}
                </span>
                <span className="w-16 shrink-0 text-right font-mono text-muted-foreground">
                  {formatDuration(entry.durationMs)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </footer>
  )
}

/**
 * 来源过滤按钮：高亮当前选中项，并显示该来源的记录条数。
 */
function SourceFilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-1.5 py-0.5 text-[11px] leading-none transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
      <span className={cn("ml-1 tabular-nums", active ? "opacity-80" : "opacity-60")}>{count}</span>
    </button>
  )
}

/**
 * 来源徽章：AI（MCP 调用）用主色高亮，手动（桌面端）用中性色，便于一眼区分。
 */
function SourceBadge({ source }: { source: OperationSource }) {
  if (source === "mcp") {
    return (
      <Badge
        variant="secondary"
        className="h-4 shrink-0 gap-0.5 px-1 text-[10px] bg-violet-500/15 text-violet-600 dark:text-violet-300"
      >
        <Bot className="size-2.5" />
        AI
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="h-4 shrink-0 gap-0.5 px-1 text-[10px] text-muted-foreground">
      <User className="size-2.5" />
      手动
    </Badge>
  )
}
