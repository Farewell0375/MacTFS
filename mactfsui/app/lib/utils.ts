import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 把毫秒时间戳格式化为 `YYYY-MM-DD HH:mm`，空值返回占位符。
 */
export function formatDateTime(value: number | null | undefined): string {
  if (value == null || value <= 0) {
    return "—"
  }
  const date = new Date(value)
  const pad = (input: number) => String(input).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
