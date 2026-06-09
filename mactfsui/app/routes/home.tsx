import { useCallback, useEffect, useState } from "react"
import { Button } from "~/components/ui/button"
import { getServiceStatus, isElectron, startService } from "~/lib/electron"
import type { ServiceStatus } from "~/lib/electron"

// 引导阶段视图状态：检测中、已就绪、未就绪。
type BootPhase = "checking" | "ready" | "blocked"

/**
 * 第一版前端入口（FE-001 引导态）：检测并在需要时拉起本地 API 服务，
 * 验证 Electron preload 与统一 API 客户端基础设施可用，业务工作台在后续任务实现。
 */
export default function Home() {
  const [phase, setPhase] = useState<BootPhase>("checking")
  const [status, setStatus] = useState<ServiceStatus | null>(null)

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
    setPhase(next.running ? "ready" : "blocked")
  }, [])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-sm">
        <h1 className="text-base font-semibold">macTFS</h1>
        <p className="mt-1 text-sm text-muted-foreground">本地源码管理工作台</p>

        {phase === "checking" && (
          <p className="mt-4 text-sm text-muted-foreground">正在检查本地服务…</p>
        )}

        {phase === "ready" && status?.health && (
          <div className="mt-4 space-y-1 text-sm">
            <p className="font-medium text-emerald-600">本地服务已就绪</p>
            <p className="text-muted-foreground">
              地址：<span className="font-mono">{status.baseUrl}</span>
            </p>
            <p className="text-muted-foreground">
              连接状态：{status.health.connected ? "已连接 TFS" : "未连接 TFS"}
            </p>
            <p className="mt-3 text-muted-foreground">
              基础设施就绪，连接页与工作台将在后续任务实现。
            </p>
          </div>
        )}

        {phase === "blocked" && (
          <div className="mt-4 space-y-3 text-sm">
            <p className="font-medium text-red-600">本地服务未就绪</p>
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
