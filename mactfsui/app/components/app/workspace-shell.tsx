import { Button } from "~/components/ui/button"
import type { WorkspaceSession } from "~/lib/tfs/session"

/**
 * 工作台占位外壳：展示已固定的 Collection / Workspace 上下文，三栏布局在 FE-004 实现。
 */
export function WorkspaceShell({
  session,
  onReconnect,
}: {
  session: WorkspaceSession
  onReconnect: () => void
}) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="font-semibold">macTFS</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">服务器</span>
          <span className="truncate font-mono text-xs">{session.serverUri}</span>
        </div>
        <Button size="sm" variant="outline" onClick={onReconnect}>
          重新连接
        </Button>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-sm">
          <p className="text-sm font-medium">工作台上下文已固定</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Collection</dt>
              <dd className="truncate font-medium">{session.collection}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">当前 Workspace</dt>
              <dd className="truncate font-mono text-xs">{session.workspace}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">映射数</dt>
              <dd className="font-medium">{session.mappings.length}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">
            三栏工作台布局、目录树与文件列表将在后续任务实现。
          </p>
        </div>
      </main>
    </div>
  )
}
