import { useCallback, useMemo, useState } from "react"
import { FileText, FolderClosed, ListChecks, Loader2, RefreshCw } from "lucide-react"

import { FileTargetMenu } from "~/components/app/file-target-menu"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Textarea } from "~/components/ui/textarea"
import type { MappingInfo, PendingChange } from "~/lib/api"
import type { FileActionId, FileTarget } from "~/lib/tfs"
import { makeFileTarget, statusBadgeClass, statusLabel } from "~/lib/tfs"
import { cn } from "~/lib/utils"

/**
 * 右侧 Changes 面板：Pending Changes 的 Included / Excluded 分组维护、
 * 项级右键菜单，以及作为签入唯一入口的 comment + Checkin 区域。
 */
export function ChangesPanel({
  mappings,
  pendingChanges,
  excludedKeys,
  loading,
  error,
  checkinBusy,
  onToggleExcluded,
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
  onToggleExcluded: (serverPath: string) => void
  onCheckin: (paths: string[], comment: string) => Promise<boolean>
  onFileAction: (target: FileTarget, action: FileActionId) => void
  onRefresh: () => void
}) {
  const [comment, setComment] = useState("")

  const included = useMemo(
    () => pendingChanges.filter((change) => !excludedKeys.has(change.serverPath)),
    [pendingChanges, excludedKeys],
  )
  const excluded = useMemo(
    () => pendingChanges.filter((change) => excludedKeys.has(change.serverPath)),
    [pendingChanges, excludedKeys],
  )

  const canCheckin = included.length > 0 && comment.trim().length > 0 && !checkinBusy

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
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l bg-sidebar">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b px-3">
        <span className="text-xs font-medium text-muted-foreground">挂起更改</span>
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
            <GroupHeader label="Included" count={included.length} />
            {included.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                没有要签入的更改，勾选下方 Excluded 项可移回
              </p>
            )}
            {included.map((change) => (
              <PendingRow
                key={change.serverPath}
                change={change}
                included
                mappings={mappings}
                onToggleExcluded={onToggleExcluded}
                onFileAction={onFileAction}
              />
            ))}

            {excluded.length > 0 && (
              <>
                <GroupHeader label="Excluded" count={excluded.length} className="mt-3" />
                {excluded.map((change) => (
                  <PendingRow
                    key={change.serverPath}
                    change={change}
                    included={false}
                    mappings={mappings}
                    onToggleExcluded={onToggleExcluded}
                    onFileAction={onFileAction}
                  />
                ))}
              </>
            )}
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
          <span className="text-xs text-muted-foreground">
            将签入 {included.length} 项
          </span>
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
 * 分组标题行。
 */
function GroupHeader({
  label,
  count,
  className,
}: {
  label: string
  count: number
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-1.5 px-2 py-1", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-xs text-muted-foreground/70">{count}</span>
    </div>
  )
}

/**
 * 单条挂起更改：勾选维护 Included / Excluded，整行支持统一右键菜单。
 */
function PendingRow({
  change,
  included,
  mappings,
  onToggleExcluded,
  onFileAction,
}: {
  change: PendingChange
  included: boolean
  mappings: MappingInfo[]
  onToggleExcluded: (serverPath: string) => void
  onFileAction: (target: FileTarget, action: FileActionId) => void
}) {
  const target = makeFileTarget({
    source: "pending",
    folder: change.folder,
    serverPath: change.serverPath,
    mappings,
    pendingStatus: change.status,
  })
  return (
    <FileTargetMenu target={target} onAction={onFileAction}>
      <div
        className={cn(
          "flex h-9 cursor-default items-center gap-2 rounded-md px-2 select-none hover:bg-muted",
          !included && "opacity-60",
        )}
        title={change.serverPath}
      >
        <Checkbox
          checked={included}
          onCheckedChange={() => onToggleExcluded(change.serverPath)}
          aria-label={included ? "移到 Excluded" : "移回 Included"}
        />
        {change.folder ? (
          <FolderClosed className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">
            {change.status === "pendingRename" && change.sourceServerPath
              ? `${change.sourceServerPath.slice(change.sourceServerPath.lastIndexOf("/") + 1)} → ${change.name}`
              : change.name}
          </span>
          <span className="block truncate font-mono text-[10px] leading-3 text-muted-foreground">
            {change.serverPath}
          </span>
        </span>
        <Badge
          variant="secondary"
          className={cn("shrink-0 rounded-md", statusBadgeClass(change.status))}
        >
          {statusLabel(change.status)}
        </Badge>
      </div>
    </FileTargetMenu>
  )
}
