import { useEffect, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  Folder,
  Loader2,
} from "lucide-react"

import { listCollections, listServerTree } from "~/lib/api/endpoints"
import type { TfsCollectionInfo, TfsServerItem } from "~/lib/api/types"

interface ServerTreePanelProps {
  connected: boolean
  preferredCollection: string
  onCollectionSelect(collection: string): void
  onPathSelect(path: string): void
}

/**
 * 渲染 Collection 与服务端目录树，并在展开目录时按需请求子节点。
 */
export function ServerTreePanel({
  connected,
  preferredCollection,
  onCollectionSelect,
  onPathSelect,
}: ServerTreePanelProps) {
  const [collections, setCollections] = useState<TfsCollectionInfo[]>([])
  const [selectedCollection, setSelectedCollection] = useState("")
  const [selectedPath, setSelectedPath] = useState("")
  const [expandedPaths, setExpandedPaths] = useState<string[]>([])
  const [itemsByPath, setItemsByPath] = useState<
    Record<string, TfsServerItem[]>
  >({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (!connected) {
      setCollections([])
      setSelectedCollection("")
      setSelectedPath("")
      setExpandedPaths([])
      setItemsByPath({})
      return
    }

    loadCollections()
  }, [connected, preferredCollection])

  /**
   * 加载 Collection 列表，并优先展开当前配置保存的 Collection。
   */
  async function loadCollections() {
    setLoading(true)
    setErrorMessage("")

    const result = await listCollections()
    setLoading(false)

    if (!result.success) {
      setErrorMessage(result.errorMessage || result.message)
      return
    }

    setCollections(result.data.collections)
    const collection =
      result.data.collections.find(
        (item) => item.name === preferredCollection
      ) || result.data.collections[0]
    if (collection) {
      selectCollection(collection)
    }
  }

  /**
   * 切换当前 Collection，并加载该 Collection 的服务端根目录。
   */
  async function selectCollection(collection: TfsCollectionInfo) {
    setSelectedCollection(collection.name)
    setSelectedPath("$/")
    setExpandedPaths(["$/"])
    setItemsByPath({})
    onCollectionSelect(collection.name)
    onPathSelect("$/")
    await loadServerItems(collection.name, "$/")
  }

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
   * 选中节点并通知中间区域当前服务端路径已变化。
   */
  function selectPath(path: string) {
    setSelectedPath(path)
    onPathSelect(path)
  }

  /**
   * 展开或收起目录；首次展开时才加载子节点。
   */
  async function toggleFolder(item: TfsServerItem) {
    selectPath(item.serverPath)
    if (!item.folder || !selectedCollection) {
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
      await loadServerItems(selectedCollection, item.serverPath)
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

  if (!connected) {
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
        {collections.map((collection) => (
          <button
            key={collection.id || collection.name}
            className={`flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-left text-xs ${
              selectedCollection === collection.name
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => selectCollection(collection)}
          >
            <Database className="size-3.5 shrink-0" />
            <span className="truncate">{collection.name}</span>
          </button>
        ))}
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
            if (selectedCollection && !itemsByPath["$/"]) {
              loadServerItems(selectedCollection, "$/")
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
