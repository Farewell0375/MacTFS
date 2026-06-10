import { useCallback, useState } from "react"

import type { DiffRequest } from "~/components/explorer/diff-dialog"
import { api } from "~/lib/api"
import type { MappingInfo } from "~/lib/api"
import type { FileActionId, FileTarget } from "~/lib/tfs"

// 当前打开的业务弹窗：Mapping / History / 目录对比 / 文件查看 / Diff / 冲突处理。
export type WorkspaceDialogState =
  | { kind: "mapping"; serverPath: string }
  | { kind: "history"; serverPath: string; folder: boolean }
  | { kind: "compare"; serverPath: string }
  | { kind: "viewFile"; serverPath: string; localPath: string | null }
  | { kind: "diff"; request: DiffRequest }
  | { kind: "conflicts"; serverPath: string }
  | null

// 顶部细条通知：信息（操作摘要）或错误。
export interface ActionNotice {
  kind: "info" | "error"
  text: string
}

// 动作编排所需的上层依赖：mappings 更新与两类刷新入口。
interface FileActionsDeps {
  onMappingsChanged: (mappings: MappingInfo[]) => void
  refreshPendingChanges: () => Promise<void>
  refreshItems: () => void
}

/**
 * 对象动作编排 hook：集中持有弹窗开关、通知与忙碌状态，
 * 把右键菜单动作映射为 API 执行或弹窗打开，并按统一规则刷新。
 */
export function useFileActions({
  onMappingsChanged,
  refreshPendingChanges,
  refreshItems,
}: FileActionsDeps) {
  const [dialog, setDialog] = useState<WorkspaceDialogState>(null)
  const [notice, setNotice] = useState<ActionNotice | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [checkinBusy, setCheckinBusy] = useState(false)

  /**
   * 执行 Get Latest（目录递归），返回是否产生冲突；摘要写入顶部通知。
   */
  const runGetLatest = useCallback(
    async (target: FileTarget): Promise<boolean> => {
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
      setNotice({
        kind: summary.conflicts > 0 ? "error" : "info",
        text: `获取最新完成：${parts.join("，")}`,
      })
      refreshItems()
      if (summary.conflicts > 0) {
        setDialog({ kind: "conflicts", serverPath: target.serverPath })
        return true
      }
      return false
    },
    [refreshItems],
  )

  /**
   * 执行 Checkout：先 Get Latest，出现冲突时进入统一冲突弹窗；
   * 无冲突则签出并提示跳过 / 失败项，完成后刷新挂起更改。
   */
  const runCheckout = useCallback(
    async (target: FileTarget) => {
      const hadConflicts = await runGetLatest(target)
      if (hadConflicts) {
        setNotice({ kind: "error", text: "获取最新存在冲突，请先处理冲突后再签出" })
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
        summary.failures.length > 0
          ? `，跳过 ${summary.failures.length} 项（${summary.failures.slice(0, 3).join("；")}${summary.failures.length > 3 ? "…" : ""}）`
          : ""
      setNotice({
        kind: summary.failures.length > 0 ? "error" : "info",
        text: `签出完成：${summary.affected} 项${failureText}`,
      })
      await refreshPendingChanges()
    },
    [runGetLatest, refreshPendingChanges],
  )

  /**
   * 执行 挂起删除 / 撤销更改 两类文件操作并按规则刷新。
   */
  const runFileOperation = useCallback(
    async (target: FileTarget, action: "delete" | "undo") => {
      const labels =
        action === "delete"
          ? { doing: "正在挂起删除…", fail: "挂起删除失败", done: "已挂起删除" }
          : { doing: "正在撤销更改…", fail: "撤销更改失败", done: "已撤销" }
      setNotice({ kind: "info", text: labels.doing })
      const call = action === "delete" ? api.deleteFiles : api.undoFiles
      const result = await call({ paths: [target.serverPath], recursive: target.folder })
      if (!result.ok || !result.data) {
        setNotice({ kind: "error", text: result.errorMessage ?? labels.fail })
        return
      }
      setNotice({ kind: "info", text: `${labels.done} ${result.data.result.affected} 项` })
      await refreshPendingChanges()
      refreshItems()
    },
    [refreshPendingChanges, refreshItems],
  )

  /**
   * 对象右键菜单动作统一分发器。
   * unmap / getLatest / checkout / delete / undo 直接执行；
   * map / history / compare / viewFile / diff 打开对应弹窗。
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
        case "delete":
        case "undo":
          setActionBusy(true)
          await runFileOperation(target, action)
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
          break
      }
    },
    [onMappingsChanged, runGetLatest, runCheckout, runFileOperation],
  )

  /**
   * 提交签入：只提交 Included 项，成功后展示 changeset 并刷新挂起更改与当前目录。
   */
  const handleCheckin = useCallback(
    async (paths: string[], comment: string): Promise<boolean> => {
      setCheckinBusy(true)
      setNotice({ kind: "info", text: "正在签入…" })
      const result = await api.checkin({ paths, comment })
      setCheckinBusy(false)
      if (!result.ok || !result.data) {
        setNotice({ kind: "error", text: result.errorMessage ?? "签入失败" })
        return false
      }
      const summary = result.data.checkin
      setNotice({
        kind: "info",
        text: `签入成功：changeset ${summary.changeset}，提交 ${summary.submittedChanges} 项`,
      })
      await refreshPendingChanges()
      refreshItems()
      return true
    },
    [refreshPendingChanges, refreshItems],
  )

  /**
   * Mapping 创建成功：刷新 mappings 与当前目录列表，保持浏览位置并关闭弹窗。
   */
  const handleMappingCreated = useCallback(
    (mappings: MappingInfo[]) => {
      onMappingsChanged(mappings)
      refreshItems()
      setDialog(null)
    },
    [onMappingsChanged, refreshItems],
  )

  /**
   * 冲突取舍完成：关闭弹窗并刷新当前目录与挂起更改。
   */
  const handleConflictsResolved = useCallback(() => {
    setDialog(null)
    refreshItems()
    void refreshPendingChanges()
    setNotice({ kind: "info", text: "冲突处理完成，已刷新状态" })
  }, [refreshItems, refreshPendingChanges])

  return {
    dialog,
    setDialog,
    notice,
    actionBusy,
    checkinBusy,
    handleFileAction,
    handleCheckin,
    handleMappingCreated,
    handleConflictsResolved,
  }
}
