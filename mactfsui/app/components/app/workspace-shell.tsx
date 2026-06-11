import { useCallback, useState } from "react"

import { TopBar, type PanelVisibility } from "~/components/app/top-bar"
import { WorkspaceDialogs } from "~/components/app/workspace-dialogs"
import { FolderItemsPanel } from "~/components/explorer/folder-items-panel"
import { SourceTreePanel } from "~/components/explorer/source-tree-panel"
import { WorkspaceManageDialog } from "~/components/explorer/workspace-manage-dialog"
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
  // 工作区集中管理弹窗显隐。
  const [manageOpen, setManageOpen] = useState(false)

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
      {/* Finder 式布局：根容器不铺底色，vibrancy 下毛玻璃从顶栏与左侧栏透出 */}
      <div className="flex h-svh flex-col overflow-hidden">
        <TopBar
          session={session}
          panels={panels}
          onTogglePanel={togglePanel}
          onReconnect={onReconnect}
          onManageWorkspace={() => setManageOpen(true)}
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
          {/* 左右面板保持挂载，通过宽度过渡实现折叠 / 展开动画 */}
          <div
            className={cn(
              "flex min-h-0 shrink-0 overflow-hidden transition-[width] duration-250 ease-out-quart",
              panels.tree ? "w-[280px]" : "w-0",
            )}
          >
            <SourceTreePanel
              collection={session.collection}
              mappings={session.mappings}
              selectedServerPath={selectedServerPath}
              onNavigate={onNavigate}
              onFileAction={actions.handleFileAction}
            />
          </div>
          <FolderItemsPanel
            session={session}
            selectedServerPath={selectedServerPath}
            pendingByServerPath={pending.pendingByServerPath}
            refreshToken={itemsRefreshToken}
            onNavigate={onNavigate}
            onFileAction={actions.handleFileAction}
            onRefresh={refreshItems}
          />
          <div
            className={cn(
              "flex min-h-0 shrink-0 justify-end overflow-hidden transition-[width] duration-250 ease-out-quart",
              panels.changes ? "w-[340px]" : "w-0",
            )}
          >
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
          </div>
        </div>

        {/* 底部操作台通过高度过渡实现滑入滑出 */}
        <div
          className={cn(
            "shrink-0 overflow-hidden transition-[height] duration-250 ease-out-quart",
            panels.console ? "h-[180px]" : "h-0",
          )}
        >
          <ConsolePanel
            refreshToken={logsRefreshToken}
            busy={actions.actionBusy || actions.checkinBusy}
            busyText={actions.notice?.kind === "info" ? actions.notice.text : null}
          />
        </div>

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
          onBranchConfirmed={actions.handleBranchConfirmed}
          onMergeConfirmed={actions.handleMergeConfirmed}
          onAddFilesConfirmed={actions.handleAddFilesConfirmed}
        />

        {manageOpen && (
          <WorkspaceManageDialog
            session={session}
            onClose={() => setManageOpen(false)}
            onMappingsChanged={(mappings) => {
              // Mapping 变化影响树映射标识与列表状态列，统一刷新。
              onMappingsChanged(mappings)
              refreshItems()
            }}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
