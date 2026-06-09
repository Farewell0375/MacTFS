import { useEffect, useState } from "react"
import {
  FileText,
  Folder,
  GitCompareArrows,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react"

import { Button } from "~/components/ui/button"
import type { DiffPanelRequest } from "~/components/explorer/diff-panel"
import { queryChangesetFiles, queryHistory } from "~/lib/api/endpoints"
import type { TfsHistoryEntry } from "~/lib/api/types"

interface HistoryPanelProps {
  path: string
  folder: boolean
  label: string
  onOpenDiff(request: DiffPanelRequest): void
  onClose(): void
}

/**
 * 展示文件或目录历史，并支持目录 changeset 文件列表和历史 diff 入口。
 */
export function HistoryPanel({
  path,
  folder,
  label,
  onOpenDiff,
  onClose,
}: HistoryPanelProps) {
  const [history, setHistory] = useState<TfsHistoryEntry[]>([])
  const [changesetFiles, setChangesetFiles] = useState<TfsHistoryEntry[]>([])
  const [selectedChangeset, setSelectedChangeset] = useState<number>()
  const [selectedRevisionKeys, setSelectedRevisionKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [filesLoading, setFilesLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [diffMessage, setDiffMessage] = useState("")

  useEffect(() => {
    loadHistory()
  }, [path, folder])

  const selectedRevisions = history.filter((entry) =>
    selectedRevisionKeys.includes(toHistoryKey(entry))
  )

  /**
   * 查询当前文件或目录最近 100 条历史记录。
   */
  async function loadHistory() {
    setLoading(true)
    setMessage("")
    setDiffMessage("")
    setChangesetFiles([])
    setSelectedChangeset(undefined)
    setSelectedRevisionKeys([])

    const result = await queryHistory(path, folder)
    setLoading(false)

    if (!result.success) {
      setHistory([])
      setMessage(result.errorMessage || result.message)
      return
    }

    setHistory(result.data.history)
  }

  /**
   * 查询目录历史中某个 changeset 影响的文件列表。
   */
  async function loadChangesetFiles(changeset: number) {
    setFilesLoading(true)
    setMessage("")
    setDiffMessage("")
    setSelectedChangeset(changeset)

    const result = await queryChangesetFiles(changeset)
    setFilesLoading(false)

    if (!result.success) {
      setChangesetFiles([])
      setMessage(result.errorMessage || result.message)
      return
    }

    setChangesetFiles(result.data.files)
  }

  /**
   * 使用 changeset 作为历史版本选择 key。
   */
  function toHistoryKey(entry: TfsHistoryEntry) {
    return String(entry.changeset)
  }

  /**
   * 选择最多两个文件历史版本，供后续 Diff 面板使用。
   */
  function toggleRevision(entry: TfsHistoryEntry, checked: boolean) {
    const key = toHistoryKey(entry)
    setSelectedRevisionKeys((currentKeys) => {
      if (!checked) {
        return currentKeys.filter((currentKey) => currentKey !== key)
      }
      if (currentKeys.includes(key)) {
        return currentKeys
      }
      return [...currentKeys, key].slice(-2)
    })
  }

  /**
   * 格式化后端毫秒时间戳。
   */
  function formatHistoryDate(date?: number | null) {
    return date ? new Date(date).toLocaleString() : "-"
  }

  /**
   * 打开用户选择的两个历史版本 diff。
   */
  function enterHistoryDiff() {
    if (selectedRevisions.length !== 2) {
      return
    }

    onOpenDiff({
      type: "revisions",
      serverPath: path,
      sourceChangeset: selectedRevisions[0].changeset,
      targetChangeset: selectedRevisions[1].changeset,
      label: `${path};C${selectedRevisions[0].changeset} ↔ C${selectedRevisions[1].changeset}`,
    })
  }

  /**
   * 记录 changeset 文件列表中的单文件 diff 入口。
   */
  function enterChangesetFileDiff(file: TfsHistoryEntry) {
    setDiffMessage(
      `已选择 ${file.serverPath} @${file.changeset}。请打开该文件历史并选择两个版本进入 Diff。`
    )
  }

  return (
    <div className="border-b bg-background">
      <div className="flex min-h-9 items-center justify-between gap-3 px-3 py-1.5 text-xs">
        <div className="min-w-0">
          <div className="font-medium">History</div>
          <div className="truncate font-mono text-muted-foreground">
            {label}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={loading}
            title="刷新历史"
            onClick={loadHistory}
          >
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          </Button>
          <Button size="icon-xs" variant="ghost" title="关闭" onClick={onClose}>
            <X />
          </Button>
        </div>
      </div>

      {message && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {message}
        </div>
      )}

      {diffMessage && (
        <div className="border-t bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
          {diffMessage}
        </div>
      )}

      <div className="grid max-h-80 border-t md:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-h-0 overflow-auto">
          <div className="min-w-[760px]">
            <div className="grid h-7 grid-cols-[36px_86px_110px_130px_150px_minmax(180px,1fr)] border-b bg-muted/20 px-3 text-xs font-medium text-muted-foreground">
              <div className="flex items-center">Diff</div>
              <div className="flex items-center">Changeset</div>
              <div className="flex items-center">变更</div>
              <div className="flex items-center">作者</div>
              <div className="flex items-center">时间</div>
              <div className="flex items-center">Comment</div>
            </div>

            {history.length === 0 && !loading ? (
              <div className="px-3 py-4 text-xs text-muted-foreground">
                暂无历史记录。
              </div>
            ) : (
              history.map((entry) => (
                <div
                  key={toHistoryKey(entry)}
                  className={`grid min-h-8 grid-cols-[36px_86px_110px_130px_150px_minmax(180px,1fr)] items-center border-b px-3 text-xs ${
                    selectedChangeset === entry.changeset
                      ? "bg-primary/10"
                      : ""
                  }`}
                >
                  <label className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      disabled={folder}
                      checked={selectedRevisionKeys.includes(
                        toHistoryKey(entry)
                      )}
                      aria-label={`选择 changeset ${entry.changeset}`}
                      onChange={(event) =>
                        toggleRevision(entry, event.target.checked)
                      }
                    />
                  </label>
                  <div className="font-mono">{entry.changeset}</div>
                  <div className="truncate text-muted-foreground">
                    {entry.changeType || "-"}
                  </div>
                  <div className="truncate">{entry.author || "-"}</div>
                  <div className="truncate text-muted-foreground">
                    {formatHistoryDate(entry.date)}
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="truncate">{entry.comment || "-"}</span>
                    {folder && (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => loadChangesetFiles(entry.changeset)}
                      >
                        文件
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="min-h-0 border-t bg-muted/10 p-2 text-xs md:border-t-0 md:border-l">
          {folder ? (
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  Changeset {selectedChangeset ?? "-"}
                </span>
                {filesLoading && <Loader2 className="size-3 animate-spin" />}
              </div>
              {changesetFiles.length === 0 ? (
                <div className="text-muted-foreground">
                  点击目录历史 changeset 查看影响文件。
                </div>
              ) : (
                <div className="grid max-h-64 gap-2 overflow-auto">
                  {changesetFiles.map((file) => (
                    <div
                      key={`${file.changeset}:${file.serverPath}`}
                      className="grid gap-1 border-b pb-2 last:border-b-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        {file.itemType.toLowerCase().includes("folder") ? (
                          <Folder className="size-3.5 shrink-0 text-amber-600" />
                        ) : (
                          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate font-mono">
                          {file.serverPath}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          {file.changeType || "-"}
                        </span>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => enterChangesetFileDiff(file)}
                        >
                          <GitCompareArrows />
                          Diff
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-2">
              <div className="font-medium">历史 Diff</div>
              <div className="text-muted-foreground">
                选择两个历史版本后进入 Diff。
              </div>
              <Button
                size="xs"
                variant="outline"
                disabled={selectedRevisions.length !== 2}
                onClick={enterHistoryDiff}
              >
                <GitCompareArrows />
                Diff
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
