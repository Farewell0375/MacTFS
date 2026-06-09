import { useEffect, type ReactNode } from "react"

interface ContextMenuItem {
  key: string
  label: string
  disabled?: boolean
  hidden?: boolean
  danger?: boolean
  onSelect(): void
}

interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

interface ContextMenuProps {
  menu?: ContextMenuState
  onClose(): void
}

interface ContextMenuTriggerProps {
  className?: string
  children: ReactNode
  items: ContextMenuItem[]
  onOpen(menu: ContextMenuState): void
}

/**
 * 渲染桌面工具右键菜单，用于文件、目录树和 Pending Changes 对象操作。
 */
export function ContextMenu({ menu, onClose }: ContextMenuProps) {
  useEffect(() => {
    if (!menu) {
      return
    }

    function close() {
      onClose()
    }

    window.addEventListener("click", close)
    window.addEventListener("keydown", close)
    return () => {
      window.removeEventListener("click", close)
      window.removeEventListener("keydown", close)
    }
  }, [menu, onClose])

  if (!menu) {
    return null
  }

  const items = menu.items.filter((item) => !item.hidden)

  return (
    <div
      className="fixed z-50 min-w-48 overflow-hidden rounded-[6px] border bg-popover py-1 text-xs shadow-lg"
      style={{ left: menu.x, top: menu.y }}
      onClick={(event) => event.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.key}
          className={`flex h-7 w-full items-center px-2 text-left ${
            item.danger ? "text-destructive" : "text-popover-foreground"
          } ${item.disabled ? "opacity-50" : "hover:bg-muted"}`}
          disabled={item.disabled}
          onClick={() => {
            item.onSelect()
            onClose()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

/**
 * 给任意行元素接入右键菜单打开逻辑，保持业务组件只声明菜单项。
 */
export function ContextMenuTrigger({
  className,
  children,
  items,
  onOpen,
}: ContextMenuTriggerProps) {
  return (
    <div
      className={className}
      onContextMenu={(event) => {
        event.preventDefault()
        onOpen({ x: event.clientX, y: event.clientY, items })
      }}
    >
      {children}
    </div>
  )
}

export type { ContextMenuItem, ContextMenuState }
