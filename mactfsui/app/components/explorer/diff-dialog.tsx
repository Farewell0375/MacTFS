import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { editor as MonacoEditor } from "monaco-editor"
import { ChevronDown, ChevronUp, Loader2, Search } from "lucide-react"

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
import { api } from "~/lib/api"
import type { TextDiff } from "~/lib/api"
import { cn } from "~/lib/utils"

// Diff 请求：本地 vs latest，或同一服务端文件两个历史版本。
export type DiffRequest =
  | { mode: "localLatest"; serverPath: string; localPath: string }
  | { mode: "revisions"; serverPath: string; sourceChangeset: number; targetChangeset: number }

// 视图模式在同一会话内记忆。
const VIEW_MODE_KEY = "mactfs-diff-view-mode"

/**
 * 把后端返回的前缀行（" " / "-" / "+"）还原成左右两侧完整文本：
 * 空格与 "-" 行属于旧版（左），空格与 "+" 行属于新版（右）。
 */
function splitDiffSides(raw: string[]): { original: string; modified: string } {
  const original: string[] = []
  const modified: string[] = []
  for (const line of raw) {
    const prefix = line.charAt(0)
    const text = line.slice(1)
    if (prefix === "-") {
      original.push(text)
    } else if (prefix === "+") {
      modified.push(text)
    } else {
      original.push(text)
      modified.push(text)
    }
  }
  return { original: original.join("\n"), modified: modified.join("\n") }
}

/**
 * 判断当前应用是否处于暗色主题（class 方案），用于选择 Monaco 主题。
 */
function isDarkTheme(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark")
}

/**
 * 文本 Diff 弹窗：基于 Monaco DiffEditor 渲染，支持 本地 vs 服务器 latest
 * 与 两个历史版本 对比。提供统一 / 左右分栏视图、上一处 / 下一处差异导航、
 * 仅看差异（折叠未变动区域）、搜索（Cmd+F）、字级高亮与语法着色。
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
  const [onlyChanges, setOnlyChanges] = useState(false)
  const [viewMode, setViewMode] = useState<"unified" | "split">(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(VIEW_MODE_KEY) === "unified") {
      return "unified"
    }
    return "split"
  })
  // 差异块总数与当前导航到的差异块序号。
  const [blockCount, setBlockCount] = useState(0)
  const [blockIndex, setBlockIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<MonacoEditor.IStandaloneDiffEditor | null>(null)

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

  const changedCount = useMemo(
    () => (diff?.lines ?? []).filter((line) => line.charAt(0) === "-" || line.charAt(0) === "+").length,
    [diff],
  )

  // 创建 Monaco DiffEditor：动态 import 保证大体积依赖只在打开弹窗时加载。
  useEffect(() => {
    if (!diff) {
      return
    }
    let disposed = false
    let diffEditor: MonacoEditor.IStandaloneDiffEditor | null = null
    let originalModel: MonacoEditor.ITextModel | null = null
    let modifiedModel: MonacoEditor.ITextModel | null = null
    void (async () => {
      const { monaco, detectLanguage } = await import("~/lib/monaco")
      if (disposed || !containerRef.current) {
        return
      }
      const { original, modified } = splitDiffSides(diff.lines)
      const language = detectLanguage(request.serverPath)
      originalModel = monaco.editor.createModel(original, language)
      modifiedModel = monaco.editor.createModel(modified, language)
      diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
        readOnly: true,
        originalEditable: false,
        automaticLayout: true,
        renderSideBySide: viewMode === "split",
        hideUnchangedRegions: { enabled: onlyChanges },
        theme: isDarkTheme() ? "mactfs-dark" : "mactfs-light",
        fontSize: 12,
        lineHeight: 20,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        renderOverviewRuler: true,
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        diffWordWrap: "off",
        diffAlgorithm: "advanced",
        renderLineHighlight: "none",
        folding: false,
        glyphMargin: false,
        guides: { indentation: false },
        padding: { top: 8, bottom: 8 },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false },
        renderMarginRevertIcon: false,
      })
      diffEditor.setModel({ original: originalModel, modified: modifiedModel })
      diffEditor.onDidUpdateDiff(() => {
        setBlockCount(diffEditor?.getLineChanges()?.length ?? 0)
      })
      editorRef.current = diffEditor
    })()
    return () => {
      disposed = true
      editorRef.current = null
      diffEditor?.dispose()
      originalModel?.dispose()
      modifiedModel?.dispose()
      setBlockCount(0)
      setBlockIndex(-1)
    }
  }, [diff, request.serverPath])

  /**
   * 切换 统一视图（inline）/ 左右分栏（side by side），并记忆到当前会话。
   */
  const switchView = useCallback((mode: "unified" | "split") => {
    setViewMode(mode)
    editorRef.current?.updateOptions({ renderSideBySide: mode === "split" })
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(VIEW_MODE_KEY, mode)
    }
  }, [])

  /**
   * 切换「仅看差异」：折叠 / 展开未变动区域。
   */
  const switchOnlyChanges = useCallback((value: boolean) => {
    setOnlyChanges(value)
    editorRef.current?.updateOptions({ hideUnchangedRegions: { enabled: value } })
  }, [])

  /**
   * 跳到上一处 / 下一处差异块（循环），定位到新版一侧并居中。
   */
  const goToBlock = useCallback(
    (direction: 1 | -1) => {
      const diffEditor = editorRef.current
      const changes = diffEditor?.getLineChanges() ?? []
      if (!diffEditor || changes.length === 0) {
        return
      }
      const next = (blockIndex + direction + changes.length) % changes.length
      setBlockIndex(next)
      const change = changes[next]
      const line =
        change.modifiedStartLineNumber > 0
          ? change.modifiedStartLineNumber
          : Math.max(change.modifiedEndLineNumber, 1)
      const modifiedEditor = diffEditor.getModifiedEditor()
      modifiedEditor.revealLineInCenter(line)
      modifiedEditor.setPosition({ lineNumber: line, column: 1 })
      modifiedEditor.focus()
    },
    [blockIndex],
  )

  /**
   * 打开 Monaco 内置搜索框（等价于在内容区按 Cmd+F）。
   */
  const openSearch = useCallback(() => {
    const modifiedEditor = editorRef.current?.getModifiedEditor()
    modifiedEditor?.focus()
    void modifiedEditor?.getAction("actions.find")?.run()
  }, [])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[92svh] max-h-[92svh] flex-col sm:max-w-[94vw]">
        <DialogHeader>
          <DialogTitle>
            {request.mode === "localLatest" ? "服务器 latest vs 本地" : "历史版本对比"}
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
              disabled={blockCount === 0}
              onClick={() => goToBlock(-1)}
              aria-label="上一处差异"
            >
              <ChevronUp />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={blockCount === 0}
              onClick={() => goToBlock(1)}
              aria-label="下一处差异"
            >
              <ChevronDown />
            </Button>
            <span className="text-muted-foreground">
              {blockCount === 0 ? "无差异块" : `${blockIndex + 1 > 0 ? blockIndex + 1 : "—"} / ${blockCount}`}
            </span>
          </div>
          <label className="ml-auto flex items-center gap-1.5 text-muted-foreground">
            <Checkbox
              checked={onlyChanges}
              onCheckedChange={(value) => switchOnlyChanges(value === true)}
            />
            仅看差异
          </label>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={openSearch}>
            <Search className="size-3.5" />
            搜索
          </Button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              正在生成 Diff…
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-destructive">
              {error}
            </div>
          ) : changedCount === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              两个版本内容一致
            </div>
          ) : (
            <div ref={containerRef} className="absolute inset-0" />
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
