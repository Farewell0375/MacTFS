import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronRight, FolderClosed, FolderOpen, Loader2 } from "lucide-react"

import { ScrollArea } from "~/components/ui/scroll-area"
import { api } from "~/lib/api"
import type { ServerItem } from "~/lib/api"
import { getAncestorPaths, normalizeServerPath } from "~/lib/tfs/path"
import { SERVER_ROOT_PATH } from "~/lib/tfs/session"
import { cn } from "~/lib/utils"

/**
 * 左侧 Source Tree 面板：固定 Collection 下的服务端目录树，懒加载子目录，
 * 与中间列表共享当前路径；中间双击进入目录时自动展开并选中对应节点。
 */
export function SourceTreePanel({
  collection,
  selectedServerPath,
  onNavigate,
}: {
  collection: string
  selectedServerPath: string
  onNavigate: (serverPath: string) => void
}) {
  // path -> 子目录列表（仅 folder），undefined 表示尚未加载。
  const [childrenByPath, setChildrenByPath] = useState<Record<string, ServerItem[]>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    [SERVER_ROOT_PATH]: true,
  })
  const [loadingPaths, setLoadingPaths] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  // 已加载与加载中的路径集合，避免异步流程里读到过期 state。
  const requestedRef = useRef<Set<string>>(new Set())

  /**
   * 懒加载指定目录的子目录列表，已加载或加载中的路径直接跳过。
   */
  const ensureChildren = useCallback(
    async (serverPath: string) => {
      const target = normalizeServerPath(serverPath)
      if (requestedRef.current.has(target)) {
        return
      }
      requestedRef.current.add(target)
      setLoadingPaths((prev) => ({ ...prev, [target]: true }))
      const result = await api.getServerTree({ path: target, collection })
      setLoadingPaths((prev) => ({ ...prev, [target]: false }))
      if (!result.ok) {
        requestedRef.current.delete(target)
        setError(result.errorMessage ?? "目录加载失败")
        return
      }
      setError(null)
      const folders = (result.data?.items ?? []).filter((item) => item.folder)
      setChildrenByPath((prev) => ({ ...prev, [target]: folders }))
    },
    [collection],
  )

  // 当前路径变化时（含中间列表双击进入），逐级加载并展开祖先链与自身。
  useEffect(() => {
    let active = true
    void (async () => {
      const chain = [...getAncestorPaths(selectedServerPath), normalizeServerPath(selectedServerPath)]
      for (const path of chain) {
        if (!active) {
          return
        }
        await ensureChildren(path)
        setExpanded((prev) => (prev[path] ? prev : { ...prev, [path]: true }))
      }
    })()
    return () => {
      active = false
    }
  }, [selectedServerPath, ensureChildren])

  /**
   * 切换节点展开 / 收起，首次展开时触发懒加载。
   */
  const toggleExpand = useCallback(
    (serverPath: string) => {
      setExpanded((prev) => {
        const next = !prev[serverPath]
        if (next) {
          void ensureChildren(serverPath)
        }
        return { ...prev, [serverPath]: next }
      })
    },
    [ensureChildren],
  )

  /**
   * 点击节点名称：选中并导航到该目录，同时确保其展开。
   */
  const handleSelect = useCallback(
    (serverPath: string) => {
      onNavigate(serverPath)
      setExpanded((prev) => (prev[serverPath] ? prev : { ...prev, [serverPath]: true }))
      void ensureChildren(serverPath)
    },
    [onNavigate, ensureChildren],
  )

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r bg-sidebar">
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
        <span className="text-xs font-medium text-muted-foreground">源码目录</span>
        <span className="max-w-32 truncate text-xs text-muted-foreground">{collection}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          {error && (
            <p className="px-2 py-1 text-xs text-destructive">{error}</p>
          )}
          <TreeNode
            path={SERVER_ROOT_PATH}
            name={SERVER_ROOT_PATH}
            depth={0}
            childrenByPath={childrenByPath}
            expanded={expanded}
            loadingPaths={loadingPaths}
            selectedServerPath={normalizeServerPath(selectedServerPath)}
            onToggle={toggleExpand}
            onSelect={handleSelect}
          />
        </div>
      </ScrollArea>
    </aside>
  )
}

/**
 * 递归渲染目录树节点：缩进 + 展开箭头 + 文件夹图标 + 名称，行高 28px。
 */
function TreeNode({
  path,
  name,
  depth,
  childrenByPath,
  expanded,
  loadingPaths,
  selectedServerPath,
  onToggle,
  onSelect,
}: {
  path: string
  name: string
  depth: number
  childrenByPath: Record<string, ServerItem[]>
  expanded: Record<string, boolean>
  loadingPaths: Record<string, boolean>
  selectedServerPath: string
  onToggle: (serverPath: string) => void
  onSelect: (serverPath: string) => void
}) {
  const children = childrenByPath[path]
  const isExpanded = expanded[path] === true
  const isLoading = loadingPaths[path] === true
  const isSelected = selectedServerPath === path
  // 未加载前默认认为可能有子目录；加载后子目录为空则视为叶子。
  const isLeaf = children != null && children.length === 0

  return (
    <div>
      <div
        className={cn(
          "group flex h-7 items-center rounded-md pr-1",
          isSelected ? "bg-primary/10" : "hover:bg-muted",
        )}
        style={{ paddingLeft: `${depth * 14 + 2}px` }}
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          {isLoading ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          ) : isLeaf ? null : (
            <button
              type="button"
              aria-label={isExpanded ? "收起目录" : "展开目录"}
              onClick={() => onToggle(path)}
              className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            >
              <ChevronRight
                className={cn("size-3.5 transition-transform", isExpanded && "rotate-90")}
              />
            </button>
          )}
        </span>
        <button
          type="button"
          onClick={() => onSelect(path)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          {isExpanded && !isLeaf ? (
            <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <FolderClosed className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span
            className={cn(
              "truncate text-sm",
              isSelected && "font-medium text-foreground",
            )}
          >
            {name}
          </span>
        </button>
      </div>
      {isExpanded &&
        children?.map((child) => (
          <TreeNode
            key={child.serverPath}
            path={child.serverPath}
            name={child.name}
            depth={depth + 1}
            childrenByPath={childrenByPath}
            expanded={expanded}
            loadingPaths={loadingPaths}
            selectedServerPath={selectedServerPath}
            onToggle={onToggle}
            onSelect={onSelect}
          />
        ))}
    </div>
  )
}
