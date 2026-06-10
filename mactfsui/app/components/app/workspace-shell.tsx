import { useCallback, useEffect, useMemo, useState } from "react"

import { TopBar, type PanelVisibility } from "~/components/app/top-bar"
import { CompareDialog } from "~/components/explorer/compare-dialog"
import { ConflictDialog } from "~/components/explorer/conflict-dialog"
import { DiffDialog, type DiffRequest } from "~/components/explorer/diff-dialog"
import { FileViewDialog } from "~/components/explorer/file-view-dialog"
import { FolderItemsPanel } from "~/components/explorer/folder-items-panel"
import { HistoryDialog } from "~/components/explorer/history-dialog"
import { MappingDialog } from "~/components/explorer/mapping-dialog"
import { SourceTreePanel } from "~/components/explorer/source-tree-panel"
import { ChangesPanel } from "~/components/inspector/changes-panel"
import { ConsolePanel } from "~/components/logs/console-panel"
import { TooltipProvider } from "~/components/ui/tooltip"
import { api } from "~/lib/api"
import type { MappingInfo, PendingChange } from "~/lib/api"
import type { FileActionId, FileTarget, WorkspaceSession } from "~/lib/tfs"
import { cn } from "~/lib/utils"

// 当前打开的业务弹窗：Mapping / History / 目录对比 / 文件查看 / Diff / 冲突处理。
type DialogState =
  | { kind: "mapping"; serverPath: string }
  | { kind: "history"; serverPath: string; folder: boolean }
  | { kind: "compare"; serverPath: string }
  | { kind: "viewFile"; serverPath: string; localPath: string | null }
  | { kind: "diff"; request: DiffRequest }
  | { kind: "conflicts"; serverPath: string }
  | null

// 顶部细条通知：信息（操作摘要）或错误。
interface ActionNotice {
  kind: "info" | "error"
  text: string
}

/**
 * 三栏工作台外壳：顶部上下文栏 + 左侧目录树 + 中间主工作区 + 右侧 Changes + 底部 Console。
 * 持有面板显隐、挂起更改共享状态，并集中分发对象右键菜单动作。
 */
