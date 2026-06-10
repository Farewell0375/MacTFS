import { FileText, FolderClosed, ListChecks, Loader2 } from "lucide-react"

import { FileTargetMenu } from "~/components/app/file-target-menu"
import { Badge } from "~/components/ui/badge"
import { ScrollArea } from "~/components/ui/scroll-area"
import type { MappingInfo, PendingChange } from "~/lib/api"
import type { FileActionId, FileTarget } from "~/lib/tfs"
import { makeFileTarget, statusBadgeClass, statusLabel } from "~/lib/tfs"
import { cn } from "~/lib/utils"

/**
 * 右侧 Changes 面板：展示当前 Workspace 的挂起更改列表，项支持右键菜单；
 * Included / Excluded 分组与 Checkin 提交在 FE-010 实现。
 */
export function ChangesPanel({
  mappings,
  pendingChanges,
  loading,
  error,
  onFileAction,
}: {
  mappings: MappingInfo[]
  pendingChanges: PendingChange[]
  loading: boolean
  error: string | null
  onFileAction: (target: FileTarget, action: FileActionId) => void
}) {
  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l bg-sidebar">
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
        <span className="text-xs font-medium text-muted-foreground">挂起更改</span>
        {pendingChanges.length > 0 && (
          <span className="text-xs text-muted-foreground">{pendingChanges.length} 项</span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          正在加载挂起更改…
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center p-4 text-xs text-destructive">
          {error}
        </div>
      ) : pendingChanges.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <ListChecks className="size-6 text-muted-foreground/60" />
            <p className="text-xs leading-5 text-muted-foreground">当前没有挂起更改</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <ul className="p-2">
            {pendingChanges.map((change) => {
              const target = makeFileTarget({
                source: "pending",
                folder: change.folder,
                serverPath: change.serverPath,
                mappings,
                pendingStatus: change.status,
              })
              return (
                <FileTargetMenu key={change.serverPath} target={target} onAction={onFileAction}>
                  <li
                    className="flex h-9 cursor-default items-center gap-2 rounded-md px-2 select-none hover:bg-muted"
                    title={change.serverPath}
                  >
                    {change.folder ? (
                      <FolderClosed className="size-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{change.name}</span>
                      <span className="block truncate font-mono text-[10px] leading-3 text-muted-foreground">
                        {change.serverPath}
                      </span>
                    </span>
                    <Badge
                      variant="secondary"
                      className={cn("shrink-0 rounded-md", statusBadgeClass(change.status))}
                    >
                      {statusLabel(change.status)}
                    </Badge>
                  </li>
                </FileTargetMenu>
              )
            })}
          </ul>
        </ScrollArea>
      )}

      <div className="shrink-0 border-t px-3 py-2 text-xs text-muted-foreground">
        签入提交将在后续任务在本面板提供
      </div>
    </aside>
  )
}
