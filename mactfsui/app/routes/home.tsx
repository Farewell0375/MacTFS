import { useCallback, useEffect, useState } from "react"

import { ConnectView } from "~/components/app/connect-view"
import { WorkspaceShell } from "~/components/app/workspace-shell"
import { Button } from "~/components/ui/button"
import { getServiceStatus, isElectron, startService } from "~/lib/electron"
import type { ServiceStatus } from "~/lib/electron"
import type { WorkspaceSession } from "~/lib/tfs/session"

// 顶层视图状态：检测服务、服务未就绪、连接入口、已进入工作台。
type AppPhase = "checking" | "blocked" | "connect" | "workspace"

/**
 * 第一版前端入口：先确保本地服务就绪，再走连接 / Collection / Workspace 流程，
 * 进入工作台后持有固定上下文（FE-003）。
 */
export default function Home() {
  const [phase, setPhase] = useState<AppPhase>("checking")
  const [status, setStatus] = useState<ServiceStatus | null>(null)
  const [session, setSession] = useState<WorkspaceSession | null>(null)

  /**
   * 检测本地服务，未就绪时在 Electron 环境下尝试自动拉起。
   */
  const bootstrap = useCallback(async () => {
    setPhase("checking")
    let next = await getServiceStatus()
    if (!next.running && isElectron()) {
      next = await startService()
    }
    setStatus(next)
    setPhase(next.running ? "connect" : "blocked")
  }, [])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  /**
   * 连接流程完成后固定上下文并进入工作台。
   */
  const handleReady = useCallback((next: WorkspaceSession) => {
    setSession(next)
    setPhase("workspace")
  }, [])

  /**
   * 从工作台返回连接入口，重新走连接流程。
   */
  const handleReconnect = useCallback(() => {
    setSession(null)
    setPhase("connect")
  }, [])

  if (phase === "workspace" && session) {
    return <WorkspaceShell session={session} onReconnect={handleReconnect} />
  }

  if (phase === "connect") {
    return <ConnectView onReady={handleReady} />
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-sm">
        <h1 className="text-base font-semibold">macTFS</h1>
        <p className="mt-1 text-sm text-muted-foreground">本地源码管理工作台</p>

        {phase === "checking" && (
          <p className="mt-4 text-sm text-muted-foreground">正在检查本地服务…</p>
        )}

        {phase === "blocked" && (
          <div className="mt-4 space-y-3 text-sm">
            <p className="font-medium text-destructive">本地服务未就绪</p>
            <p className="text-muted-foreground">
              {status?.error ?? "无法连接本地 API 服务"}
            </p>
            <Button size="sm" onClick={() => void bootstrap()}>
              重试连接
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
