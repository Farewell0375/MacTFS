import { useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw, Search } from "lucide-react"

import { Button } from "~/components/ui/button"
import { getFileContent } from "~/lib/api/endpoints"

interface FileViewerDialogProps {
  serverPath: string
  localPath?: string
  preferLocal: boolean
  open: boolean
  onClose(): void
}

/**
 * 只读展示本地映射文件或服务器 latest 文件内容，并处理大文件和二进制提示。
 */
export function FileViewerDialog({
  serverPath,
  localPath,
  preferLocal,
  open,
}: FileViewerDialogProps) {
  const [content, setContent] = useState("")
  const [source, setSource] = useState("")
  const [size, setSize] = useState(0)
  const [encoding, setEncoding] = useState("")
  const [renderable, setRenderable] = useState(false)
  const [binary, setBinary] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (open) {
      loadContent()
    }
  }, [open, serverPath, localPath, preferLocal])

  const lines = useMemo(() => content.split(/\r?\n/), [content])
  const lowerSearch = search.trim().toLowerCase()

  /**
   * 读取文件内容，优先本地映射文件，不满足条件时由调用方指定读取服务器 latest。
   */
  async function loadContent() {
    setLoading(true)
    setMessage("")

    const result = await getFileContent({
      serverPath,
      localPath,
      preferLocal,
    })
    setLoading(false)

    const file = result.data.file
    if (!result.success || !file) {
      setContent("")
      setRenderable(false)
      setMessage(result.errorMessage || result.message)
      return
    }

    setContent(file.content || "")
    setSource(file.source)
    setSize(file.size)
    setEncoding(file.encoding)
    setRenderable(file.renderable)
    setBinary(file.binary)
    setMessage("")
  }

  if (!open) {
    return null
  }

  return (
    <div className="flex h-[min(720px,calc(100svh-96px))] min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b px-3">
        <div className="min-w-0 truncate text-xs text-muted-foreground">
          来源：{source || (preferLocal ? "local" : "server")} · {size} bytes ·{" "}
          {encoding || "-"}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-7 items-center gap-1 rounded-[6px] border bg-background px-2">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              className="w-36 bg-transparent text-xs outline-none"
              value={search}
              placeholder="搜索"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={loading}
            title="刷新"
            onClick={loadContent}
          >
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          </Button>
        </div>
      </div>

      {message && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {message}
        </div>
      )}

      {!renderable && !message ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {binary ? "二进制文件不支持文本预览。" : "文件超过 5MB，不直接渲染内容。"}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto bg-background font-mono text-xs">
          {lines.map((line, index) => {
            const matched =
              lowerSearch && line.toLowerCase().includes(lowerSearch)
            return (
              <div
                key={index}
                className={`grid min-h-6 grid-cols-[56px_minmax(0,1fr)] border-b ${
                  matched ? "bg-amber-50" : ""
                }`}
              >
                <div className="bg-muted/20 px-2 py-1 text-right text-muted-foreground">
                  {index + 1}
                </div>
                <pre className="overflow-visible whitespace-pre-wrap px-2 py-1">
                  {line || " "}
                </pre>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
