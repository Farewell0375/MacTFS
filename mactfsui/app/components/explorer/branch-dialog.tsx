import { useState } from "react"

import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import type { MappingInfo } from "~/lib/api"
import { getParentPath, resolveLocalPath } from "~/lib/tfs"

/**
 * 分支弹窗：把源路径分叉到目标路径（pendBranch 产生挂起更改，签入后服务器生效）。
 * 目标路径父目录必须已映射（分支内容需要落盘到本地工作区）；可选基于指定 changeset。
 */
export function BranchDialog({
  sourceServerPath,
  mappings,
  onConfirm,
  onClose,
}: {
  sourceServerPath: string
  mappings: MappingInfo[]
  /** 确认分支，由编排层调用接口并刷新，返回是否成功。 */
  onConfirm: (targetServerPath: string, changeset: number | undefined) => Promise<boolean>
  onClose: () => void
}) {
  const [target, setTarget] = useState(`${sourceServerPath}-branch`)
  const [changesetInput, setChangesetInput] = useState("")
  const [busy, setBusy] = useState(false)

  const trimmed = target.trim()
  const parentPath = trimmed.length > 2 ? getParentPath(trimmed) : null
  const parentMapped = parentPath != null && resolveLocalPath(mappings, parentPath) != null
  const targetLocalPath = trimmed.length > 2 ? resolveLocalPath(mappings, trimmed) : null
  const changesetTrimmed = changesetInput.trim()
  const changesetValid = changesetTrimmed.length === 0 || /^\d+$/.test(changesetTrimmed)

  const validation =
    !trimmed.startsWith("$/") || trimmed.length <= 2
      ? "目标路径必须以 $/ 开头"
      : trimmed === sourceServerPath
        ? "目标路径不能与源路径相同"
        : trimmed.startsWith(`${sourceServerPath}/`)
          ? "目标路径不能位于源路径内部"
          : !parentMapped
            ? "目标路径所在父目录未映射，请先在工作区中映射"
            : !changesetValid
              ? "changeset 必须是数字"
              : null

  /**
   * 执行分支：成功后由上层刷新并关闭弹窗。
   */
  const handleConfirm = () => {
    void (async () => {
      setBusy(true)
      const ok = await onConfirm(
        trimmed,
        changesetTrimmed.length === 0 ? undefined : Number(changesetTrimmed),
      )
      setBusy(false)
      if (ok) {
        onClose()
      }
    })()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>分支</DialogTitle>
          <DialogDescription>
            从源路径创建分支，结果为 branch 挂起更改，签入后服务器生效
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>源路径</Label>
            <p className="rounded-md border bg-muted/40 px-2.5 py-1.5 font-mono text-xs">
              {sourceServerPath}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branchTarget">目标路径</Label>
            <Input
              id="branchTarget"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              disabled={busy}
              className="font-mono text-xs"
            />
            {targetLocalPath != null && validation == null && (
              <p className="break-all font-mono text-xs text-muted-foreground">
                本地落盘：{targetLocalPath}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branchChangeset">基于 changeset（可选，默认 latest）</Label>
            <Input
              id="branchChangeset"
              value={changesetInput}
              onChange={(event) => setChangesetInput(event.target.value)}
              placeholder="留空表示最新版本"
              disabled={busy}
              inputMode="numeric"
              className="w-56 font-mono text-xs"
            />
          </div>

          {validation != null && <p className="text-xs text-destructive">{validation}</p>}
          <p className="text-xs text-muted-foreground">
            分支只产生挂起更改，可在挂起更改面板审查、撤销，签入后目标路径才会出现在服务器上。
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button disabled={validation != null || busy} onClick={handleConfirm}>
            {busy ? "正在创建分支…" : "创建分支"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
