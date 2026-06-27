import { useCallback, useMemo, useState } from "react"
import { ChevronRight, ListChecks, Loader2, RefreshCw } from "lucide-react"

import { FileTargetMenu } from "~/components/app/file-target-menu"
import { FileIcon } from "~/components/explorer/file-icon"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Textarea } from "~/components/ui/textarea"
import type { MappingInfo, PendingChange } from "~/lib/api"
import type { FileActionId, FileTarget } from "~/lib/tfs"
import {
  SERVER_ROOT_PATH,
  makeFileTarget,
  normalizeServerPath,
  statusBadgeClass,
  statusLabel,
} from "~/lib/tfs"
import { cn } from "~/lib/utils"

// 挂起更改目录树节点：目录节点聚合子项，文件/变更目录节点携带 change。
interface ChangeNode {
  path: string
  name: string
  isDir: boolean
  change: PendingChange | null
  children: Map<string, ChangeNode>
}

/**
 * 把扁平的挂起更改按 serverPath 还原成目录树。中间目录自动补齐为目录节点，
 * 末段挂载对应 change（变更本身是目录时该节点 isDir=true，可继续容纳子项）。
 */
function buildChangeTree(changes: PendingChange[]): ChangeNode {
  const root: ChangeNode = {
    path: SERVER_ROOT_PATH,
    name: SERVER_ROOT_PATH,
    isDir: true,
    change: null,
    children: new Map(),
  }
  for (const change of changes) {
    const normalized = normalizeServerPath(change.serverPath)
    const relative =
      normalized === SERVER_ROOT_PATH ? "" : normalized.slice(SERVER_ROOT_PATH.length)
    const segments = relative.length > 0 ? relative.split("/") : []
    let current = root
    let currentPath = SERVER_ROOT_PATH
    segments.forEach((segment, index) => {
      currentPath =
        currentPath === SERVER_ROOT_PATH
          ? `${SERVER_ROOT_PATH}${segment}`
          : `${currentPath}/${segment}`
      let child = current.children.get(segment)
      if (!child) {
        child = { path: currentPath, name: segment, isDir: true, change: null, children: new Map() }
        current.children.set(segment, child)
      }
      if (index === segments.length - 1) {
        child.change = change
        child.isDir = change.folder
      }
      current = child
    })
  }
  return root
}

/**
 * 收集某节点子树内全部挂起更改的 serverPath（含节点自身的 change），
 * 用于目录节点的计数与三态复选。
 */
function collectChangePaths(node: ChangeNode): string[] {
  const result: string[] = []
  const walk = (current: ChangeNode) => {
    if (current.change) {
      result.push(current.change.serverPath)
    }
    for (const child of current.children.values()) {
      walk(child)
    }
  }
  walk(node)
  return result
}

// 目录/文件混排排序：目录在前，名称不区分大小写升序。
function sortNodes(nodes: ChangeNode[]): ChangeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.isDir !== b.isDir) {
      return a.isDir ? -1 : 1
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  })
}

/**
 * 路径压缩：把「只有单个子目录且自身无变更」的目录链合并为一行（VS Code 风格），
 * 返回最终展示节点与合并后的名称。
 */
function compactDir(node: ChangeNode): { node: ChangeNode; label: string } {
  let current = node
  const parts = [node.name]
  while (current.isDir && !current.change && current.children.size === 1) {
    const only = [...current.children.values()][0]
    if (!only.isDir) {
      break
    }
    parts.push(only.name)
    current = only
  }
  return { node: current, label: parts.join("/") }
}

/**
 * 右侧 Changes 面板：以服务端目录树呈现 Pending Changes，目录节点支持折叠与
 * 三态复选（级联子项 Included / Excluded），并作为签入唯一入口提供 comment + Checkin。
 */
