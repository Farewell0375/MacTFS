import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

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

// toast 类型对应的图标、强调条与边框配色：彩色左侧条 + 着色边框提高辨识度。
const KIND_VISUALS: Record<
  ToastKind,
  { icon: typeof CheckCircle2; iconClass: string; barClass: string; borderClass: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    barClass: "bg-emerald-500",
    borderClass: "border-emerald-500/35",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-destructive",
    barClass: "bg-destructive",
    borderClass: "border-destructive/40",
  },
  loading: {
    icon: Loader2,
    iconClass: "animate-spin text-primary",
    barClass: "bg-primary",
    borderClass: "border-primary/35",
  },
}

/**
 * toast 挂载点：固定在窗口右上角（顶栏下方），新条目自上滑入，点击可关闭。
 * 彩色强调条 + 着色边框 + 毛玻璃底，保证进度与结果提示足够显眼。
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
    <div className="pointer-events-none fixed top-14 right-3 z-[60] flex w-[380px] flex-col gap-2">
      {items.map((item) => {
        const visual = KIND_VISUALS[item.kind]
        const Icon = visual.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => dismissToast(item.id)}
            className={cn(
              "animate-in fade-in slide-in-from-top-3 ease-out-quart pointer-events-auto relative flex items-start gap-2.5 overflow-hidden rounded-xl border bg-popover/95 py-3 pr-3.5 pl-4 text-left text-sm font-medium shadow-overlay backdrop-blur-md duration-250",
              visual.borderClass,
            )}
          >
            <span className={cn("absolute inset-y-0 left-0 w-1", visual.barClass)} />
            <Icon className={cn("mt-0.5 size-4.5 shrink-0", visual.iconClass)} />
            <span className="min-w-0 break-words">{item.text}</span>
          </button>
        )
      })}
    </div>
  )
}
