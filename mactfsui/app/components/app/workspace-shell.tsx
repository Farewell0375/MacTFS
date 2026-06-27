import { useCallback, useEffect, useState } from "react"

import { McpStatusDialog } from "~/components/app/mcp-status-dialog"
import { TopBar, type PanelVisibility } from "~/components/app/top-bar"
import { WorkspaceDialogs } from "~/components/app/workspace-dialogs"
import { FolderItemsPanel } from "~/components/explorer/folder-items-panel"
import { SourceTreePanel } from "~/components/explorer/source-tree-panel"
import { WorkspaceManageDialog } from "~/components/explorer/workspace-manage-dialog"
import { ChangesPanel } from "~/components/inspector/changes-panel"
import { ConsolePanel } from "~/components/logs/console-panel"
import { Toaster, showToast } from "~/components/ui/toaster"
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
  // MCP 状态弹窗显隐。
  const [mcpOpen, setMcpOpen] = useState(false)

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

  // 把动作编排的 notice 转成右上角 toast：固定 id 让「正在…」与结果复用同一条目。
  useEffect(() => {
    if (!actions.notice) {
      return
    }
    const { kind, text } = actions.notice
    showToast({
      id: "action",
      kind: kind === "error" ? "error" : text.startsWith("正在") ? "loading" : "success",
      text,
    })
  }, [actions.notice])

  return (
    <TooltipProvider>
      {/* 毛玻璃画布 + 卡片化面板：半透明画布透出 vibrancy，四个面板为圆角卡片留缝隙 */}
      <div className="canvas-surface flex h-svh flex-col overflow-hidden">
        <TopBar
          session={session}
          panels={panels}
          onTogglePanel={togglePanel}
          onReconnect={onReconnect}
          onManageWorkspace={() => setManageOpen(true)}
          onOpenMcpStatus={() => setMcpOpen(true)}
        />

        <div className="flex min-h-0 flex-1 px-2 pb-2">
          {/* 左右面板保持挂载，通过宽度 + 间距过渡实现折叠 / 展开动画 */}
          <div
            className={cn(
              "flex min-h-0 shrink-0 overflow-hidden transition-[width,margin] duration-250 ease-out-quart",
              panels.tree ? "mr-2 w-[280px]" : "mr-0 w-0",
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
              "flex min-h-0 shrink-0 justify-end overflow-hidden transition-[width,margin] duration-250 ease-out-quart",
              panels.changes ? "ml-2 w-[340px]" : "ml-0 w-0",
            )}
          >
            <ChangesPanel
              mappings={session.mappings}
              pendingChanges={pending.pendingChanges}
              excludedKeys={pending.excludedKeys}
              loading={pending.loading}
              error={pending.error}
              checkinBusy={actions.checkinBusy}
              onSetExcluded={pending.setExcluded}
              onCheckin={actions.handleCheckin}
              onFileAction={actions.handleFileAction}
              onRefresh={() => void pending.refresh()}
            />
          </div>
        </div>

        {/* 底部操作台通过高度过渡实现滑入滑出 */}
        <div
          className={cn(
            "box-border shrink-0 overflow-hidden px-2 transition-[height] duration-250 ease-out-quart",
            panels.console ? "h-[188px] pb-2" : "h-0",
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

        {mcpOpen && <McpStatusDialog onClose={() => setMcpOpen(false)} />}

        <Toaster />
      </div>
    </TooltipProvider>
  )
}
