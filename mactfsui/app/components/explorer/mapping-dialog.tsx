import { useEffect, useState } from "react"
import { FolderOpen, Loader2 } from "lucide-react"

import { Button } from "~/components/ui/button"
import { addMapping } from "~/lib/api/endpoints"
import { getMactfsBridge } from "~/lib/electron/bridge"

interface MappingDialogProps {
  serverPath: string
  open: boolean
  onClose(): void
  onSaved(): void
}

/**
 * 创建服务端目录到本地目录的 Mapping，供未映射目录右键菜单和弹窗流程复用。
 */
export function MappingDialog({
  serverPath,
  open,
  onClose,
  onSaved,
}: MappingDialogProps) {
  const [localPath, setLocalPath] = useState("")
  const [getLatest, setGetLatest] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (open) {
      setLocalPath("")
      setGetLatest(false)
      setMessage("")
    }
  }, [open, serverPath])

  /**
   * 通过 Electron 主进程选择本地目录，避免渲染进程直接访问本机文件系统。
   */
  async function selectLocalDirectory() {
    const directory = await getMactfsBridge()?.selectDirectory()
    if (directory) {
      setLocalPath(directory)
    }
  }

  /**
   * 保存 Mapping，成功后通知父组件刷新当前目录状态。
   */
  async function saveMapping() {
    if (!localPath) {
      setMessage("请选择本地目录。")
      return
    }

    setSaving(true)
    setMessage("")
    const result = await addMapping({
      serverPath,
      localPath,
      getLatest,
    })
    setSaving(false)

    if (!result.success) {
      setMessage(result.errorMessage || result.message)
      return
    }

    onSaved()
    onClose()
  }

  if (!open) {
    return null
  }

  return (
    <div className="grid gap-3 p-4 text-sm">
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          服务端路径
        </span>
        <div className="rounded-[6px] border bg-muted/20 px-2 py-1.5 font-mono text-xs">
          {serverPath}
        </div>
      </div>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          本地目录
        </span>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            className="h-8 rounded-[6px] border bg-background px-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            value={localPath}
            onChange={(event) => setLocalPath(event.target.value)}
          />
          <Button size="sm" variant="outline" onClick={selectLocalDirectory}>
            <FolderOpen />
            选择目录
          </Button>
        </div>
      </label>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={getLatest}
          onChange={(event) => setGetLatest(event.target.checked)}
        />
        创建后立即 Get Latest
      </label>

      {message && (
        <div className="rounded-[6px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {message}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" disabled={saving} onClick={onClose}>
          取消
        </Button>
        <Button size="sm" disabled={saving} onClick={saveMapping}>
          {saving && <Loader2 className="animate-spin" />}
          创建 Mapping
        </Button>
      </div>
    </div>
  )
}
