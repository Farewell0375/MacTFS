import { useCallback, useEffect, useMemo, useState } from "react"
import { FileDiff, Loader2 } from "lucide-react"

import { DiffDialog, type DiffRequest } from "~/components/explorer/diff-dialog"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { api } from "~/lib/api"
import type { ConflictInfo, ConflictResolution } from "~/lib/api"

// 每个冲突的取舍选择：未选择 / 采用服务器版本 / 保留本地版本。
type ChoiceValue = "none" | ConflictResolution

/**
 * 统一冲突弹窗：Get Latest 与 Checkout 共用。
 * 支持逐文件选择服务器版本或保留本地版本、批量设置、冲突文件 Diff、批量应用。
 */
export function ConflictDialog({
  serverPath,
  onClose,
  onResolved,
}: {
  serverPath: string
  onClose: () => void
  onResolved: () => void
}) {
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([])
  const [choices, setChoices] = useState<Record<number, ChoiceValue>>({})
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 应用结果摘要：conflictId -> 是否成功。
  const [applied, setApplied] = useState<Record<number, boolean>>({})
  const [diffRequest, setDiffRequest] = useState<DiffRequest | null>(null)
  // 是否发生过成功应用，关闭时据此通知上层刷新。
  const [didResolve, setDidResolve] = useState(false)

  /**
   * 加载当前范围内的未解决冲突。
   */
  const loadConflicts = useCallback(async () => {
    setLoading(true)
    const result = await api.listConflicts({ serverPath, recursive: true })
    setLoading(false)
    if (!result.ok) {
      setError(result.errorMessage ?? "冲突明细加载失败")
      return
    }
    setError(null)
    const list = (result.data?.conflicts ?? []).filter((item) => !item.resolved)
    setConflicts(list)
    setChoices({})
    setApplied({})
  }, [serverPath])

  useEffect(() => {
    void loadConflicts()
  }, [loadConflicts])

  const chosenCount = useMemo(
    () => Object.values(choices).filter((value) => value !== "none").length,
    [choices],
  )

  /**
   * 批量把所有冲突设置为同一取舍。
   */
  const setAll = useCallback(
    (value: ConflictResolution) => {
      setChoices(() => {
        const next: Record<number, ChoiceValue> = {}
        for (const conflict of conflicts) {
          next[conflict.conflictId] = value
        }
        return next
      })
    },
    [conflicts],
  )

  /**
   * 应用所有已选择的取舍，逐个调用后端并记录结果。
   */
  const applyChoices = useCallback(async () => {
    setApplying(true)
    setError(null)
    const results: Record<number, boolean> = {}
    let resolvedAny = false
    for (const conflict of conflicts) {
      const choice = choices[conflict.conflictId]
      if (!choice || choice === "none") {
        continue
      }
      const result = await api.applyConflict({
        conflictId: conflict.conflictId,
        resolution: choice,
      })
      const success = result.ok && result.data?.resolution?.resolved === true
      results[conflict.conflictId] = success
      if (success) {
        resolvedAny = true
      }
    }
    setApplying(false)
    setApplied(results)
    if (resolvedAny) {
      setDidResolve(true)
    }
    const failures = Object.values(results).filter((value) => !value).length
    if (failures > 0) {
      setError(`${failures} 个冲突应用失败，可重试`)
      await loadConflicts()
      return
    }
    // 全部成功：重新加载剩余冲突，没有剩余则关闭并通知刷新。
    const remain = await api.listConflicts({ serverPath, recursive: true })
    const remaining = (remain.data?.conflicts ?? []).filter((item) => !item.resolved)
    if (remaining.length === 0) {
      onResolved()
      return
    }
    setConflicts(remaining)
    setChoices({})
    setApplied({})
  }, [conflicts, choices, serverPath, loadConflicts, onResolved])

  /**
   * 关闭弹窗：若期间有成功应用，通知上层刷新状态。
   */
  const handleClose = useCallback(() => {
    if (didResolve) {
      onResolved()
    } else {
      onClose()
    }
  }, [didResolve, onResolved, onClose])

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="flex max-h-[80svh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>处理冲突</DialogTitle>
            <DialogDescription className="font-mono text-xs">{serverPath}</DialogDescription>
          </DialogHeader>

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary" className="rounded-md bg-red-500/10 text-red-700">
              {conflicts.length} 个冲突
            </Badge>
            <span className="text-xs text-muted-foreground">
              逐项选择，或批量设置后统一应用
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={applying || conflicts.length === 0}
                onClick={() => setAll("takeServer")}
              >
                全部采用服务器
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={applying || conflicts.length === 0}
                onClick={() => setAll("keepLocal")}
              >
                全部保留本地
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-md border">
            {loading ? (
              <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                正在加载冲突…
              </div>
            ) : conflicts.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                当前范围内没有未解决的冲突
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-8 text-xs text-muted-foreground">文件</TableHead>
                    <TableHead className="h-8 w-24 text-xs text-muted-foreground">类型</TableHead>
                    <TableHead className="h-8 w-44 text-xs text-muted-foreground">取舍</TableHead>
                    <TableHead className="h-8 w-20 text-xs text-muted-foreground">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conflicts.map((conflict) => {
                    const choice = choices[conflict.conflictId] ?? "none"
                    const appliedState = applied[conflict.conflictId]
                    const canDiff =
                      conflict.serverPath != null && conflict.localPath != null
                    return (
                      <TableRow key={conflict.conflictId} className="select-none">
                        <TableCell
                          className="max-w-0 truncate py-1.5 font-mono text-xs"
                          title={conflict.serverPath ?? conflict.localPath ?? ""}
                        >
                          {conflict.serverPath ?? conflict.localPath ?? `冲突 ${conflict.conflictId}`}
                          {appliedState === false && (
                            <span className="ml-2 text-destructive">应用失败</span>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5 text-xs text-muted-foreground">
                          {conflict.type}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Select
                            value={choice}
                            onValueChange={(value) =>
                              setChoices((prev) => ({
                                ...prev,
                                [conflict.conflictId]: value as ChoiceValue,
                              }))
                            }
                            disabled={applying}
                          >
                            <SelectTrigger size="sm" className="w-40 text-xs">
                              <SelectValue placeholder="选择取舍" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">暂不处理</SelectItem>
                              <SelectItem value="takeServer">采用服务器版本</SelectItem>
                              <SelectItem value="keepLocal">保留本地版本</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={!canDiff}
                            title={canDiff ? "查看差异" : "缺少路径信息，无法对比"}
                            onClick={() =>
                              setDiffRequest({
                                mode: "localLatest",
                                serverPath: conflict.serverPath as string,
                                localPath: conflict.localPath as string,
                              })
                            }
                          >
                            <FileDiff />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {error && <p className="shrink-0 text-sm text-destructive">{error}</p>}

          <DialogFooter className="shrink-0">
            <Button variant="ghost" onClick={handleClose} disabled={applying}>
              稍后处理
            </Button>
            <Button
              onClick={() => void applyChoices()}
              disabled={applying || chosenCount === 0}
            >
              {applying ? "正在应用…" : `应用选择（${chosenCount}）`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {diffRequest && (
        <DiffDialog request={diffRequest} onClose={() => setDiffRequest(null)} />
      )}
    </>
  )
}
