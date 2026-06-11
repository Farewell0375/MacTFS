import { FolderCog, PanelBottom, PanelLeft, PanelRight, Unplug } from "lucide-react"

import { Button } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip"
import { isMacElectron } from "~/lib/platform"
import type { WorkspaceSession } from "~/lib/tfs/session"
import { cn } from "~/lib/utils"

// 三个可折叠面板的显隐状态，由 WorkspaceShell 持有。
export interface PanelVisibility {
  tree: boolean
  changes: boolean
  console: boolean
}

/**
 * 顶部上下文栏：展示固定的 Server / Collection / Workspace 上下文，
 * 以及面板折叠开关与重新连接入口，不承载对象级操作。
 */
export function TopBar({
  session,
  panels,
  onTogglePanel,
  onReconnect,
  onManageWorkspace,
}: {
  session: WorkspaceSession
  panels: PanelVisibility
  onTogglePanel: (panel: keyof PanelVisibility) => void
  onReconnect: () => void
  onManageWorkspace: () => void
}) {
  // 隐藏式标题栏下顶栏整体作为拖拽区，并为左上角红绿灯预留空间。
  const macInset = isMacElectron()
  return (
    <header
      className={cn(
        "app-drag flex h-12 shrink-0 items-center justify-between gap-3 border-b px-3",
        macInset && "pl-20",
      )}
    >
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="shrink-0 font-semibold">MacTFS</span>
        <Separator orientation="vertical" className="h-4!" />
        <span className="hidden shrink-0 text-xs text-muted-foreground lg:inline">
          服务器
        </span>
        <span className="hidden max-w-56 truncate font-mono text-xs lg:inline">
          {session.serverUri}
        </span>
        <Separator orientation="vertical" className="hidden h-4! lg:block" />
        <span className="shrink-0 text-xs text-muted-foreground">Collection</span>
        <span className="max-w-40 truncate text-xs font-medium">{session.collection}</span>
        <Separator orientation="vertical" className="h-4!" />
        <span className="shrink-0 text-xs text-muted-foreground">Workspace</span>
        <span className="max-w-44 truncate font-mono text-xs">{session.workspace}</span>
      </div>

      <div className="app-no-drag flex shrink-0 items-center gap-1">
        <PanelToggle
          label="源码目录面板"
          active={panels.tree}
          onClick={() => onTogglePanel("tree")}
        >
          <PanelLeft />
        </PanelToggle>
        <PanelToggle
          label="挂起更改面板"
          active={panels.changes}
          onClick={() => onTogglePanel("changes")}
        >
          <PanelRight />
        </PanelToggle>
        <PanelToggle
          label="操作日志面板"
          active={panels.console}
          onClick={() => onTogglePanel("console")}
        >
          <PanelBottom />
        </PanelToggle>
        <Separator orientation="vertical" className="mx-1 h-4!" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon-sm" variant="ghost" onClick={onManageWorkspace} aria-label="工作区与映射管理">
              <FolderCog />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">工作区与映射管理</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon-sm" variant="ghost" onClick={onReconnect} aria-label="重新连接">
              <Unplug />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">重新连接</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}

/**
 * 面板折叠开关按钮：图标 + tooltip，激活态用底色区分。
 */
function PanelToggle({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-pressed={active}
          onClick={onClick}
          className={cn(!active && "text-muted-foreground")}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {active ? `收起${label}` : `展开${label}`}
      </TooltipContent>
    </Tooltip>
  )
}
