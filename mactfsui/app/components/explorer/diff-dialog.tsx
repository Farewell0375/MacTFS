import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { api } from "~/lib/api"
import type { TextDiff } from "~/lib/api"
import { cn } from "~/lib/utils"

// Diff 请求：本地 vs latest，或同一服务端文件两个历史版本。
export type DiffRequest =
  | { mode: "localLatest"; serverPath: string; localPath: string }
  | { mode: "revisions"; serverPath: string; sourceChangeset: number; targetChangeset: number }

// 解析后的 Diff 行：种类 + 双侧行号。
interface DiffLine {
  kind: "same" | "removed" | "added"
  text: string
  sourceLine: number | null
  targetLine: number | null
}

// 左右分栏视图中的一行：左旧右新，行级对齐。
interface SplitRow {
  kind: "same" | "removed" | "added" | "changed"
  left: { line: number; text: string } | null
  right: { line: number; text: string } | null
}

// 差异块：用于概览条与上一处 / 下一处差异导航。
interface DiffBlock {
  start: number
  length: number
}

// 视图模式在同一会话内记忆。
const VIEW_MODE_KEY = "mactfs-diff-view-mode"
// 内容区行高（leading-5 = 20px），用于滚动定位与概览条换算。
const LINE_HEIGHT = 20

/**
 * 把后端返回的前缀行（" " / "-" / "+"）解析为带双侧行号的结构。
 */
function parseDiffLines(raw: string[]): DiffLine[] {
  const result: DiffLine[] = []
  let sourceLine = 0
  let targetLine = 0
  for (const line of raw) {
    const prefix = line.charAt(0)
    const text = line.slice(1)
    if (prefix === "-") {
      sourceLine += 1
      result.push({ kind: "removed", text, sourceLine, targetLine: null })
    } else if (prefix === "+") {
      targetLine += 1
      result.push({ kind: "added", text, sourceLine: null, targetLine })
    } else {
      sourceLine += 1
      targetLine += 1
      result.push({ kind: "same", text, sourceLine, targetLine })
    }
  }
  return result
}

/**
 * 把统一行流配对成左右分栏行：连续的删除与新增按顺序两两对齐。
 */
function buildSplitRows(lines: DiffLine[]): SplitRow[] {
  const rows: SplitRow[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (line.kind === "same") {
      rows.push({
        kind: "same",
        left: { line: line.sourceLine as number, text: line.text },
        right: { line: line.targetLine as number, text: line.text },
      })
      index += 1
      continue
    }
    // 收集连续的删除块与紧随其后的新增块，按行配对。
    const removed: DiffLine[] = []
    const added: DiffLine[] = []
    while (index < lines.length && lines[index].kind === "removed") {
      removed.push(lines[index])
      index += 1
    }
    while (index < lines.length && lines[index].kind === "added") {
      added.push(lines[index])
      index += 1
    }
    const max = Math.max(removed.length, added.length)
    for (let i = 0; i < max; i += 1) {
      const left = removed[i]
      const right = added[i]
      rows.push({
        kind: left && right ? "changed" : left ? "removed" : "added",
        left: left ? { line: left.sourceLine as number, text: left.text } : null,
        right: right ? { line: right.targetLine as number, text: right.text } : null,
      })
    }
  }
  return rows
}

/**
 * 从行种类序列计算差异块（连续非 same 行）。
 */
function computeBlocks(kinds: string[]): DiffBlock[] {
  const blocks: DiffBlock[] = []
  let start = -1
  for (let index = 0; index <= kinds.length; index += 1) {
    const isDiff = index < kinds.length && kinds[index] !== "same"
    if (isDiff && start < 0) {
      start = index
    }
    if (!isDiff && start >= 0) {
      blocks.push({ start, length: index - start })
      start = -1
    }
  }
  return blocks
}

/**
 * 文本 Diff 弹窗：支持 本地 vs 服务器 latest 与 两个历史版本 对比。
 * 提供统一 / 左右分栏视图、差异概览条、上一处 / 下一处差异导航、搜索与仅看差异。
 */
