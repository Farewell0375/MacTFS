import { useEffect, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Loader2,
} from "lucide-react"

import { listServerTree } from "~/lib/api/endpoints"
import type { TfsServerItem } from "~/lib/api/types"

interface ServerTreePanelProps {
  connected: boolean
  collection: string
  selectedPath: string
  onPathSelect(path: string): void
}

/**
 * 渲染固定 Collection 下的服务端目录树，并在展开目录时按需请求子节点。
 */
export function ServerTreePanel({
  connected,
  collection,
  selectedPath,
  onPathSelect,
}: ServerTreePanelProps) {
  const [expandedPaths, setExpandedPaths] = useState<string[]>([])
  const [itemsByPath, setItemsByPath] = useState<
    Record<string, TfsServerItem[]>
  >({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (!connected || !collection) {
      setExpandedPaths([])
      setItemsByPath({})
      return
    }

    setExpandedPaths(["$/"])
    setItemsByPath({})
    loadServerItems(collection, "$/")
  }, [connected, collection])

  useEffect(() => {
    if (connected && collection && selectedPath) {
      expandToPath(selectedPath)
    }
  }, [connected, collection, selectedPath])

  /**
   * 加载指定目录的一层子节点，未映射目录也直接按服务端路径浏览。
   */
  async function loadServerItems(collection: string, path: string) {
    setLoading(true)
    setErrorMessage("")

    const result = await listServerTree(path, collection)
    setLoading(false)

    if (!result.success) {
      setErrorMessage(result.errorMessage || result.message)
      return
    }

    setItemsByPath((currentItems) => ({
      ...currentItems,
      [path]: result.data.items,
    }))
  }

  /**
   * 根据中间文件列表进入的目录路径，展开并选中左侧树对应父级。
   */
  async function expandToPath(path: string) {
    const parents = parentPaths(path)
    setExpandedPaths((currentPaths) =>
      Array.from(new Set([...currentPaths, ...parents]))
    )
    for (const parent of parents) {
      if (!itemsByPath[parent]) {
        await loadServerItems(collection, parent)
      }
    }
  }

  /**
   * 生成服务端路径的父级目录列表，根路径固定为 $/。
   */
  function parentPaths(path: string) {
    const result = ["$/"]
    if (!path || path === "$/") {
      return result
    }
    const parts = path.replace(/^\$\//, "").split("/").filter(Boolean)
    let current = "$"
    for (let index = 0; index < parts.length - 1; index++) {
      current = `${current}/${parts[index]}`
      result.push(current === "$" ? "$/" : current)
    }
    return result
  }

  /**
   * 选中节点并通知中间区域当前服务端路径已变化。
   */
  function selectPath(path: string) {
    onPathSelect(path)
  }

  /**
   * 展开或收起目录；首次展开时才加载子节点。
   */
  async function toggleFolder(item: TfsServerItem) {
    selectPath(item.serverPath)
    if (!item.folder || !collection) {
      return
    }

    if (expandedPaths.includes(item.serverPath)) {
      setExpandedPaths((currentPaths) =>
        currentPaths.filter((path) => path !== item.serverPath)
      )
      return
    }

    setExpandedPaths((currentPaths) => [...currentPaths, item.serverPath])
    if (!itemsByPath[item.serverPath]) {
      await loadServerItems(collection, item.serverPath)
    }
  }

  /**
   * 按层级渲染目录树节点。
   */
  function renderItems(path: string, level = 0) {
    const items = itemsByPath[path] || []

    return items.map((item) => {
      const expanded = expandedPaths.includes(item.serverPath)
      const selected = selectedPath === item.serverPath

      return (
        <div key={item.serverPath}>
          <button
            className={`flex h-7 w-full items-center gap-1.5 rounded-[6px] px-2 text-left text-xs ${
              selected ? "bg-primary/10 text-primary" : "hover:bg-muted"
            }`}
            style={{ paddingLeft: 8 + level * 14 }}
            onClick={() => toggleFolder(item)}
          >
            {item.folder ? (
              expanded ? (
                <ChevronDown className="size-3.5 shrink-0" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0" />
              )
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            {item.folder ? (
              <Folder className="size-3.5 shrink-0 text-amber-600" />
            ) : (
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">{item.name}</span>
          </button>

          {item.folder && expanded && renderItems(item.serverPath, level + 1)}
        </div>
      )
    })
  }

  if (!connected || !collection) {
    return <div className="px-2 py-1 text-xs text-muted-foreground">未连接</div>
  }

  return (
    <div className="grid gap-2">
      {loading && (
        <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          加载中
        </div>
      )}

      {errorMessage && (
        <div className="rounded-[6px] border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-1">
        <div className="truncate rounded-[6px] bg-background px-2 py-1.5 text-xs font-medium">
          {collection}
        </div>
      </div>

      <div className="grid gap-0.5 border-t pt-2">
        <button
          className={`flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-left font-mono text-xs ${
            selectedPath === "$/"
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted"
          }`}
          onClick={() => {
            selectPath("$/")
            if (collection && !itemsByPath["$/"]) {
              loadServerItems(collection, "$/")
            }
          }}
        >
          <Folder className="size-3.5 shrink-0 text-amber-600" />
          $/
        </button>
        {renderItems("$/")}
      </div>
    </div>
  )
}
