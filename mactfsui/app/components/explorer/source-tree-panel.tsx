import { FolderClosed } from "lucide-react"

import { ScrollArea } from "~/components/ui/scroll-area"
import { SERVER_ROOT_PATH } from "~/lib/tfs/session"
import { cn } from "~/lib/utils"

/**
 * 左侧 Source Tree 面板骨架：展示固定 Collection 的根节点并与中间列表共享路径状态，
 * 目录树懒加载与子节点展开在 FE-005 实现。
 */
export function SourceTreePanel({
  collection,
  selectedServerPath,
  onNavigate,
}: {
  collection: string
  selectedServerPath: string
  onNavigate: (serverPath: string) => void
}) {
  const rootActive = selectedServerPath === SERVER_ROOT_PATH
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r bg-sidebar">
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
        <span className="text-xs font-medium text-muted-foreground">源码目录</span>
        <span className="max-w-32 truncate text-xs text-muted-foreground">{collection}</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          <button
            type="button"
            onClick={() => onNavigate(SERVER_ROOT_PATH)}
            className={cn(
              "flex h-7 w-full items-center gap-1.5 rounded-md px-2 text-left text-sm",
              rootActive
                ? "bg-primary/10 font-medium text-foreground"
                : "text-foreground hover:bg-muted",
            )}
          >
            <FolderClosed className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono text-xs">{SERVER_ROOT_PATH}</span>
          </button>
          <p className="px-2 py-3 text-xs leading-5 text-muted-foreground">
            服务端目录树将在后续任务加载，当前仅提供根节点导航。
          </p>
        </div>
      </ScrollArea>
    </aside>
  )
}
