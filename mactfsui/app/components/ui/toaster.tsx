import { useEffect, useState } from "react"
import { Check, Loader2, X } from "lucide-react"

import { cn } from "~/lib/utils"

// 轻量 toast：success / error 自动消失，loading 常驻直到被同 id 更新或手动关闭。
export type ToastKind = "success" | "error" | "loading"

export interface ToastItem {
  id: string
  kind: ToastKind
  text: string
}

type Listener = (toasts: ToastItem[]) => void

// 模块级单例状态，让任意调用方无需 context 即可弹出 toast。
let currentToasts: ToastItem[] = []
const listeners = new Set<Listener>()
const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>()

const AUTO_DISMISS_MS = 3200
const MAX_VISIBLE = 4

/**
 * 通知所有挂载中的 Toaster 重新渲染。
 */
function emit() {
  for (const listener of listeners) {
    listener(currentToasts)
  }
}

/**
 * 关闭指定 toast。
 */
export function dismissToast(id: string) {
  const timer = dismissTimers.get(id)
  if (timer) {
    clearTimeout(timer)
    dismissTimers.delete(id)
  }
  currentToasts = currentToasts.filter((item) => item.id !== id)
  emit()
}

/**
 * 展示或更新一条 toast：同 id 复用同一条目并重置自动消失计时；
 * loading 类型不自动消失，等待后续同 id 的 success / error 替换。
 */
export function showToast(input: { id?: string; kind: ToastKind; text: string }): string {
  const id = input.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const existing = currentToasts.find((item) => item.id === id)
  const next: ToastItem = { id, kind: input.kind, text: input.text }
  currentToasts = existing
    ? currentToasts.map((item) => (item.id === id ? next : item))
    : [...currentToasts.slice(-(MAX_VISIBLE - 1)), next]
  const timer = dismissTimers.get(id)
  if (timer) {
    clearTimeout(timer)
    dismissTimers.delete(id)
  }
  if (input.kind !== "loading") {
    dismissTimers.set(
      id,
      setTimeout(() => dismissToast(id), AUTO_DISMISS_MS),
    )
  }
  emit()
  return id
}

// toast 类型对应的状态徽标：macOS 通知风的彩色小圆徽（成功绿 / 失败红），loading 用旋转图标。
const KIND_BADGES: Record<"success" | "error", { icon: typeof Check; chipClass: string }> = {
  success: { icon: Check, chipClass: "bg-emerald-500" },
  error: { icon: X, chipClass: "bg-destructive" },
}

/**
 * toast 挂载点：固定在窗口右上角（顶栏下方），新条目自上滑入，点击可关闭。
 * 视觉对齐 macOS 系统通知：白色毛玻璃圆角卡片 + 彩色状态圆徽 + 柔和投影，无彩色边框。
 */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const listener: Listener = (toasts) => setItems([...toasts])
    listeners.add(listener)
    setItems([...currentToasts])
    return () => {
      listeners.delete(listener)
    }
  }, [])

  if (items.length === 0) {
    return null
  }

  return (
    <div className="pointer-events-none fixed top-14 right-4 z-[60] flex flex-col items-end gap-2.5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => dismissToast(item.id)}
          className="animate-in fade-in slide-in-from-top-2 ease-out-quart pointer-events-auto flex w-fit max-w-[360px] min-w-[200px] items-center gap-2.5 rounded-xl border border-black/8 bg-popover/90 py-2.5 pr-4 pl-3 text-left shadow-[0_8px_24px_rgb(0_0_0/0.12),0_2px_6px_rgb(0_0_0/0.06)] backdrop-blur-xl duration-300"
        >
          {item.kind === "loading" ? (
            <Loader2 className="size-4.5 shrink-0 animate-spin text-primary" />
          ) : (
            <ToastBadge kind={item.kind} />
          )}
          <span className="min-w-0 text-[13px] leading-snug font-medium break-words text-foreground">
            {item.text}
          </span>
        </button>
      ))}
    </div>
  )
}

/**
 * 成功 / 失败的彩色圆形徽标：实色圆底 + 白色粗描边图标。
 */
function ToastBadge({ kind }: { kind: "success" | "error" }) {
  const badge = KIND_BADGES[kind]
  const Icon = badge.icon
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full",
        badge.chipClass,
      )}
    >
      <Icon className="size-3 text-white" strokeWidth={3.2} />
    </span>
  )
}
