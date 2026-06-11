import { useMemo, useState } from "react"

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

// Windows / TFS 路径名非法字符。
const INVALID_NAME_PATTERN = /[\\/:*?"<>|]/

/**
 * 重命名弹窗：同目录改名，校验非空、非法字符与同名；
 * 确认后产生 rename 挂起更改（由编排层调用接口并刷新）。
 */
export function RenameDialog({
  serverPath,
  folder,
  onConfirm,
  onClose,
}: {
  serverPath: string
  folder: boolean
  /** 确认重命名，由编排层执行 API 与刷新，返回是否成功。 */
  onConfirm: (newName: string) => Promise<boolean>
  onClose: () => void
}) {
  const currentName = useMemo(
    () => serverPath.slice(serverPath.lastIndexOf("/") + 1),
    [serverPath],
  )
  const [name, setName] = useState(currentName)
  const [busy, setBusy] = useState(false)

  const trimmed = name.trim()
  const validation =
    trimmed.length === 0
      ? "名称不能为空"
      : INVALID_NAME_PATTERN.test(trimmed)
        ? '名称不能包含 / \\ : * ? " < > | 字符'
        : trimmed === currentName
          ? "新名称与当前名称相同"
          : null

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>重命名{folder ? "目录" : "文件"}</DialogTitle>
          <DialogDescription className="font-mono text-xs">{serverPath}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            onFocus={(event) => {
              // 文件默认选中主名部分，便于直接输入新名称。
              const dot = folder ? -1 : currentName.lastIndexOf(".")
              event.target.setSelectionRange(0, dot > 0 ? dot : currentName.length)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && validation == null && !busy) {
                event.preventDefault()
                void (async () => {
                  setBusy(true)
                  const ok = await onConfirm(trimmed)
                  setBusy(false)
                  if (ok) {
                    onClose()
                  }
                })()
              }
            }}
          />
          {validation != null && trimmed !== currentName && (
            <p className="text-xs text-destructive">{validation}</p>
          )}
          <p className="text-xs text-muted-foreground">
            重命名会产生挂起更改，签入后服务器才会生效；签入前可在挂起更改面板撤销。
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button
            disabled={validation != null || busy}
            onClick={() => {
              void (async () => {
                setBusy(true)
                const ok = await onConfirm(trimmed)
                setBusy(false)
                if (ok) {
                  onClose()
                }
              })()
            }}
          >
            {busy ? "正在重命名…" : "重命名"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
