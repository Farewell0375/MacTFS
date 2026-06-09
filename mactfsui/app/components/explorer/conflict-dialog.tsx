import { useEffect, useState } from "react"
import { GitCompareArrows, Loader2 } from "lucide-react"

import { Button } from "~/components/ui/button"
import { applyConflictChoice } from "~/lib/api/endpoints"
import type { TfsConflictInfo } from "~/lib/api/types"

type ConflictChoice = "useServer" | "keepLocal" | "autoMerge"

interface ConflictDialogProps {
  conflicts: TfsConflictInfo[]
  open: boolean
  onOpenDiff(conflict: TfsConflictInfo): void
  onApplied(): void
}

const CHOICE_LABELS: Record<ConflictChoice, string> = {
  useServer: "使用服务器版本",
  keepLocal: "保留本地版本",
  autoMerge: "自动合并",
}

/**
 * 统一处理 Get Latest / Checkout 返回的冲突明细，允许逐文件或批量选择处理方式。
 */
export function ConflictDialog({
  conflicts,
  open,
  onOpenDiff,
  onApplied,
}: ConflictDialogProps) {
  const [choices, setChoices] = useState<Record<string, ConflictChoice>>({})
  const [applying, setApplying] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (open) {
      const nextChoices: Record<string, ConflictChoice> = {}
      conflicts.forEach((conflict) => {
        nextChoices[conflict.serverPath] = "keepLocal"
      })
      setChoices(nextChoices)
      setMessage("")
    }
  }, [open, conflicts])

  /**
   * 批量设置冲突选择，之后仍允许用户逐文件改选。
   */
  function setAll(choice: ConflictChoice) {
    const nextChoices: Record<string, ConflictChoice> = {}
    conflicts.forEach((conflict) => {
      nextChoices[conflict.serverPath] = choice
    })
    setChoices(nextChoices)
  }

  /**
   * 按当前选择逐个调用后端应用冲突处理结果。
   */
  async function applyChoices() {
    setApplying(true)
    setMessage("")

    for (const conflict of conflicts) {
      const choice = choices[conflict.serverPath] || "keepLocal"
      const result = await applyConflictChoice({
        serverPath: conflict.serverPath,
        choice,
      })
      if (!result.success) {
        setApplying(false)
        setMessage(result.errorMessage || result.message)
        return
      }
    }

    setApplying(false)
    onApplied()
  }

  if (!open) {
    return null
  }

  return (
    <div className="flex h-[min(640px,calc(100svh-96px))] min-h-0 flex-col">
      <div className="flex min-h-10 shrink-0 items-center justify-between gap-3 border-b px-3 text-xs">
        <div className="text-muted-foreground">{conflicts.length} 个冲突文件</div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="xs" variant="outline" onClick={() => setAll("useServer")}>
            全部使用服务器版本
          </Button>
          <Button size="xs" variant="outline" onClick={() => setAll("keepLocal")}>
            全部保留本地版本
          </Button>
        </div>
      </div>

      {message && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {message}
        </div>
      )}

      <div className="grid h-8 shrink-0 grid-cols-[minmax(260px,1fr)_160px_120px_160px_80px] border-b bg-muted/20 px-3 text-xs font-medium text-muted-foreground">
        <div className="flex items-center">文件</div>
        <div className="flex items-center">本地路径</div>
        <div className="flex items-center">大小</div>
        <div className="flex items-center">选择</div>
        <div className="flex items-center">Diff</div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {conflicts.map((conflict) => (
          <div
            key={conflict.serverPath}
            className="grid min-h-9 grid-cols-[minmax(260px,1fr)_160px_120px_160px_80px] items-center border-b px-3 text-xs"
          >
            <div className="truncate font-mono">{conflict.serverPath}</div>
            <div className="truncate font-mono text-muted-foreground">
              {conflict.localPath || "-"}
            </div>
            <div className="font-mono text-muted-foreground">
              {conflict.fileSize}
            </div>
            <select
              className="h-7 rounded-[6px] border bg-background px-2"
              value={choices[conflict.serverPath] || "keepLocal"}
              onChange={(event) =>
                setChoices((currentChoices) => ({
                  ...currentChoices,
                  [conflict.serverPath]: event.target.value as ConflictChoice,
                }))
              }
            >
              {Object.entries(CHOICE_LABELS)
                .filter(
                  ([choice]) =>
                    choice !== "autoMerge" || conflict.autoMergeable
                )
                .map(([choice, label]) => (
                  <option key={choice} value={choice}>
                    {label}
                  </option>
                ))}
            </select>
            <Button
              size="xs"
              variant="outline"
              disabled={!conflict.renderable}
              onClick={() => onOpenDiff(conflict)}
            >
              <GitCompareArrows />
              Diff
            </Button>
          </div>
        ))}
      </div>

      <div className="flex h-11 shrink-0 justify-end gap-2 border-t px-3 py-2">
        <Button size="sm" disabled={applying} onClick={applyChoices}>
          {applying && <Loader2 className="animate-spin" />}
          应用选择
        </Button>
      </div>
    </div>
  )
}
