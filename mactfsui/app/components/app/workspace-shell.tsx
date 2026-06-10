import { useCallback, useState } from "react"

import { TopBar, type PanelVisibility } from "~/components/app/top-bar"
import { FolderItemsPanel } from "~/components/explorer/folder-items-panel"
import { SourceTreePanel } from "~/components/explorer/source-tree-panel"
import { ChangesPanel } from "~/components/inspector/changes-panel"
import { ConsolePanel } from "~/components/logs/console-panel"
import { TooltipProvider } from "~/components/ui/tooltip"
import type { WorkspaceSession } from "~/lib/tfs/session"

/**
 * 三栏工作台外壳：顶部上下文栏 + 左侧目录树 + 中间主工作区 + 右侧 Changes + 底部 Console，
 * 左、右、底面板支持收起；当前路径由上层 home.tsx 统一维护并下发。
 */
export function WorkspaceShell({
  session,
  selectedServerPath,
  onNavigate,
  onReconnect,
}: {
  session: WorkspaceSession
  selectedServerPath: string
  onNavigate: (serverPath: string) => void
  onReconnect: () => void
}) {
  const [panels, setPanels] = useState<PanelVisibility>({
    tree: true,
    changes: true,
    console: true,
  })

  /**
   * 切换指定面板的展开 / 收起状态。
   */
  const togglePanel = useCallback((panel: keyof PanelVisibility) => {
    setPanels((prev) => ({ ...prev, [panel]: !prev[panel] }))
  }, [])

  return (
    <TooltipProvider>
      <div className="flex h-svh flex-col overflow-hidden bg-background">
        <TopBar
          session={session}
          panels={panels}
          onTogglePanel={togglePanel}
          onReconnect={onReconnect}
        />

        <div className="flex min-h-0 flex-1">
          {panels.tree && (
            <SourceTreePanel
              collection={session.collection}
              selectedServerPath={selectedServerPath}
              onNavigate={onNavigate}
            />
          )}
          <FolderItemsPanel
            session={session}
            selectedServerPath={selectedServerPath}
            onNavigate={onNavigate}
          />
          {panels.changes && <ChangesPanel />}
        </div>

        {panels.console && <ConsolePanel />}
      </div>
    </TooltipProvider>
  )
}
