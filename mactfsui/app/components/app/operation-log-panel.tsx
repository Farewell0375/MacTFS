import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Terminal,
  TriangleAlert,
} from "lucide-react"

import { Button } from "~/components/ui/button"
import type { ApiRequestLogEntry } from "~/lib/api/client"

interface OperationLogPanelProps {
  logs: ApiRequestLogEntry[]
  loading: boolean
  serviceMessage: string
  requestStatus: string
  username: string
  onRefresh(): void
}

/**
 * 渲染底部操作日志面板，展示 API 操作状态、耗时、路径摘要和错误信息。
 */
export function OperationLogPanel({
  logs,
  loading,
  serviceMessage,
  requestStatus,
  username,
  onRefresh,
}: OperationLogPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-b px-3 text-xs font-medium text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          <Terminal className="size-4" />
          <span>Console</span>
          <span className="rounded-[6px] border bg-background px-1.5 py-0.5">
            {logs.length} 条
          </span>
        </div>
        <Button
          size="icon-xs"
          variant="ghost"
          title="刷新服务端操作日志"
          disabled={loading}
          onClick={onRefresh}
        >
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="grid gap-1 p-3 font-mono text-xs text-muted-foreground">
          <div>[service] {serviceMessage}</div>
          <div>[request] {requestStatus}</div>
          <div>[session] {username || "anonymous"}</div>
          <div>[logs] 暂无 API 操作日志</div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-[920px]">
            <div className="sticky top-0 z-10 grid h-7 grid-cols-[140px_76px_142px_142px_86px_minmax(180px,1fr)_minmax(190px,1fr)] border-b bg-muted px-3 text-xs font-medium text-muted-foreground">
              <div className="flex items-center">操作</div>
              <div className="flex items-center">状态</div>
              <div className="flex items-center">开始</div>
              <div className="flex items-center">结束</div>
              <div className="flex items-center">耗时</div>
              <div className="flex items-center">路径摘要</div>
              <div className="flex items-center">错误信息</div>
            </div>

            {logs.map((log) => (
              <div
                key={log.id}
                className="grid min-h-7 grid-cols-[140px_76px_142px_142px_86px_minmax(180px,1fr)_minmax(190px,1fr)] items-center border-b px-3 font-mono text-xs"
              >
                <div className="truncate">{log.operation}</div>
                <div>
                  <span
                    className={`inline-flex max-w-full items-center gap-1 rounded-[6px] border px-1.5 py-0.5 ${statusClassName(log)}`}
                  >
                    {log.status === "success" ? (
                      <CheckCircle2 className="size-3" />
                    ) : log.status === "running" ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <TriangleAlert className="size-3" />
                    )}
                    {statusLabel(log)}
                  </span>
                </div>
                <div className="truncate text-muted-foreground">
                  {formatLogTime(log.startedAt)}
                </div>
                <div className="truncate text-muted-foreground">
                  {log.status === "running"
                    ? "执行中"
                    : formatLogTime(log.endedAt)}
                </div>
                <div className="text-muted-foreground">
                  {formatDuration(log)}
                </div>
                <div className="truncate text-muted-foreground">
                  {log.summary || "-"}
                </div>
                <div
                  className={`truncate ${
                    log.errorMessage
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {log.status === "running"
                    ? "请求执行中"
                    : log.errorMessage || "-"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 按日志状态返回中文状态文案。
 */
function statusLabel(log: ApiRequestLogEntry) {
  if (log.status === "running") {
    return "执行中"
  }
  return log.success ? "成功" : "失败"
}

/**
 * 按日志状态返回 badge 样式。
 */
function statusClassName(log: ApiRequestLogEntry) {
  if (log.status === "running") {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }
  return log.success
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-red-200 bg-red-50 text-red-700"
}

/**
 * 格式化操作日志时间戳。
 */
function formatLogTime(value?: number) {
  return value ? new Date(value).toLocaleString() : "-"
}

/**
 * 格式化操作耗时，执行中的请求保持明确状态。
 */
function formatDuration(log: ApiRequestLogEntry) {
  if (log.status === "running") {
    return "执行中"
  }
  if (log.durationMs === undefined) {
    return "-"
  }
  return log.durationMs < 1000
    ? `${log.durationMs} ms`
    : `${(log.durationMs / 1000).toFixed(1)} s`
}
