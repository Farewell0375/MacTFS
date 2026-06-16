import { useEffect, useState } from "react"
import { Check, Copy, Loader2 } from "lucide-react"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { api } from "~/lib/api"
import type { ItemInfo } from "~/lib/api"
import type { FileTarget } from "~/lib/tfs"
import { statusBadgeClass, statusLabel } from "~/lib/tfs"
import { formatDateTime } from "~/lib/utils"

/**
 * 把字节数格式化为可读大小（B / KB / MB）。
 */
function formatSize(size: number | null): string {
  if (size == null) {
    return "—"
  }
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

/**
 * 对象属性弹窗：展示服务器路径、本地路径、映射与挂起状态，
 * 以及服务器侧最新版本信息（changeset / 时间 / 提交人），文件附带大小与编码。
 */
export function PropertiesDialog({
  target,
  onClose,
}: {
  target: FileTarget
  onClose: () => void
}) {
  const [info, setInfo] = useState<ItemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      const result = await api.getItemInfo({ serverPath: target.serverPath })
      if (!active) {
        return
      }
      setLoading(false)
      if (!result.ok || !result.data) {
        setError(result.errorMessage ?? "属性加载失败")
        return
      }
      setError(null)
      setInfo(result.data.item)
    })()
    return () => {
      active = false
    }
  }, [target.serverPath])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>属性</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {target.serverPath}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 text-sm">
          <PropertyRow label="对象类型" value={target.folder ? "目录" : "文件"} />
          <PropertyRow label="服务器路径" value={target.serverPath} mono copyable />
          <PropertyRow
            label="本地路径"
            value={target.localPath ?? "未映射"}
            mono={target.localPath != null}
            copyable={target.localPath != null}
            muted={target.localPath == null}
          />
          <PropertyRow
            label="映射状态"
            value={
              <Badge variant="secondary" className={statusBadgeClass(target.mapped ? "mapped" : "notMapped")}>
                {target.mapped ? (target.mappingRoot ? "映射根目录" : "已映射") : "未映射"}
              </Badge>
            }
          />
          <PropertyRow
            label="挂起状态"
            value={
              target.pendingStatus ? (
                <Badge variant="secondary" className={statusBadgeClass(target.pendingStatus)}>
                  {statusLabel(target.pendingStatus)}
                </Badge>
              ) : (
                "无挂起更改"
              )
            }
            muted={target.pendingStatus == null}
          />

          <div className="my-2 border-t" />

          {loading ? (
            <div className="flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              正在加载服务器信息…
            </div>
          ) : error ? (
            <div className="flex h-24 items-center justify-center text-sm text-destructive">{error}</div>
          ) : info ? (
            <>
              <PropertyRow label="最新 Changeset" value={`C${info.changeset}`} mono />
              <PropertyRow label="签入时间" value={formatDateTime(info.checkinDate)} />
              <PropertyRow label="签入人" value={info.author || "—"} />
              <PropertyRow label="签入备注" value={info.comment || "—"} muted={!info.comment} />
              {!info.folder && (
                <>
                  <PropertyRow label="文件大小" value={formatSize(info.size)} />
                  <PropertyRow label="编码" value={info.encoding ?? "—"} />
                </>
              )}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 单行属性：左侧标签 + 右侧值，可选等宽字体与复制按钮。
 */
function PropertyRow({
  label,
  value,
  mono,
  copyable,
  muted,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  copyable?: boolean
  muted?: boolean
}) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex items-start gap-3 py-0.5">
      <span className="w-24 shrink-0 pt-0.5 text-xs text-muted-foreground">{label}</span>
      <span
        className={`min-w-0 flex-1 break-all ${mono ? "font-mono text-xs leading-5" : "text-sm"} ${muted ? "text-muted-foreground" : ""}`}
      >
        {value}
      </span>
      {copyable && typeof value === "string" && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          title="复制"
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            })
          }}
        >
          {copied ? <Check className="text-green-600" /> : <Copy />}
        </Button>
      )}
    </div>
  )
}
