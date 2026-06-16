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
 * 顶部上下文栏：仿 Finder 的居中上下文胶囊展示 Collection / Workspace
 * （悬停查看服务器地址），右侧为面板折叠开关与重新连接入口，不承载对象级操作。
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
        "app-drag flex h-12 shrink-0 items-center justify-between gap-3 px-3",
        macInset && "pl-20",
      )}
    >
      {/* 左侧：程序名 + Collection 胶囊；服务器地址与工作区收进悬停提示 */}
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="shrink-0 text-sm font-medium">MacTFS</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="app-no-drag flex h-7 min-w-0 items-center rounded-lg bg-foreground/5 px-3 text-xs text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground">
              <span className="truncate">{session.collection}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <div className="space-y-0.5">
              <p>
                服务器 <span className="font-mono">{session.serverUri}</span>
              </p>
              <p>
                工作区 <span className="font-mono">{session.workspace}</span>
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
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
