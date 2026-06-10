/**
 * 底部 Operation Console 骨架：操作日志列表与执行反馈在 FE-012 实现。
 */
export function ConsolePanel() {
  return (
    <footer className="flex h-[180px] shrink-0 flex-col border-t bg-background">
      <div className="flex h-8 shrink-0 items-center border-b px-3">
        <span className="text-xs font-medium text-muted-foreground">操作日志</span>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xs text-muted-foreground">操作日志将在后续任务展示</p>
      </div>
    </footer>
  )
}
