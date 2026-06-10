import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"

import { Badge } from "~/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { api } from "~/lib/api"
import type { FileContent } from "~/lib/api"
import { cn } from "~/lib/utils"

// 查看来源：本地映射文件或服务器 latest。
type ViewSource = "local" | "server"

/**
 * 把字节数格式化为可读大小。
 */
function formatSize(size: number): string {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

/**
 * 文件查看弹窗：只读展示本地或服务器 latest 内容，
 * 支持来源切换、行号与搜索高亮；二进制 / 超大 / 非映射路径给出明确提示。
 */
export function FileViewDialog({
  serverPath,
  localPath,
  onClose,
}: {
  serverPath: string
  localPath: string | null
  onClose: () => void
}) {
  const [source, setSource] = useState<ViewSource>(localPath ? "local" : "server")
  const [content, setContent] = useState<FileContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  // 加载所选来源的文件内容；本地内容仅在已映射时可用。
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void (async () => {
      const result =
        source === "local" && localPath
          ? await api.getFileContent({ localPath })
          : await api.getFileContent({ serverPath })
      if (!active) {
        return
      }
      setLoading(false)
      if (!result.ok || !result.data) {
        setContent(null)
        setError(result.errorMessage ?? "文件内容加载失败")
        return
      }
      setContent(result.data.content)
    })()
    return () => {
      active = false
    }
  }, [source, serverPath, localPath])

  const lines = useMemo(
    () => (content && !content.binary && !content.tooLarge ? content.content.split(/\r?\n/) : []),
    [content],
  )
  const keyword = search.trim().toLowerCase()
  const matchCount = useMemo(
    () =>
      keyword.length === 0
        ? 0
        : lines.filter((line) => line.toLowerCase().includes(keyword)).length,
    [lines, keyword],
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>查看文件</DialogTitle>
          <DialogDescription className="font-mono text-xs">{serverPath}</DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border p-0.5">
            <SourceTab
              label="本地文件"
              active={source === "local"}
              disabled={!localPath}
              disabledReason="未映射到本地"
              onClick={() => setSource("local")}
            />
            <SourceTab
              label="服务器 latest"
              active={source === "server"}
              onClick={() => setSource("server")}
            />
          </div>
          {content && (
            <span className="text-xs text-muted-foreground">
              {formatSize(content.size)}
              {content.changeset > 0 && ` · 版本 ${content.changeset}`}
            </span>
          )}
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索内容…"
            className="ml-auto h-7 w-48 text-xs"
          />
          {keyword.length > 0 && (
            <Badge variant="secondary" className="rounded-md">
              {matchCount} 行命中
            </Badge>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/20">
          {loading ? (
            <div className="flex h-60 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              正在加载内容…
            </div>
          ) : error ? (
            <div className="flex h-60 items-center justify-center p-6 text-center text-sm text-destructive">
              {error}
            </div>
          ) : content?.binary ? (
            <Notice text={`二进制文件不支持预览（${formatSize(content.size)}）`} />
          ) : content?.tooLarge ? (
            <Notice text={`文件过大（${formatSize(content.size)}），不直接渲染内容`} />
          ) : (
            <pre className="min-w-full font-mono text-xs leading-5">
              {lines.map((line, index) => {
                const hit = keyword.length > 0 && line.toLowerCase().includes(keyword)
                return (
                  <div
                    key={index}
                    className={cn("flex", hit && "bg-amber-500/15")}
                  >
                    <span className="w-12 shrink-0 border-r pr-2 text-right text-muted-foreground/60 select-none">
                      {index + 1}
                    </span>
                    <span className="whitespace-pre-wrap break-all pl-2">{line}</span>
                  </div>
                )
              })}
            </pre>
          )}
        </div>

        <p className="shrink-0 text-xs text-muted-foreground">
          只读查看 · 来源：{source === "local" ? `本地 ${localPath ?? ""}` : "服务器 latest"}
        </p>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 来源切换小标签按钮。
 */
function SourceTab({
  label,
  active,
  disabled,
  disabledReason,
  onClick,
}: {
  label: string
  active: boolean
  disabled?: boolean
  disabledReason?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      onClick={onClick}
      className={cn(
        "rounded-[5px] px-2 py-0.5 text-xs",
        active ? "bg-primary/10 font-medium text-foreground" : "text-muted-foreground",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {label}
    </button>
  )
}

/**
 * 内容区占位提示（二进制 / 超大文件）。
 */
function Notice({ text }: { text: string }) {
  return (
    <div className="flex h-60 items-center justify-center p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}
