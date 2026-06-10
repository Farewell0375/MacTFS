import { useCallback, useEffect, useMemo, useState } from "react"

import { TopBar, type PanelVisibility } from "~/components/app/top-bar"
import { FolderItemsPanel } from "~/components/explorer/folder-items-panel"
import { SourceTreePanel } from "~/components/explorer/source-tree-panel"
import { ChangesPanel } from "~/components/inspector/changes-panel"
import { ConsolePanel } from "~/components/logs/console-panel"
import { TooltipProvider } from "~/components/ui/tooltip"
import { api } from "~/lib/api"
import type { MappingInfo, PendingChange } from "~/lib/api"
import type { FileActionId, FileTarget, WorkspaceSession } from "~/lib/tfs"

/**
 * 三栏工作台外壳：顶部上下文栏 + 左侧目录树 + 中间主工作区 + 右侧 Changes + 底部 Console。
 * 持有面板显隐、挂起更改共享状态，并集中分发对象右键菜单动作。
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
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [pendingError, setPendingError] = useState<string | null>(null)
  // 中间列表刷新令牌：文件操作完成后递增触发重新加载。
  const [itemsRefreshToken, setItemsRefreshToken] = useState(0)
  const [actionError, setActionError] = useState<string | null>(null)

  /**
   * 切换指定面板的展开 / 收起状态。
   */
  const togglePanel = useCallback((panel: keyof PanelVisibility) => {
    setPanels((prev) => ({ ...prev, [panel]: !prev[panel] }))
  }, [])

  /**
   * 刷新当前 Workspace 的挂起更改列表。
   */
  const refreshPendingChanges = useCallback(async () => {
    setPendingLoading(true)
    const result = await api.getPendingChanges()
    setPendingLoading(false)
    if (!result.ok) {
      setPendingError(result.errorMessage ?? "挂起更改加载失败")
      return
    }
    setPendingError(null)
    setPendingChanges(result.data?.pendingChanges ?? [])
  }, [])

  useEffect(() => {
    void refreshPendingChanges()
  }, [refreshPendingChanges])

  // serverPath -> 挂起状态，供文件列表生成菜单时控制可用性。
  const pendingByServerPath = useMemo(() => {
    const map: Record<string, string> = {}
    for (const change of pendingChanges) {
      map[change.serverPath] = change.status
    }
    return map
  }, [pendingChanges])

  /**
   * 对象右键菜单动作统一分发器。
   * FE-006 实现取消映射；弹窗类与文件操作类动作由后续任务（FE-007 起）接管。
   */
  const handleFileAction = useCallback(
    async (target: FileTarget, action: FileActionId) => {
      setActionError(null)
      switch (action) {
        case "unmap": {
          const result = await api.deleteMapping({ serverPath: target.serverPath })
          if (!result.ok) {
            setActionError(result.errorMessage ?? "取消映射失败")
            return
          }
          // 不跳转当前浏览位置，仅更新 mappings 让动作可用性与状态列刷新。
          onMappingsChanged(result.data?.mappings ?? [])
          break
        }
        default:
          // map / compare / history / viewFile / diff（FE-007、FE-008），
          // getLatest / checkout（FE-009），delete / undo（FE-010）后续任务接管。
          break
      }
    },
    [onMappingsChanged],
  )

  return (
    <TooltipProvider>
      <div className="flex h-svh flex-col overflow-hidden bg-background">
        <TopBar
          session={session}
          panels={panels}
          onTogglePanel={togglePanel}
          onReconnect={onReconnect}
        />

        {actionError && (
          <div className="shrink-0 border-b bg-destructive/10 px-3 py-1 text-xs text-destructive">
            {actionError}
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          {panels.tree && (
            <SourceTreePanel
              collection={session.collection}
              mappings={session.mappings}
              selectedServerPath={selectedServerPath}
              onNavigate={onNavigate}
              onFileAction={handleFileAction}
            />
          )}
          <FolderItemsPanel
            session={session}
            selectedServerPath={selectedServerPath}
            pendingByServerPath={pendingByServerPath}
            refreshToken={itemsRefreshToken}
            onNavigate={onNavigate}
            onFileAction={handleFileAction}
          />
          {panels.changes && (
            <ChangesPanel
              mappings={session.mappings}
              pendingChanges={pendingChanges}
              loading={pendingLoading}
              error={pendingError}
              onFileAction={handleFileAction}
            />
          )}
        </div>

        {panels.console && <ConsolePanel />}
      </div>
    </TooltipProvider>
  )
}
