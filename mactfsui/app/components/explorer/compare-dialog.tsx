import { useCallback, useMemo, useState } from "react"
import { FileText, FolderClosed, Loader2, RefreshCw } from "lucide-react"

import { FileTargetMenu } from "~/components/app/file-target-menu"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { api } from "~/lib/api"
import type { FolderDiffItem, MappingInfo } from "~/lib/api"
import type { FileActionId, FileTarget } from "~/lib/tfs"
import { makeFileTarget, statusBadgeClass, statusLabel } from "~/lib/tfs"
import { cn } from "~/lib/utils"

/**
 * 目录对比弹窗：对已映射目录执行本地与服务端对比，
 * 默认隐藏 upToDate，支持状态筛选、刷新重比，结果项走统一右键菜单。
 */
// 在对比弹窗内直接执行、完成后需要刷新对比结果的动作。
const ACTIONS_NEED_RECOMPARE: FileActionId[] = ["checkout", "getLatest", "undo", "delete", "add"]

export function CompareDialog({
  serverPath,
  mappings,
  onClose,
  onFileAction,
}: {
  serverPath: string
  mappings: MappingInfo[]
  onClose: () => void
  onFileAction: (target: FileTarget, action: FileActionId) => void | Promise<void>
}) {
  // 先选项后对比：setup 阶段确认选项，result 阶段展示对比结果。
  const [phase, setPhase] = useState<"setup" | "result">("setup")
  const [diffs, setDiffs] = useState<FolderDiffItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUpToDate, setShowUpToDate] = useState(false)
  // 忽略仅本地存在的项（如 node_modules）：勾选后只对比两端都有的文件，并跳过本地全量扫描。
  const [ignoreLocalOnly, setIgnoreLocalOnly] = useState(false)
  // 状态筛选：空集合表示不过滤（除 upToDate 开关外）。
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set())

  /**
   * 执行（或重新执行）目录对比；忽略仅本地存在的项时由后端直接跳过本地扫描。
   */
  const runCompare = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await api.compareFolder({
      serverPath,
      recursive: true,
      includeLocalOnly: !ignoreLocalOnly,
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.errorMessage ?? "目录对比失败")
      return
    }
    setDiffs(result.data?.diffs ?? [])
  }, [serverPath, ignoreLocalOnly])

  /**
   * 转发右键动作：签出 / 获取 / 撤销等就地执行的动作完成后自动重新对比，
   * 让结果状态（如 签出编辑）立即反映最新事实。
   */
  const handleAction = useCallback(
    async (target: FileTarget, action: FileActionId) => {
      await onFileAction(target, action)
      if (ACTIONS_NEED_RECOMPARE.includes(action)) {
        await runCompare()
      }
    },
    [onFileAction, runCompare],
  )

  // 结果中出现过的状态（不含 upToDate），用于生成筛选 chips。
  const presentStatuses = useMemo(() => {
    const set = new Set<string>()
    for (const diff of diffs) {
      if (diff.status !== "upToDate") {
        set.add(diff.status)
      }
    }
    return [...set]
  }, [diffs])

  const visibleDiffs = useMemo(
    () =>
      diffs.filter((diff) => {
        if (diff.status === "upToDate") {
          return showUpToDate && statusFilter.size === 0
        }
        return statusFilter.size === 0 || statusFilter.has(diff.status)
      }),
    [diffs, showUpToDate, statusFilter],
  )

  /**
   * 切换某个状态筛选 chip。
   */
  const toggleStatus = useCallback((status: string) => {
    setStatusFilter((prev) => {
      const next = new Set(prev)
      if (next.has(status)) {
        next.delete(status)
      } else {
        next.add(status)
      }
      return next
    })
  }, [])

  // 选项确认阶段：先确定对比方式再执行，避免反复触发全量对比。
  if (phase === "setup") {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>目录对比</DialogTitle>
            <DialogDescription className="font-mono text-xs">{serverPath}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-md border bg-muted/30 p-4">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={ignoreLocalOnly}
                onCheckedChange={(value) => setIgnoreLocalOnly(value === true)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">忽略仅本地存在的项</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  只对比两端都有的文件；仅本地存在的项（如 node_modules、构建产物）不计入差异，
                  并跳过本地全量扫描，大目录速度更快。
                </span>
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button
              onClick={() => {
                setPhase("result")
                void runCompare()
              }}
            >
              开始对比
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[88svh] max-h-[88svh] flex-col sm:max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>目录对比{ignoreLocalOnly ? "（已忽略仅本地存在的项）" : ""}</DialogTitle>
          <DialogDescription className="font-mono text-xs">{serverPath}</DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {presentStatuses.map((status) => (
            <button key={status} type="button" onClick={() => toggleStatus(status)}>
              <Badge
                variant="secondary"
                className={cn(
                  "cursor-pointer rounded-md",
                  statusBadgeClass(status),
                  statusFilter.size > 0 && !statusFilter.has(status) && "opacity-40",
                )}
              >
                {statusLabel(status)}
              </Badge>
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Checkbox
              checked={showUpToDate}
              onCheckedChange={(value) => setShowUpToDate(value === true)}
            />
            显示最新项
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPhase("setup")}
            disabled={loading}
          >
            调整选项
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void runCompare()}
            disabled={loading}
          >
            <RefreshCw data-icon="inline-start" className={cn(loading && "animate-spin")} />
            重新对比
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
          {loading ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              正在对比目录…
            </div>
          ) : error ? (
            <div className="flex h-48 items-center justify-center text-sm text-destructive">
              {error}
            </div>
          ) : visibleDiffs.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              {diffs.length === 0 ? "本地与服务端一致，没有差异" : "没有符合筛选条件的差异项"}
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 text-xs text-muted-foreground">名称</TableHead>
                  <TableHead className="h-8 w-28 text-xs text-muted-foreground">状态</TableHead>
                  <TableHead className="h-8 w-24 text-right text-xs text-muted-foreground">本地版本</TableHead>
                  <TableHead className="h-8 w-24 text-right text-xs text-muted-foreground">最新版本</TableHead>
                  <TableHead className="h-8 text-xs text-muted-foreground">服务端路径</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleDiffs.map((diff) => {
                  const target = makeFileTarget({
                    source: "compare",
                    folder: diff.folder,
                    serverPath: diff.serverPath,
                    mappings,
                    pendingStatus: diff.status.startsWith("pending") ? diff.status : null,
                    compareStatus: diff.status,
                  })
                  return (
                    <FileTargetMenu
                      key={diff.serverPath}
                      target={target}
                      onAction={(menuTarget, action) => void handleAction(menuTarget, action)}
                    >
                      <TableRow className="cursor-default select-none">
                        <TableCell className="py-1.5">
                          <span className="flex items-center gap-1.5">
                            {diff.folder ? (
                              <FolderClosed className="size-3.5 shrink-0 text-muted-foreground" />
                            ) : (
                              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                            )}
                            <span className="truncate text-sm">{diff.name}</span>
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Badge
                            variant="secondary"
                            className={cn("rounded-md", statusBadgeClass(diff.status))}
                          >
                            {statusLabel(diff.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5 text-right font-mono text-xs">
                          {diff.localVersion > 0 ? diff.localVersion : "—"}
                        </TableCell>
                        <TableCell className="py-1.5 text-right font-mono text-xs">
                          {diff.latestVersion > 0 ? diff.latestVersion : "—"}
                        </TableCell>
                        <TableCell
                          className="max-w-0 truncate py-1.5 font-mono text-xs text-muted-foreground"
                          title={diff.serverPath}
                        >
                          {diff.serverPath}
                        </TableCell>
                      </TableRow>
                    </FileTargetMenu>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <p className="shrink-0 text-xs text-muted-foreground">
          {visibleDiffs.length} / {diffs.length} 项 · 差异项操作通过右键菜单触发
        </p>
      </DialogContent>
    </Dialog>
  )
}
