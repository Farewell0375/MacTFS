import { useCallback, useState } from "react"

import { TopBar, type PanelVisibility } from "~/components/app/top-bar"
import { WorkspaceDialogs } from "~/components/app/workspace-dialogs"
import { FolderItemsPanel } from "~/components/explorer/folder-items-panel"
import { SourceTreePanel } from "~/components/explorer/source-tree-panel"
import { ChangesPanel } from "~/components/inspector/changes-panel"
import { ConsolePanel } from "~/components/logs/console-panel"
import { TooltipProvider } from "~/components/ui/tooltip"
import { useFileActions } from "~/hooks/use-file-actions"
import { usePendingChanges } from "~/hooks/use-pending-changes"
import type { MappingInfo } from "~/lib/api"
import type { WorkspaceSession } from "~/lib/tfs"
import { cn } from "~/lib/utils"

/**
 * 三栏工作台外壳：组合顶部上下文栏、左树、中间列表、右侧 Changes、底部 Console。
 * 挂起更改状态与对象动作编排分别收口在 usePendingChanges / useFileActions。
 */
export function WorkspaceShell({
  session,
  selectedServerPath,
  onNavigate,
  onMappingsChanged,
  onReconnect,
}: {
  session: WorkspaceSession
  selectedServerPath: string
  onNavigate: (serverPath: string) => void
  onMappingsChanged: (mappings: MappingInfo[]) => void
  onReconnect: () => void
}) {
  const [panels, setPanels] = useState<PanelVisibility>({
    tree: true,
    changes: true,
    console: true,
  })
  // 中间列表 / 底部日志刷新令牌：文件操作完成后递增触发重新加载。
  const [itemsRefreshToken, setItemsRefreshToken] = useState(0)
  const [logsRefreshToken, setLogsRefreshToken] = useState(0)

  /**
   * 切换指定面板的展开 / 收起状态。
   */
  const togglePanel = useCallback((panel: keyof PanelVisibility) => {
    setPanels((prev) => ({ ...prev, [panel]: !prev[panel] }))
  }, [])

  /**
   * 触发中间目录列表重新加载。
   */
  const refreshItems = useCallback(() => {
    setItemsRefreshToken((token) => token + 1)
  }, [])

  /**
   * 触发底部操作日志重新加载。
   */
  const refreshLogs = useCallback(() => {
    setLogsRefreshToken((token) => token + 1)
  }, [])

  const pending = usePendingChanges()
  const actions = useFileActions({
    onMappingsChanged,
    refreshPendingChanges: pending.refresh,
    refreshItems,
    refreshLogs,
  })

  return (
    <TooltipProvider>
      <div className="flex h-svh flex-col overflow-hidden bg-background">
        <TopBar
          session={session}
          panels={panels}
          onTogglePanel={togglePanel}
          onReconnect={onReconnect}
        />

        {actions.notice && (
          <div
            className={cn(
              "flex shrink-0 items-center gap-2 border-b px-3 py-1 text-xs",
              actions.notice.kind === "error"
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/5 text-foreground",
            )}
          >
            {actions.actionBusy && (
              <span className="size-2 animate-pulse rounded-full bg-primary" />
            )}
            {actions.notice.text}
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          {panels.tree && (
            <SourceTreePanel
              collection={session.collection}
              mappings={session.mappings}
              selectedServerPath={selectedServerPath}
              onNavigate={onNavigate}
              onFileAction={actions.handleFileAction}
            />
          )}
          <FolderItemsPanel
            session={session}
            selectedServerPath={selectedServerPath}
            pendingByServerPath={pending.pendingByServerPath}
            refreshToken={itemsRefreshToken}
            onNavigate={onNavigate}
            onFileAction={actions.handleFileAction}
            onRefresh={refreshItems}
          />
          {panels.changes && (
            <ChangesPanel
              mappings={session.mappings}
              pendingChanges={pending.pendingChanges}
              excludedKeys={pending.excludedKeys}
              loading={pending.loading}
              error={pending.error}
              checkinBusy={actions.checkinBusy}
              onToggleExcluded={pending.toggleExcluded}
              onCheckin={actions.handleCheckin}
              onFileAction={actions.handleFileAction}
              onRefresh={() => void pending.refresh()}
            />
          )}
        </div>

        {panels.console && (
          <ConsolePanel
            refreshToken={logsRefreshToken}
            busy={actions.actionBusy || actions.checkinBusy}
            busyText={actions.notice?.kind === "info" ? actions.notice.text : null}
          />
        )}

        <WorkspaceDialogs
          dialog={actions.dialog}
          mappings={session.mappings}
          onClose={() => actions.setDialog(null)}
          onOpen={actions.setDialog}
          onFileAction={actions.handleFileAction}
          onMappingCreated={actions.handleMappingCreated}
          onConflictsResolved={actions.handleConflictsResolved}
          onForceGetConfirmed={actions.handleForceGetConfirmed}
          onGetVersion={actions.runGetVersion}
          onRenameConfirmed={actions.handleRenameConfirmed}
          onRollback={actions.runRollback}
        />
      </div>
    </TooltipProvider>
  )
}
