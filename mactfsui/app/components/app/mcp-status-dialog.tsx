import { useCallback, useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { ScrollArea } from "~/components/ui/scroll-area"
import { getMcpLogs, getMcpStatus } from "~/lib/electron"
import type { McpLogEntry, McpStatus } from "~/lib/electron"
import { cn } from "~/lib/utils"

// 弹窗打开时的自动刷新间隔（毫秒）。
const REFRESH_INTERVAL_MS = 2000

/**
 * 把毫秒时间戳格式化为 HH:mm:ss，供日志行展示。
 */
function formatLogTime(value: number): string {
  const date = new Date(value)
  const pad = (input: number) => String(input).padStart(2, "0")
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * 把运行时长（毫秒）格式化为 Xs / Xm Ys / Xh Ym。
 */
function formatUptime(ms: number): string {
  if (ms <= 0) {
    return "—"
  }
  const totalSeconds = Math.floor(ms / 1000)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

/**
 * MCP 服务状态弹窗：展示子进程运行状态（运行中 / healthz 探活 / pid / 运行时长 /
 * 重启次数 / 上次退出码）与最近 500 行运行日志。打开期间每 2 秒自动刷新，日志自动滚到底部。
 */
export function McpStatusDialog({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<McpStatus | null>(null)
  const [logs, setLogs] = useState<McpLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const logEndRef = useRef<HTMLDivElement | null>(null)

  const refresh = useCallback(async () => {
    const [nextStatus, nextLogs] = await Promise.all([getMcpStatus(), getMcpLogs()])
    setStatus(nextStatus)
    setLogs(nextLogs)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  // 日志更新后滚到底部，始终看到最新输出。
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "end" })
  }, [logs])

  const running = status?.running ?? false
  const healthy = status?.healthy ?? false

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[80svh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>MCP 服务状态</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {status?.sseUrl ?? "http://127.0.0.1:38766/sse"}
          </DialogDescription>
        </DialogHeader>

        {/* 状态摘要 */}
        <div className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 rounded-lg border bg-muted/30 px-4 py-3 text-xs sm:grid-cols-3">
          <StatusItem label="进程">
            {running ? (
              <Badge variant="default">运行中</Badge>
            ) : (
              <Badge variant="destructive">已停止</Badge>
            )}
          </StatusItem>
          <StatusItem label="探活 /healthz">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "size-2 rounded-full",
                  healthy ? "bg-emerald-500" : "bg-red-500",
                )}
              />
              {healthy ? "可达" : "不可达"}
            </span>
          </StatusItem>
          <StatusItem label="PID">
            <span className="font-mono">{status?.pid ?? "—"}</span>
          </StatusItem>
          <StatusItem label="运行时长">
            <span className="font-mono">{formatUptime(status?.uptimeMs ?? 0)}</span>
          </StatusItem>
          <StatusItem label="重启次数">
            <span className="font-mono">{status?.restartCount ?? 0}</span>
          </StatusItem>
          <StatusItem label="上次退出码">
            <span className="font-mono">{status?.lastExitCode ?? "—"}</span>
          </StatusItem>
        </div>

        {status?.lastError && (
          <p className="shrink-0 rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
            {status.lastError}
          </p>
        )}
        {!status?.entryResolved && (
          <p className="shrink-0 rounded-md bg-amber-500/10 px-3 py-1.5 text-xs text-amber-600">
            未找到 MCP 入口（开发态请先在 mactfs-mcp 执行 pnpm build）。
          </p>
        )}

        {/* 运行日志 */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
          <div className="flex h-8 shrink-0 items-center gap-2 border-b bg-muted/40 px-3">
            <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              运行日志
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {logs.length > 0 && `${logs.length} 行`}
            </span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {logs.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {loading ? "正在加载日志…" : "暂无日志输出"}
              </p>
            ) : (
              <div className="px-3 py-1.5 font-mono text-[11px] leading-relaxed">
                {logs.map((entry, index) => (
                  <div
                    key={`${entry.ts}-${index}`}
                    className={cn(
                      "flex gap-2 whitespace-pre-wrap break-all",
                      entry.stream === "stderr" ? "text-destructive" : "text-foreground/80",
                    )}
                  >
                    <span className="shrink-0 text-muted-foreground">{formatLogTime(entry.ts)}</span>
                    <span className="min-w-0">{entry.line}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={cn(loading && "animate-spin")} />
            刷新
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 状态摘要中的单项：上方标签、下方值。
 */
function StatusItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-foreground">{children}</span>
    </div>
  )
}