export function ChangesPanel({
  mappings,
  pendingChanges,
  excludedKeys,
  loading,
  error,
  checkinBusy,
  onSetExcluded,
  onCheckin,
  onFileAction,
  onRefresh,
}: {
  mappings: MappingInfo[]
  pendingChanges: PendingChange[]
  excludedKeys: Set<string>
  loading: boolean
  error: string | null
  checkinBusy: boolean
  onSetExcluded: (serverPaths: string[], excluded: boolean) => void
  onCheckin: (paths: string[], comment: string) => Promise<boolean>
  onFileAction: (target: FileTarget, action: FileActionId) => void
  onRefresh: () => void
}) {
  const [comment, setComment] = useState("")
  // 已折叠的目录 path 集合；默认全部展开。
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const tree = useMemo(() => buildChangeTree(pendingChanges), [pendingChanges])
  const rootChildren = useMemo(() => sortNodes([...tree.children.values()]), [tree])

  const included = useMemo(
    () => pendingChanges.filter((change) => !excludedKeys.has(change.serverPath)),
    [pendingChanges, excludedKeys],
  )

  const canCheckin = included.length > 0 && comment.trim().length > 0 && !checkinBusy

  /**
   * 折叠 / 展开目录节点。
   */
  const toggleCollapsed = useCallback((path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  /**
   * 提交签入：只提交 Included 项，成功后清空注释。
   */
  const handleCheckin = useCallback(async () => {
    const success = await onCheckin(
      included.map((change) => change.serverPath),
      comment.trim(),
    )
    if (success) {
      setComment("")
    }
  }, [onCheckin, included, comment])

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col overflow-hidden rounded-xl border bg-card shadow-card">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b bg-muted/40 px-3">
        <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          挂起更改
        </span>
        {pendingChanges.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{pendingChanges.length} 项</span>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          className={pendingChanges.length > 0 ? "" : "ml-auto"}
          onClick={onRefresh}
          disabled={loading}
          aria-label="刷新挂起更改"
          title="刷新挂起更改"
        >
          <RefreshCw className={cn(loading && "animate-spin")} />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          正在加载挂起更改…
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center p-4 text-xs text-destructive">
          {error}
        </div>
      ) : pendingChanges.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <ListChecks className="size-6 text-muted-foreground/60" />
            <p className="text-xs leading-5 text-muted-foreground">当前没有挂起更改</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-2">
            {rootChildren.map((node) => (
              <ChangeTreeNode
                key={node.path}
                node={node}
                depth={0}
                mappings={mappings}
                excludedKeys={excludedKeys}
                collapsed={collapsed}
                onToggleCollapsed={toggleCollapsed}
                onSetExcluded={onSetExcluded}
                onFileAction={onFileAction}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="shrink-0 space-y-2 border-t p-3">
        <Textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="签入注释（必填）"
          rows={3}
          disabled={checkinBusy || pendingChanges.length === 0}
          className="resize-none text-sm"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">将签入 {included.length} 项</span>
          <Button size="sm" disabled={!canCheckin} onClick={() => void handleCheckin()}>
            {checkinBusy ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                正在签入…
              </>
            ) : (
              "签入"
            )}
          </Button>
        </div>
        {comment.trim().length === 0 && pendingChanges.length > 0 && (
          <p className="text-xs text-muted-foreground">填写注释后才能签入</p>
        )}
      </div>
    </aside>
  )
}

/**
 * 目录树节点：目录节点渲染折叠箭头 + 三态复选 + 计数并递归子节点；
 * 文件 / 变更目录节点渲染单项复选 + 状态徽标，整行支持统一右键菜单。
 */
function ChangeTreeNode({
  node,
  depth,
  mappings,
  excludedKeys,
  collapsed,
  onToggleCollapsed,
  onSetExcluded,
  onFileAction,
}: {
  node: ChangeNode
  depth: number
  mappings: MappingInfo[]
  excludedKeys: Set<string>
  collapsed: Set<string>
  onToggleCollapsed: (path: string) => void
  onSetExcluded: (serverPaths: string[], excluded: boolean) => void
  onFileAction: (target: FileTarget, action: FileActionId) => void
}) {
  // 纯目录节点（自身无 change）做路径压缩；变更节点保持原样。
  const { node: displayNode, label } =
    node.isDir && !node.change ? compactDir(node) : { node, label: node.name }

  const indent = depth * 12 + 4
  const change = displayNode.change

  // 叶子：文件，或没有子项的变更目录。
  const isLeaf = !displayNode.isDir || displayNode.children.size === 0

  if (isLeaf && change) {
    return (
      <LeafRow
        node={displayNode}
        label={label}
        change={change}
        indent={indent}
        mappings={mappings}
        excluded={excludedKeys.has(change.serverPath)}
        onSetExcluded={onSetExcluded}
        onFileAction={onFileAction}
      />
    )
  }

  // 目录节点：聚合子树变更，决定三态与计数。
  const descendantPaths = collectChangePaths(displayNode)
  const excludedCount = descendantPaths.filter((path) => excludedKeys.has(path)).length
  const checkboxState: boolean | "indeterminate" =
    excludedCount === 0 ? true : excludedCount === descendantPaths.length ? false : "indeterminate"
  const expanded = !collapsed.has(displayNode.path)
  const children = sortNodes([...displayNode.children.values()])

  // 已全部 Included 时点击改为全部排除，否则全部移回 Included。
  const handleToggle = () => onSetExcluded(descendantPaths, checkboxState === true)

  const header = (
    <div
      className="flex h-8 cursor-default items-center gap-1.5 rounded-md pr-2 select-none hover:bg-muted"
      style={{ paddingLeft: `${indent}px` }}
      title={displayNode.path}
    >
      <button
        type="button"
        aria-label={expanded ? "收起目录" : "展开目录"}
        onClick={() => onToggleCollapsed(displayNode.path)}
        className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight
          className={cn("size-3.5 transition-transform duration-200", expanded && "rotate-90")}
        />
      </button>
      <Checkbox
        checked={checkboxState}
        onCheckedChange={handleToggle}
        aria-label={checkboxState === true ? "排除该目录全部更改" : "签入该目录全部更改"}
      />
      <FileIcon name={label} folder mapped={false} expanded={expanded} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
      {change && (
        <Badge
          variant="secondary"
          className={cn("shrink-0 gap-1.5 rounded-md", statusBadgeClass(change.status))}
        >
          <span className="size-1.5 rounded-full bg-current opacity-60" />
          {statusLabel(change.status)}
        </Badge>
      )}
      <span className="shrink-0 text-[11px] text-muted-foreground/70">{descendantPaths.length}</span>
    </div>
  )

  return (
    <div>
      {change ? (
        <FolderTargetMenu
          node={displayNode}
          change={change}
          mappings={mappings}
          onFileAction={onFileAction}
        >
          {header}
        </FolderTargetMenu>
      ) : (
        header
      )}
      {expanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <ChangeTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              mappings={mappings}
              excludedKeys={excludedKeys}
              collapsed={collapsed}
              onToggleCollapsed={onToggleCollapsed}
              onSetExcluded={onSetExcluded}
              onFileAction={onFileAction}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 文件 / 变更目录叶子行：复选框维护 Included / Excluded，整行支持统一右键菜单。
 */
function LeafRow({
  node,
  label,
  change,
  indent,
  mappings,
  excluded,
  onSetExcluded,
  onFileAction,
}: {
  node: ChangeNode
  label: string
  change: PendingChange
  indent: number
  mappings: MappingInfo[]
  excluded: boolean
  onSetExcluded: (serverPaths: string[], excluded: boolean) => void
  onFileAction: (target: FileTarget, action: FileActionId) => void
}) {
  const target = makeFileTarget({
    source: "pending",
    folder: change.folder,
    serverPath: change.serverPath,
    mappings,
    pendingStatus: change.status,
  })
  const displayName =
    change.status === "pendingRename" && change.sourceServerPath
      ? `${change.sourceServerPath.slice(change.sourceServerPath.lastIndexOf("/") + 1)} → ${change.name}`
      : label
  return (
    <FileTargetMenu target={target} onAction={onFileAction}>
      <div
        className={cn(
          "flex h-8 cursor-default items-center gap-1.5 rounded-md pr-2 select-none hover:bg-muted",
          excluded && "opacity-60",
        )}
        style={{ paddingLeft: `${indent + 22}px` }}
        title={change.serverPath}
      >
        <Checkbox
          checked={!excluded}
          onCheckedChange={() => onSetExcluded([change.serverPath], !excluded)}
          aria-label={!excluded ? "移到 Excluded" : "移回 Included"}
        />
        <FileIcon name={node.name} folder={change.folder} />
        <span className="min-w-0 flex-1 truncate text-sm">{displayName}</span>
        <Badge
          variant="secondary"
          className={cn("shrink-0 gap-1.5 rounded-md", statusBadgeClass(change.status))}
        >
          <span className="size-1.5 rounded-full bg-current opacity-60" />
          {statusLabel(change.status)}
        </Badge>
      </div>
    </FileTargetMenu>
  )
}

/**
 * 变更目录节点的右键菜单包装：复用统一动作模型，对目录类挂起更改提供动作。
 */
function FolderTargetMenu({
  node,
  change,
  mappings,
  onFileAction,
  children,
}: {
  node: ChangeNode
  change: PendingChange
  mappings: MappingInfo[]
  onFileAction: (target: FileTarget, action: FileActionId) => void
  children: React.ReactNode
}) {
  const target = makeFileTarget({
    source: "pending",
    folder: true,
    serverPath: node.path,
    mappings,
    pendingStatus: change.status,
  })
  return (
    <FileTargetMenu target={target} onAction={onFileAction}>
      {children}
    </FileTargetMenu>
  )
}