export function WorkspaceShell({
  session,
  selectedServerPath,
  onNavigate,
  onMappingsChanged,
  onReconnect,
}: {
  session: WorkspaceSession
  selectedServerPath: string
  onNavigate: (serverPath: string) => void
  onMappingsChanged: (mappings: MappingInfo[]) => void
  onReconnect: () => void
}) {
  const [panels, setPanels] = useState<PanelVisibility>({
    tree: true,
    changes: true,
    console: true,
  })
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [pendingError, setPendingError] = useState<string | null>(null)
  // 中间列表刷新令牌：文件操作完成后递增触发重新加载。
  const [itemsRefreshToken, setItemsRefreshToken] = useState(0)
  const [notice, setNotice] = useState<ActionNotice | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [dialog, setDialog] = useState<DialogState>(null)

  /**
   * 切换指定面板的展开 / 收起状态。
   */
  const togglePanel = useCallback((panel: keyof PanelVisibility) => {
    setPanels((prev) => ({ ...prev, [panel]: !prev[panel] }))
  }, [])

  /**
   * 刷新当前 Workspace 的挂起更改列表。
   */
  const refreshPendingChanges = useCallback(async () => {
    setPendingLoading(true)
    const result = await api.getPendingChanges()
    setPendingLoading(false)
    if (!result.ok) {
      setPendingError(result.errorMessage ?? "挂起更改加载失败")
      return
    }
    setPendingError(null)
    setPendingChanges(result.data?.pendingChanges ?? [])
  }, [])

  useEffect(() => {
    void refreshPendingChanges()
  }, [refreshPendingChanges])

  // serverPath -> 挂起状态，供文件列表生成菜单时控制可用性。
  const pendingByServerPath = useMemo(() => {
    const map: Record<string, string> = {}
    for (const change of pendingChanges) {
      map[change.serverPath] = change.status
    }
    return map
  }, [pendingChanges])

  /**
   * 执行 Get Latest（目录递归），返回是否产生冲突；摘要写入顶部通知。
   */
  const runGetLatest = useCallback(async (target: FileTarget): Promise<boolean> => {
    const result = await api.getLatest({
      serverPath: target.serverPath,
      recursive: target.folder,
    })
    if (!result.ok || !result.data) {
      setNotice({ kind: "error", text: result.errorMessage ?? "获取最新失败" })
      return false
    }
    const summary = result.data.result
    const parts = [`更新 ${summary.updated} 项`]
    if (summary.conflicts > 0) {
      parts.push(`冲突 ${summary.conflicts} 项`)
    }
    if (summary.failures > 0) {
      parts.push(`跳过 / 失败 ${summary.failures} 项`)
    }
    setNotice({ kind: summary.conflicts > 0 ? "error" : "info", text: `获取最新完成：${parts.join("，")}` })
    setItemsRefreshToken((token) => token + 1)
    if (summary.conflicts > 0) {
      setDialog({ kind: "conflicts", serverPath: target.serverPath })
      return true
    }
    return false
  }, [])

  /**
   * 执行 Checkout：先 Get Latest，出现冲突时进入统一冲突弹窗；
   * 无冲突则签出并提示跳过 / 失败项，完成后刷新挂起更改。
   */
  const runCheckout = useCallback(
    async (target: FileTarget) => {
      const hadConflicts = await runGetLatest(target)
      if (hadConflicts) {
        setNotice({
          kind: "error",
          text: "获取最新存在冲突，请先处理冲突后再签出",
        })
        return
      }
      const result = await api.checkout({
        paths: [target.serverPath],
        recursive: target.folder,
      })
      if (!result.ok || !result.data) {
        setNotice({ kind: "error", text: result.errorMessage ?? "签出失败" })
        return
      }
      const summary = result.data.result
      const failureText =
        summary.failures.length > 0 ? `，跳过 ${summary.failures.length} 项（${summary.failures.slice(0, 3).join("；")}${summary.failures.length > 3 ? "…" : ""}）` : ""
      setNotice({
        kind: summary.failures.length > 0 ? "error" : "info",
        text: `签出完成：${summary.affected} 项${failureText}`,
      })
      await refreshPendingChanges()
    },
    [runGetLatest, refreshPendingChanges],
  )

  /**
   * 对象右键菜单动作统一分发器。
   * unmap / getLatest / checkout 直接执行；map / history / compare / viewFile / diff 打开对应弹窗；
   * delete / undo 由 FE-010 接管。
   */
  const handleFileAction = useCallback(
    async (target: FileTarget, action: FileActionId) => {
      setNotice(null)
      switch (action) {
        case "unmap": {
          const result = await api.deleteMapping({ serverPath: target.serverPath })
          if (!result.ok) {
            setNotice({ kind: "error", text: result.errorMessage ?? "取消映射失败" })
            return
          }
          // 不跳转当前浏览位置，仅更新 mappings 让动作可用性与状态列刷新。
          onMappingsChanged(result.data?.mappings ?? [])
          break
        }
        case "getLatest":
          setActionBusy(true)
          setNotice({ kind: "info", text: "正在获取最新…" })
          await runGetLatest(target)
          setActionBusy(false)
          break
        case "checkout":
          setActionBusy(true)
          setNotice({ kind: "info", text: "正在签出…" })
          await runCheckout(target)
          setActionBusy(false)
          break
        case "map":
          setDialog({ kind: "mapping", serverPath: target.serverPath })
          break
        case "history":
          setDialog({ kind: "history", serverPath: target.serverPath, folder: target.folder })
          break
        case "compare":
          setDialog({ kind: "compare", serverPath: target.serverPath })
          break
        case "viewFile":
          setDialog({
            kind: "viewFile",
            serverPath: target.serverPath,
            localPath: target.localPath,
          })
          break
        case "diffLocalLatest":
          if (target.localPath) {
            setDialog({
              kind: "diff",
              request: {
                mode: "localLatest",
                serverPath: target.serverPath,
                localPath: target.localPath,
              },
            })
          }
          break
        default:
          // delete / undo（FE-010）由后续任务接管。
          break
      }
    },
    [onMappingsChanged, runGetLatest, runCheckout],
  )

  /**
   * Mapping 创建成功：刷新 mappings 与当前目录列表，保持浏览位置并关闭弹窗。
   */
  const handleMappingCreated = useCallback(
    (mappings: MappingInfo[]) => {
      onMappingsChanged(mappings)
      setItemsRefreshToken((token) => token + 1)
      setDialog(null)
    },
    [onMappingsChanged],
  )

  return (
    <TooltipProvider>
      <div className="flex h-svh flex-col overflow-hidden bg-background">
        <TopBar
          session={session}
          panels={panels}
          onTogglePanel={togglePanel}
          onReconnect={onReconnect}
        />

        {notice && (
          <div
            className={cn(
              "flex shrink-0 items-center gap-2 border-b px-3 py-1 text-xs",
              notice.kind === "error"
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/5 text-foreground",
            )}
          >
            {actionBusy && <span className="size-2 animate-pulse rounded-full bg-primary" />}
            {notice.text}
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          {panels.tree && (
            <SourceTreePanel
              collection={session.collection}
              mappings={session.mappings}
              selectedServerPath={selectedServerPath}
              onNavigate={onNavigate}
              onFileAction={handleFileAction}
            />
          )}
          <FolderItemsPanel
            session={session}
            selectedServerPath={selectedServerPath}
            pendingByServerPath={pendingByServerPath}
            refreshToken={itemsRefreshToken}
            onNavigate={onNavigate}
            onFileAction={handleFileAction}
          />
          {panels.changes && (
            <ChangesPanel
              mappings={session.mappings}
              pendingChanges={pendingChanges}
              loading={pendingLoading}
              error={pendingError}
              onFileAction={handleFileAction}
            />
          )}
        </div>

        {panels.console && <ConsolePanel />}

        {dialog?.kind === "mapping" && (
          <MappingDialog
            serverPath={dialog.serverPath}
            onClose={() => setDialog(null)}
            onCreated={handleMappingCreated}
          />
        )}
        {dialog?.kind === "history" && (
          <HistoryDialog
            serverPath={dialog.serverPath}
            folder={dialog.folder}
            onClose={() => setDialog(null)}
            onDiffRevisions={(serverPath, sourceChangeset, targetChangeset) =>
              setDialog({
                kind: "diff",
                request: { mode: "revisions", serverPath, sourceChangeset, targetChangeset },
              })
            }
          />
        )}
        {dialog?.kind === "compare" && (
          <CompareDialog
            serverPath={dialog.serverPath}
            mappings={session.mappings}
            onClose={() => setDialog(null)}
            onFileAction={handleFileAction}
          />
        )}
        {dialog?.kind === "viewFile" && (
          <FileViewDialog
            serverPath={dialog.serverPath}
            localPath={dialog.localPath}
            onClose={() => setDialog(null)}
          />
        )}
        {dialog?.kind === "diff" && (
          <DiffDialog request={dialog.request} onClose={() => setDialog(null)} />
        )}
        {dialog?.kind === "conflicts" && (
          <ConflictDialog
            serverPath={dialog.serverPath}
            onClose={() => setDialog(null)}
            onResolved={() => {
              // 冲突取舍后刷新当前目录与挂起更改。
              setDialog(null)
              setItemsRefreshToken((token) => token + 1)
              void refreshPendingChanges()
              setNotice({ kind: "info", text: "冲突处理完成，已刷新状态" })
            }}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
