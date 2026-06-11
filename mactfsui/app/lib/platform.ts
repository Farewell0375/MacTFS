/**
 * 是否运行在 macOS 的 Electron 窗口内。
 * 用于判断隐藏式标题栏与 vibrancy 场景：需要为红绿灯预留空间并启用顶栏拖拽。
 */
export function isMacElectron(): boolean {
  if (typeof navigator === "undefined") {
    return false
  }
  const ua = navigator.userAgent
  return ua.includes("Electron") && ua.includes("Macintosh")
}
