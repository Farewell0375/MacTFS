import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu"
import type { FileActionId, FileTarget } from "~/lib/tfs"
import { buildFileMenu } from "~/lib/tfs"
import { cn } from "~/lib/utils"

/**
 * 对象右键菜单容器：包住任意触发区域，按统一动作模型渲染菜单分组，
 * 置灰项展示原因后缀，点击可用项回调上层动作分发器。
 */
export function FileTargetMenu({
  target,
  onAction,
  children,
}: {
  target: FileTarget
  onAction: (target: FileTarget, action: FileActionId) => void
  children: React.ReactNode
}) {
  const sections = buildFileMenu(target)
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {sections.map((items, index) => (
          <Section key={index} withSeparator={index > 0}>
            {items.map((item) => (
              <ContextMenuItem
                key={item.id}
                disabled={!item.enabled}
                variant={item.danger && item.enabled ? "destructive" : "default"}
                onSelect={() => onAction(target, item.id)}
              >
                <span>{item.label}</span>
                {!item.enabled && item.reason && (
                  <span className={cn("ml-auto pl-3 text-xs text-muted-foreground")}>
                    {item.reason}
                  </span>
                )}
              </ContextMenuItem>
            ))}
          </Section>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  )
}

/**
 * 菜单分组：非首组前自动插入分隔线。
 */
function Section({
  withSeparator,
  children,
}: {
  withSeparator: boolean
  children: React.ReactNode
}) {
  return (
    <>
      {withSeparator && <ContextMenuSeparator />}
      {children}
    </>
  )
}
