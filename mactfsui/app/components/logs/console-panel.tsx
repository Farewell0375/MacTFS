import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react"

import { Button } from "~/components/ui/button"
import { ScrollArea } from "~/components/ui/scroll-area"
import { api } from "~/lib/api"
import type { OperationLogEntry } from "~/lib/api"
import { cn, formatDateTime } from "~/lib/utils"

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

  // 最新的操作排在最上面。
  const ordered = useMemo(
    () => [...logs].sort((a, b) => b.startedAt - a.startedAt),
    [logs],
  )

  return (
    <footer className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-card">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b px-3">
        <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          操作日志
        </span>
        {busy && (
          <span className="flex items-center gap-1.5 text-xs text-primary">
            <Loader2 className="size-3 animate-spin" />
            {busyText ?? "正在执行…"}
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {ordered.length > 0 && `${ordered.length} 条`}
        </span>
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
            {loading ? "正在加载操作日志…" : "暂无操作日志"}
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