export function DiffDialog({
  request,
  onClose,
}: {
  request: DiffRequest
  onClose: () => void
}) {
  const [diff, setDiff] = useState<TextDiff | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [onlyChanges, setOnlyChanges] = useState(false)
  const [viewMode, setViewMode] = useState<"unified" | "split">(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(VIEW_MODE_KEY) === "split") {
      return "split"
    }
    return "unified"
  })
  // 当前差异块序号（用于导航展示与跳转）。
  const [blockIndex, setBlockIndex] = useState(-1)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void (async () => {
      const result =
        request.mode === "localLatest"
          ? await api.diffLocalLatest({
              serverPath: request.serverPath,
              localPath: request.localPath,
            })
          : await api.diffRevisions({
              serverPath: request.serverPath,
              sourceChangeset: request.sourceChangeset,
              targetChangeset: request.targetChangeset,
            })
      if (!active) {
        return
      }
      setLoading(false)
      if (!result.ok || !result.data) {
        setError(result.errorMessage ?? "Diff 加载失败")
        return
      }
      setDiff(result.data.diff)
    })()
    return () => {
      active = false
    }
  }, [request])

  /**
   * 切换视图模式并记忆到当前会话。
   */
  const switchView = useCallback((mode: "unified" | "split") => {
    setViewMode(mode)
    setBlockIndex(-1)
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(VIEW_MODE_KEY, mode)
    }
  }, [])

  const lines = useMemo(() => parseDiffLines(diff?.lines ?? []), [diff])
  const changedCount = useMemo(
    () => lines.filter((line) => line.kind !== "same").length,
    [lines],
  )
  const keyword = search.trim().toLowerCase()

  const visibleLines = useMemo(
    () => (onlyChanges ? lines.filter((line) => line.kind !== "same") : lines),
    [lines, onlyChanges],
  )
  const splitRows = useMemo(() => buildSplitRows(visibleLines), [visibleLines])

  // 当前视图的行种类序列与总行数（决定概览条与导航定位）。
  const rowKinds = useMemo(
    () =>
      viewMode === "split"
        ? splitRows.map((row) => row.kind)
        : visibleLines.map((line) => line.kind),
    [viewMode, splitRows, visibleLines],
  )
  const blocks = useMemo(() => computeBlocks(rowKinds), [rowKinds])

  /**
   * 滚动内容区到指定行（行高固定，按索引换算）。
   */
  const scrollToRow = useCallback((rowIdx: number) => {
    const container = scrollRef.current
    if (!container) {
      return
    }
    container.scrollTo({
      top: Math.max(rowIdx * LINE_HEIGHT - container.clientHeight / 3, 0),
      behavior: "smooth",
    })
  }, [])

  /**
   * 跳到上一处 / 下一处差异块（循环）。
   */
  const goToBlock = useCallback(
    (direction: 1 | -1) => {
      if (blocks.length === 0) {
        return
      }
      const next = (blockIndex + direction + blocks.length) % blocks.length
      setBlockIndex(next)
      scrollToRow(blocks[next].start)
    },
    [blocks, blockIndex, scrollToRow],
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[92svh] max-h-[92svh] flex-col sm:max-w-[94vw]">
        <DialogHeader>
          <DialogTitle>
            {request.mode === "localLatest" ? "本地 vs 服务器 latest" : "历史版本对比"}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {request.serverPath}
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
          {diff && (
            <>
              <Badge variant="secondary" className="rounded-md bg-red-500/10 text-red-700 dark:text-red-400">
                − {diff.sourceLabel}
              </Badge>
              <Badge variant="secondary" className="rounded-md bg-green-500/10 text-green-700 dark:text-green-400">
                + {diff.targetLabel}
              </Badge>
              <span className="text-muted-foreground">{changedCount} 行差异</span>
            </>
          )}
          <div className="ml-2 flex items-center rounded-md border p-0.5">
            <ViewTab label="统一视图" active={viewMode === "unified"} onClick={() => switchView("unified")} />
            <ViewTab label="左右分栏" active={viewMode === "split"} onClick={() => switchView("split")} />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={blocks.length === 0}
              onClick={() => goToBlock(-1)}
              aria-label="上一处差异"
            >
              <ChevronUp />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={blocks.length === 0}
              onClick={() => goToBlock(1)}
              aria-label="下一处差异"
            >
              <ChevronDown />
            </Button>
            <span className="text-muted-foreground">
              {blocks.length === 0 ? "无差异块" : `${blockIndex + 1 > 0 ? blockIndex + 1 : "—"} / ${blocks.length}`}
            </span>
          </div>
          <label className="ml-auto flex items-center gap-1.5 text-muted-foreground">
            <Checkbox
              checked={onlyChanges}
              onCheckedChange={(value) => {
                setOnlyChanges(value === true)
                setBlockIndex(-1)
              }}
            />
            仅看差异
          </label>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索内容…"
            className="h-7 w-48 text-xs"
          />
        </div>

        <div className="flex min-h-0 flex-1 gap-1">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/20">
            {loading ? (
              <div className="flex h-60 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                正在生成 Diff…
              </div>
            ) : error ? (
              <div className="flex h-60 items-center justify-center p-6 text-center text-sm text-destructive">
                {error}
              </div>
            ) : rowKinds.length === 0 ? (
              <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
                {changedCount === 0 ? "两个版本内容一致" : "没有符合条件的行"}
              </div>
            ) : viewMode === "unified" ? (
              <UnifiedView lines={visibleLines} keyword={keyword} />
            ) : (
              <SplitView rows={splitRows} keyword={keyword} />
            )}
          </div>

          {!loading && !error && blocks.length > 0 && (
            <DiffMinimap
              blocks={blocks}
              totalRows={rowKinds.length}
              activeBlock={blockIndex}
              onJump={(index) => {
                setBlockIndex(index)
                scrollToRow(blocks[index].start)
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 视图切换小标签按钮。
 */
function ViewTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[5px] px-2 py-0.5 text-xs",
        active ? "bg-primary/10 font-medium text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
    </button>
  )
}

/**
 * 统一视图：单栏行流，删除红底、新增绿底。
 */
function UnifiedView({ lines, keyword }: { lines: DiffLine[]; keyword: string }) {
  return (
    <pre className="min-w-full font-mono text-xs leading-5">
      {lines.map((line, index) => {
        const hit = keyword.length > 0 && line.text.toLowerCase().includes(keyword)
        return (
          <div
            key={index}
            className={cn(
              "flex h-5",
              line.kind === "removed" && "bg-red-500/10",
              line.kind === "added" && "bg-green-500/10",
              hit && "bg-amber-500/20",
            )}
          >
            <span className="w-10 shrink-0 pr-1 text-right text-muted-foreground/60 select-none">
              {line.sourceLine ?? ""}
            </span>
            <span className="w-10 shrink-0 border-r pr-1 text-right text-muted-foreground/60 select-none">
              {line.targetLine ?? ""}
            </span>
            <span
              className={cn(
                "w-5 shrink-0 text-center select-none",
                line.kind === "removed" && "text-red-600",
                line.kind === "added" && "text-green-600",
              )}
            >
              {line.kind === "removed" ? "−" : line.kind === "added" ? "+" : ""}
            </span>
            <span className="whitespace-pre">{line.text}</span>
          </div>
        )
      })}
    </pre>
  )
}

/**
 * 左右分栏视图：旧版在左、新版在右，行级对齐。
 */
function SplitView({ rows, keyword }: { rows: SplitRow[]; keyword: string }) {
  return (
    <pre className="min-w-full font-mono text-xs leading-5">
      {rows.map((row, index) => {
        const hit =
          keyword.length > 0 &&
          ((row.left?.text.toLowerCase().includes(keyword) ?? false) ||
            (row.right?.text.toLowerCase().includes(keyword) ?? false))
        return (
          <div key={index} className={cn("flex h-5", hit && "bg-amber-500/20")}>
            <SplitCell
              side="left"
              cell={row.left}
              changed={row.kind === "changed" || row.kind === "removed"}
            />
            <span className="w-px shrink-0 bg-border" />
            <SplitCell
              side="right"
              cell={row.right}
              changed={row.kind === "changed" || row.kind === "added"}
            />
          </div>
        )
      })}
    </pre>
  )
}

/**
 * 分栏单元格：行号 + 内容，按差异种类着色。
 */
function SplitCell({
  side,
  cell,
  changed,
}: {
  side: "left" | "right"
  cell: { line: number; text: string } | null
  changed: boolean
}) {
  return (
    <span
      className={cn(
        "flex w-1/2 min-w-0",
        cell && changed && side === "left" && "bg-red-500/10",
        cell && changed && side === "right" && "bg-green-500/10",
        !cell && "bg-muted/40",
      )}
    >
      <span className="w-10 shrink-0 border-r pr-1 text-right text-muted-foreground/60 select-none">
        {cell?.line ?? ""}
      </span>
      <span className="min-w-0 flex-1 truncate whitespace-pre pl-1">{cell?.text ?? ""}</span>
    </span>
  )
}

/**
 * 差异概览条：按差异块在全文中的位置渲染标记，点击跳转。
 */
function DiffMinimap({
  blocks,
  totalRows,
  activeBlock,
  onJump,
}: {
  blocks: DiffBlock[]
  totalRows: number
  activeBlock: number
  onJump: (index: number) => void
}) {
  return (
    <div className="relative w-2.5 shrink-0 rounded-sm bg-muted/60" title="差异概览，点击标记跳转">
      {blocks.map((block, index) => {
        const top = (block.start / totalRows) * 100
        const height = Math.max((block.length / totalRows) * 100, 0.8)
        return (
          <button
            key={index}
            type="button"
            aria-label={`跳到第 ${index + 1} 处差异`}
            onClick={() => onJump(index)}
            className={cn(
              "absolute right-0 left-0 rounded-[2px]",
              index === activeBlock ? "bg-primary" : "bg-amber-500/80 hover:bg-amber-600",
            )}
            style={{ top: `${top}%`, height: `${height}%`, minHeight: "3px" }}
          />
        )
      })}
    </div>
  )
}
