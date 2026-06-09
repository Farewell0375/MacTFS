import { useState, type ReactNode } from "react"
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cloud,
  FolderTree,
  GitPullRequest,
  RefreshCw,
  TriangleAlert,
} from "lucide-react"

import { OperationLogPanel } from "~/components/app/operation-log-panel"
import { Button } from "~/components/ui/button"
import type { ApiRequestLogEntry } from "~/lib/api/client"

interface AppShellProps {
  connected: boolean
  serviceReady: boolean
  serviceLoading: boolean
  serverUri: string
  username: string
  collection?: string
  workspace?: string
  collectionCount?: number
  serviceBaseUrl?: string
  tokenFile?: string
  serviceMessage: string
  requestStatus: string
  operationLogs: ApiRequestLogEntry[]
  operationLogsLoading: boolean
  sourceList?: ReactNode
  inspector?: ReactNode
  onRefreshService(): void
  onRefreshOperationLogs(): void
  children: ReactNode
}

/**
 * 渲染 macOS Source Workspace 主框架，承载顶部工具栏、Source List、主内容、Inspector 和 Console。
 */
export function AppShell({
  connected,
  serviceReady,
  serviceLoading,
  serverUri,
  username,
  collection,
  workspace,
  collectionCount,
  serviceBaseUrl,
  tokenFile,
  serviceMessage,
  requestStatus,
  operationLogs,
  operationLogsLoading,
  sourceList,
  inspector,
  onRefreshService,
  onRefreshOperationLogs,
  children,
}: AppShellProps) {
  const [sourceCollapsed, setSourceCollapsed] = useState(false)
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false)
  const [consoleCollapsed, setConsoleCollapsed] = useState(false)

  const columns = connected
    ? `${sourceCollapsed ? "40px" : "280px"} minmax(480px,1fr) ${
        inspectorCollapsed ? "40px" : "340px"
      }`
    : "1fr"

  return (
    <div className="flex h-[calc(100svh-32px)] min-h-[640px] flex-col overflow-hidden rounded-[8px] border bg-background text-sm shadow-sm">
      <header className="flex h-13 shrink-0 items-center justify-between gap-3 border-b bg-muted/30 px-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-[7px] border bg-background text-primary">
            <Cloud className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">macTFS</span>
              <span className="rounded-[6px] border bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
                {connected ? "已连接" : "未连接"}
              </span>
            </div>
            <div className="truncate font-mono text-xs text-muted-foreground">
              {serverUri || "http://127.0.0.1:38765"}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 justify-end gap-2 text-xs text-muted-foreground">
          {connected && (
            <div className="hidden min-w-0 items-center gap-2 md:flex">
              <span className="max-w-52 truncate font-mono">
                Collection: {collection || "-"}
              </span>
              <span className="max-w-52 truncate font-mono">
                Workspace: {workspace || "-"}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={serviceLoading}
            onClick={onRefreshService}
          >
            <RefreshCw className={serviceLoading ? "animate-spin" : ""} />
            刷新
          </Button>
        </div>
      </header>

      <div
        className="grid min-h-0 flex-1"
        style={{ gridTemplateColumns: columns }}
      >
        {connected && (
        <aside className="flex min-h-0 min-w-0 flex-col border-r bg-muted/25">
          <div className="flex h-9 items-center gap-2 border-b px-3 text-xs font-medium text-muted-foreground">
            {sourceCollapsed ? (
              <Button
                size="icon-xs"
                variant="ghost"
                title="展开 Source List"
                onClick={() => setSourceCollapsed(false)}
              >
                <ChevronRight />
              </Button>
            ) : (
              <>
                <FolderTree className="size-4" />
                <span className="min-w-0 flex-1 truncate">Source List</span>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  title="收起 Source List"
                  onClick={() => setSourceCollapsed(true)}
                >
                  <ChevronLeft />
                </Button>
              </>
            )}
          </div>
          {!sourceCollapsed && (
            <div className="min-h-0 flex-1 overflow-auto p-2">
              {sourceList || (
                <>
                  <div className="rounded-[6px] bg-background px-2 py-1.5 font-mono text-xs">
                    $/
                  </div>
                  <div className="mt-2 px-2 text-xs text-muted-foreground">
                    Collection：{collectionCount ?? "-"}
                  </div>
                </>
              )}
            </div>
          )}
        </aside>
        )}

        <main className="flex min-h-[320px] min-w-0 flex-col">
          <div className="flex h-9 items-center justify-between gap-3 border-b px-3">
            <div className="min-w-0 truncate font-medium">Source Workspace</div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </main>

        {connected && (
        <aside className="flex min-h-0 min-w-0 flex-col border-l bg-background">
          <div className="flex h-9 items-center gap-2 border-b px-3 text-xs font-medium text-muted-foreground">
            {inspectorCollapsed ? (
              <Button
                size="icon-xs"
                variant="ghost"
                title="展开 Changes"
                onClick={() => setInspectorCollapsed(false)}
              >
                <ChevronLeft />
              </Button>
            ) : (
              <>
                <GitPullRequest className="size-4" />
                <span className="min-w-0 flex-1 truncate">Changes</span>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  title="收起 Changes"
                  onClick={() => setInspectorCollapsed(true)}
                >
                  <ChevronRight />
                </Button>
              </>
            )}
          </div>
          {!inspectorCollapsed && (
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <div className="grid gap-4">
              {inspector || (
                <section className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Pending Changes</span>
                    <span className="rounded-[6px] border px-1.5 py-0.5 text-xs text-muted-foreground">
                      0 项
                    </span>
                  </div>
                  <div className="rounded-[6px] border bg-muted/20 px-3 py-2 text-muted-foreground">
                    暂无挂起更改
                  </div>
                </section>
              )}

              <section className="grid gap-2">
                <div className="font-medium">本地服务</div>
                <div className="flex items-center gap-2 rounded-[6px] border bg-muted/30 px-3 py-2">
                  {serviceReady ? (
                    <CheckCircle2 className="size-4 text-green-600" />
                  ) : (
                    <TriangleAlert className="size-4 text-amber-600" />
                  )}
                  <span>{serviceReady ? "服务可用" : "服务未就绪"}</span>
                </div>
                <div className="grid gap-1 text-xs text-muted-foreground">
                  <div className="truncate font-mono">
                    {serviceBaseUrl || "http://127.0.0.1:38765"}
                  </div>
                  <div className="truncate font-mono">
                    {tokenFile || "~/.mactfs/server-token"}
                  </div>
                </div>
              </section>
            </div>
          </div>
          )}
        </aside>
        )}
      </div>

      <footer className={`${consoleCollapsed ? "h-9" : "h-40"} shrink-0 border-t bg-muted/20`}>
        {consoleCollapsed ? (
          <div className="flex h-9 items-center justify-between px-3 text-xs text-muted-foreground">
            <span>Console</span>
            <Button
              size="icon-xs"
              variant="ghost"
              title="展开 Console"
              onClick={() => setConsoleCollapsed(false)}
            >
              <ChevronUp />
            </Button>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-8 shrink-0 items-center justify-end border-b px-2">
              <Button
                size="icon-xs"
                variant="ghost"
                title="收起 Console"
                onClick={() => setConsoleCollapsed(true)}
              >
                <ChevronDown />
              </Button>
            </div>
            <div className="min-h-0 flex-1">
              <OperationLogPanel
                logs={operationLogs}
                loading={operationLogsLoading}
                serviceMessage={serviceMessage}
                requestStatus={requestStatus}
                username={username}
                onRefresh={onRefreshOperationLogs}
              />
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}
