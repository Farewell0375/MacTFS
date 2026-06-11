import { useCallback, useEffect, useState } from "react"

// 主题偏好：跟随系统 / 强制亮色 / 强制暗色。
export type ThemePreference = "system" | "light" | "dark"

const STORAGE_KEY = "mactfs.theme"
const CYCLE_ORDER: ThemePreference[] = ["system", "light", "dark"]

/**
 * 当前系统外观是否为暗色。
 */
function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
}

/**
 * 由偏好推导是否应启用暗色。
 */
function resolveIsDark(preference: ThemePreference): boolean {
  return preference === "dark" || (preference === "system" && systemPrefersDark())
}

/**
 * 读取持久化的主题偏好，无记录或不可用时默认跟随系统。
 */
function loadPreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system"
  }
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw === "light" || raw === "dark" ? raw : "system"
}

/**
 * 应用主题到根节点：切换 .dark class，并短暂启用全局颜色过渡动画。
 */
function applyTheme(preference: ThemePreference) {
  const root = document.documentElement
  root.classList.add("theme-transition")
  root.classList.toggle("dark", resolveIsDark(preference))
  window.setTimeout(() => root.classList.remove("theme-transition"), 320)
}

/**
 * 明暗主题 hook：维护「跟随系统 / 亮 / 暗」三态偏好，持久化到 localStorage，
 * 跟随系统时监听系统外观变化自动切换。
 */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(loadPreference)

  useEffect(() => {
    applyTheme(preference)
    if (preference !== "system") {
      return
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => applyTheme("system")
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [preference])

  /**
   * 设置主题偏好并持久化。
   */
  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 本地存储不可用时仅在当前会话生效
    }
  }, [])

  /**
   * 按 跟随系统 → 亮色 → 暗色 顺序循环切换。
   */
  const cycle = useCallback(() => {
    const index = CYCLE_ORDER.indexOf(preference)
    setPreference(CYCLE_ORDER[(index + 1) % CYCLE_ORDER.length])
  }, [preference, setPreference])

  return { preference, setPreference, cycle }
}
