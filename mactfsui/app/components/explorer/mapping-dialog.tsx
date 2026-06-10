import { useCallback, useEffect, useState } from "react"
import { FolderSearch, Loader2 } from "lucide-react"

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
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { api } from "~/lib/api"
import type { CheckMappingTargetResult, MappingInfo } from "~/lib/api"
import { isElectron, selectDirectory } from "~/lib/electron"

/**
 * Mapping 创建弹窗：展示服务端路径，选择本地父目录后由后端预校验最终目标路径，
 * 目标已存在时禁止映射；支持创建后立即 Get Latest。
 */
export function MappingDialog({
  serverPath,
  onClose,
  onCreated,
}: {
  serverPath: string
  onClose: () => void
  onCreated: (mappings: MappingInfo[], didGetLatest: boolean) => void
}) {
  const [parentPath, setParentPath] = useState("")
  const [check, setCheck] = useState<CheckMappingTargetResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [getLatest, setGetLatest] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 通过系统目录选择器选择本地父目录（非 Electron 环境保留手动输入）。
   */
  const handleBrowse = useCallback(async () => {
    const selected = await selectDirectory()
    if (selected) {
      setParentPath(selected)
    }
  }, [])

  // 父目录变化时调用后端预校验最终目标路径，最终路径以后端结果为准。
  useEffect(() => {
    const trimmed = parentPath.trim()
    if (trimmed.length === 0) {
      setCheck(null)
      return
    }
    let active = true
    setChecking(true)
    const timer = setTimeout(() => {
      void (async () => {
        const result = await api.checkMappingTarget({
          serverPath,
          localParentPath: trimmed,
        })
        if (!active) {
          return
        }
        setChecking(false)
        if (!result.ok || !result.data) {
          setCheck(null)
          setError(result.errorMessage ?? "目标路径校验失败")
          return
        }
        setError(null)
        setCheck(result.data)
      })()
    }, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [parentPath, serverPath])

  const exists = check?.exists === true
  const canConfirm = check != null && check.allowed && !exists && !busy && !checking

  /**
   * 创建 Mapping（按需立即 Get Latest），成功后回调上层刷新并关闭弹窗。
   */
  const handleConfirm = useCallback(async () => {
    if (!check) {
      return
    }
    setBusy(true)
    setError(null)
    const result = await api.addMapping({
      serverPath,
      localPath: check.targetPath,
      getLatest,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.errorMessage ?? "创建 Mapping 失败")
      return
    }
    const mappingsResult = await api.listMappings()
    onCreated(mappingsResult.data?.mappings ?? [], getLatest)
  }, [check, serverPath, getLatest, onCreated])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>映射到本地</DialogTitle>
          <DialogDescription>
            为服务端目录创建本地工作区映射
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>服务端路径</Label>
            <p className="rounded-md border bg-muted/40 px-2.5 py-1.5 font-mono text-xs">
              {serverPath}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="parentPath">本地父目录</Label>
            <div className="flex gap-2">
              <Input
                id="parentPath"
                placeholder="/Users/me/tfs"
                value={parentPath}
                onChange={(event) => setParentPath(event.target.value)}
                disabled={busy}
                className="font-mono text-xs"
              />
              {isElectron() && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void handleBrowse()}
                  disabled={busy}
                  aria-label="浏览本地目录"
                >
                  <FolderSearch />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              选择父目录，最终映射目录由后端按服务端目录名生成
            </p>
          </div>

          {checking && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              正在校验目标路径…
            </p>
          )}

          {check && !checking && (
            <div className="space-y-1.5">
              <Label>最终映射路径</Label>
              <p className="rounded-md border bg-muted/40 px-2.5 py-1.5 font-mono text-xs">
                {check.targetPath}
              </p>
              {exists && (
                <p className="text-xs font-medium text-destructive">
                  目标目录已存在，禁止映射
                </p>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={getLatest}
              onCheckedChange={(value) => setGetLatest(value === true)}
              disabled={busy}
            />
            创建后立即获取最新
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={!canConfirm}>
            {busy ? "正在创建…" : "创建映射"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
