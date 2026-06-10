import { ListChecks } from "lucide-react"

/**
 * 右侧 Changes 面板骨架：Pending Changes 列表与 Checkin 入口在 FE-010 实现。
 */
export function ChangesPanel() {
  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l bg-sidebar">
      <div className="flex h-9 shrink-0 items-center border-b px-3">
        <span className="text-xs font-medium text-muted-foreground">挂起更改</span>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <ListChecks className="size-6 text-muted-foreground/60" />
          <p className="text-xs leading-5 text-muted-foreground">
            挂起更改与签入将在后续任务实现
          </p>
        </div>
      </div>
    </aside>
  )
}
