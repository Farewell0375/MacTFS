import { useEffect, type ReactNode } from "react"
import { X } from "lucide-react"

import { Button } from "~/components/ui/button"

interface SimpleDialogProps {
  open: boolean
  title: string
  description?: string
  className?: string
  children: ReactNode
  onClose(): void
}

/**
 * 渲染轻量桌面弹窗，承载阶段五从主工作区移出的 Mapping、History、Diff 和文件查看内容。
 */
export function SimpleDialog({
  open,
  title,
  description,
  className = "",
  children,
  onClose,
}: SimpleDialogProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-6 backdrop-blur-sm">
      <div
        className={`flex max-h-[calc(100svh-48px)] w-[min(1040px,calc(100vw-48px))] min-w-0 flex-col overflow-hidden rounded-[8px] border bg-background shadow-xl ${className}`}
      >
        <div className="flex min-h-10 items-center justify-between gap-3 border-b bg-muted/20 px-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{title}</div>
            {description && (
              <div className="truncate font-mono text-xs text-muted-foreground">
                {description}
              </div>
            )}
          </div>
          <Button size="icon-xs" variant="ghost" title="关闭" onClick={onClose}>
            <X />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
