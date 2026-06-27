import { useCallback, useEffect, useMemo, useState } from "react"

import { api } from "~/lib/api"
import type { PendingChange } from "~/lib/api"

/**
 * 挂起更改共享状态：列表加载 / 刷新、Included-Excluded 维护，
 * 以及供菜单可用性判断的 serverPath -> 状态 映射。
 */
export function usePendingChanges() {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Excluded 的挂起更改 serverPath 集合（不持久化），其余默认 Included。
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set())

  /**
   * 刷新当前 Workspace 的挂起更改列表，并清理悬挂的 Excluded 键。
   */
  const refresh = useCallback(async () => {
    setLoading(true)
    const result = await api.getPendingChanges()
    setLoading(false)
    if (!result.ok) {
      setError(result.errorMessage ?? "挂起更改加载失败")
      return
    }
    setError(null)
    const list = result.data?.pendingChanges ?? []
    setPendingChanges(list)
    setExcludedKeys((prev) => {
      const valid = new Set(list.map((change) => change.serverPath))
      const next = new Set([...prev].filter((key) => valid.has(key)))
      return next.size === prev.size ? prev : next
    })
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /**
   * 批量设置一组挂起更改的 Included / Excluded 归属。
   * 单项勾选传单元素数组，目录节点级联传子树全部 serverPath。
   * excluded=true 全部排除，false 全部移回 Included。
   */
  const setExcluded = useCallback((serverPaths: string[], excluded: boolean) => {
    if (serverPaths.length === 0) {
      return
    }
    setExcludedKeys((prev) => {
      const next = new Set(prev)
      for (const serverPath of serverPaths) {
        if (excluded) {
          next.add(serverPath)
        } else {
          next.delete(serverPath)
        }
      }
      return next
    })
  }, [])

  // serverPath -> 挂起状态，供文件列表生成菜单时控制可用性。
  const pendingByServerPath = useMemo(() => {
    const map: Record<string, string> = {}
    for (const change of pendingChanges) {
      map[change.serverPath] = change.status
    }
    return map
  }, [pendingChanges])

  return {
    pendingChanges,
    loading,
    error,
    excludedKeys,
    pendingByServerPath,
    refresh,
    setExcluded,
  }
}
