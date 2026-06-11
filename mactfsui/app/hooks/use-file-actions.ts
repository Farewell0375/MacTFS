import { useCallback, useState } from "react"

import type { DiffRequest } from "~/components/explorer/diff-dialog"
import { api } from "~/lib/api"
import type { MappingInfo } from "~/lib/api"
import type { FileActionId, FileTarget } from "~/lib/tfs"

// 当前打开的业务弹窗：Mapping / History / 目录对比 / 文件查看 / Diff / 冲突处理 / 覆盖类确认 / 属性 / 获取特定版本。
export type WorkspaceDialogState =
  | { kind: "mapping"; serverPath: string }
  | { kind: "history"; serverPath: string; folder: boolean }
  | { kind: "compare"; serverPath: string }
  | { kind: "viewFile"; serverPath: string; localPath: string | null; changeset?: number }
  | { kind: "diff"; request: DiffRequest }
  | { kind: "conflicts"; serverPath: string }
  | { kind: "confirmForceGet"; serverPath: string; folder: boolean }
  | { kind: "properties"; target: FileTarget }
  | { kind: "getVersion"; serverPath: string; folder: boolean }
  | { kind: "rename"; serverPath: string; folder: boolean }
  | { kind: "branch"; serverPath: string }
  | { kind: "merge"; serverPath: string }
  | null

// 顶部细条通知：信息（操作摘要）或错误。
export interface ActionNotice {
  kind: "info" | "error"
  text: string
}

// 动作编排所需的上层依赖：mappings 更新与各类刷新入口。
interface FileActionsDeps {
  onMappingsChanged: (mappings: MappingInfo[]) => void
  refreshPendingChanges: () => Promise<void>
  refreshItems: () => void
  refreshLogs: () => void
}

/**
 * 对象动作编排 hook：集中持有弹窗开关、通知与忙碌状态，
 * 把右键菜单动作映射为 API 执行或弹窗打开，并按统一规则刷新（含操作日志）。
 */
export function useFileActions({
  onMappingsChanged,
  refreshPendingChanges,
  refreshItems,
  refreshLogs,
}: FileActionsDeps) {
  const [dialog, setDialog] = useState<WorkspaceDialogState>(null)
  const [notice, setNotice] = useState<ActionNotice | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [checkinBusy, setCheckinBusy] = useState(false)

  /**
   * 执行 Get Latest（目录递归），返回是否产生冲突；摘要写入顶部通知。
   * 默认安全模式：本地改动不会被覆盖而是产生冲突并自动进入冲突弹窗；
   * force=true 为强制覆盖本地（仅经确认弹窗触发）。
   */
  const runGetLatest = useCallback(
    async (target: FileTarget, force = false): Promise<boolean> => {
      const result = await api.getLatest({
        serverPath: target.serverPath,
        recursive: target.folder,
        force,
      })
      refreshLogs()
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
        text: `${force ? "强制获取" : "获取最新"}完成：${parts.join("，")}`,
      })
      refreshItems()
      if (summary.conflicts > 0) {
        setDialog({ kind: "conflicts", serverPath: target.serverPath })
        return true
      }
      return false
    },
    [refreshItems, refreshLogs],
  )

  /**
   * 获取指定 changeset 版本（覆盖本地），由历史弹窗中的确认操作触发。
   */
  const runGetVersion = useCallback(
    async (serverPath: string, changeset: number, folder: boolean): Promise<boolean> => {
      setNotice({ kind: "info", text: `正在获取版本 C${changeset}…` })
      const result = await api.getVersion({ serverPath, changeset, recursive: folder })
      refreshLogs()
      if (!result.ok || !result.data) {
        setNotice({ kind: "error", text: result.errorMessage ?? "获取指定版本失败" })
        return false
      }
      const summary = result.data.result
      setNotice({
        kind: "info",
        text: `已获取版本 C${changeset}：更新 ${summary.updated} 项（本地已被该版本覆盖）`,
      })
      refreshItems()
      await refreshPendingChanges()
      return true
    },
    [refreshItems, refreshLogs, refreshPendingChanges],
  )

  /**
   * 执行变更集回滚（产生挂起更改，不直接入库），由历史弹窗中的确认操作触发；
   * 出现冲突时进入统一冲突弹窗，完成后刷新挂起更改与目录列表。
   */
  const runRollback = useCallback(
    async (
      serverPath: string,
      mode: "single" | "toVersion",
      changeset: number,
    ): Promise<boolean> => {
      setNotice({
        kind: "info",
        text: mode === "single" ? `正在回滚变更集 C${changeset}…` : `正在回滚到 C${changeset}…`,
      })
      const result = await api.rollback({ serverPath, mode, changeset })
      refreshLogs()
      if (!result.ok || !result.data) {
        setNotice({ kind: "error", text: result.errorMessage ?? "回滚失败" })
        return false
      }
      const summary = result.data.result
      const parts = [`产生挂起更改 ${summary.operations} 项`]
      if (summary.conflicts > 0) {
        parts.push(`冲突 ${summary.conflicts} 项`)
      }
      if (summary.failures > 0) {
        parts.push(`失败 ${summary.failures} 项`)
      }
      setNotice({
        kind: summary.conflicts > 0 || summary.failures > 0 ? "error" : "info",
        text: `回滚完成：${parts.join("，")}，请在挂起更改面板审查后签入`,
      })
      await refreshPendingChanges()
      refreshItems()
      if (summary.conflicts > 0) {
        setDialog({ kind: "conflicts", serverPath })
      }
      return true
    },
    [refreshItems, refreshLogs, refreshPendingChanges],
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
      refreshLogs()
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
    [runGetLatest, refreshPendingChanges, refreshLogs],
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
      refreshLogs()
      if (!result.ok || !result.data) {
        setNotice({ kind: "error", text: result.errorMessage ?? labels.fail })
        return
      }
      setNotice({ kind: "info", text: `${labels.done} ${result.data.result.affected} 项` })
      await refreshPendingChanges()
      refreshItems()
    },
    [refreshPendingChanges, refreshItems, refreshLogs],
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
          refreshLogs()
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
        case "forceGetLatest":
          // 覆盖类危险操作：先弹确认，确认后才执行。
          setDialog({
            kind: "confirmForceGet",
            serverPath: target.serverPath,
            folder: target.folder,
          })
          break
        case "getSpecificVersion":
          // 覆盖类危险操作：弹窗内选择 changeset 并确认后执行。
          setDialog({
            kind: "getVersion",
            serverPath: target.serverPath,
            folder: target.folder,
          })
          break
        case "properties":
          setDialog({ kind: "properties", target })
          break
        case "rename":
          setDialog({ kind: "rename", serverPath: target.serverPath, folder: target.folder })
          break
        case "branch":
          setDialog({ kind: "branch", serverPath: target.serverPath })
          break
        case "merge":
          setDialog({ kind: "merge", serverPath: target.serverPath })
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
        case "add": {
          // pend add 需要本地路径（localOnly 项服务端尚不存在）。
          if (!target.localPath) {
            return
          }
          setActionBusy(true)
          setNotice({ kind: "info", text: "正在加入版本控制…" })
          const result = await api.addFiles({ paths: [target.localPath], recursive: target.folder })
          refreshLogs()
          setActionBusy(false)
          if (!result.ok || !result.data) {
            setNotice({ kind: "error", text: result.errorMessage ?? "加入版本控制失败" })
            return
          }
          setNotice({ kind: "info", text: `已加入版本控制 ${result.data.result.affected} 项` })
          await refreshPendingChanges()
          refreshItems()
          break
        }
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
    [onMappingsChanged, runGetLatest, runCheckout, runFileOperation, refreshLogs],
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
      refreshLogs()
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
    [refreshPendingChanges, refreshItems, refreshLogs],
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
    refreshLogs()
    setNotice({ kind: "info", text: "冲突处理完成，已刷新状态" })
  }, [refreshItems, refreshPendingChanges, refreshLogs])

  /**
   * 重命名确认后执行：产生 rename 挂起更改并刷新目录列表与挂起更改。
   */
  const handleRenameConfirmed = useCallback(
    async (serverPath: string, newName: string): Promise<boolean> => {
      setNotice({ kind: "info", text: "正在重命名…" })
      const result = await api.renameFile({ serverPath, newName })
      refreshLogs()
      if (!result.ok || !result.data) {
        setNotice({ kind: "error", text: result.errorMessage ?? "重命名失败" })
        return false
      }
      setNotice({
        kind: "info",
        text: `已挂起重命名为「${newName}」，签入后服务器生效`,
      })
      await refreshPendingChanges()
      refreshItems()
      return true
    },
    [refreshItems, refreshLogs, refreshPendingChanges],
  )

  /**
   * 分支确认后执行：产生 branch 挂起更改并刷新挂起更改与目录列表。
   */
  const handleBranchConfirmed = useCallback(
    async (
      sourceServerPath: string,
      targetServerPath: string,
      changeset: number | undefined,
    ): Promise<boolean> => {
      setNotice({ kind: "info", text: "正在创建分支…" })
      const result = await api.branch({ sourceServerPath, targetServerPath, changeset })
      refreshLogs()
      if (!result.ok || !result.data) {
        setNotice({ kind: "error", text: result.errorMessage ?? "创建分支失败" })
        return false
      }
      setNotice({
        kind: "info",
        text: `已挂起分支 ${result.data.result.affected} 项（${targetServerPath}），请在挂起更改面板审查后签入`,
      })
      await refreshPendingChanges()
      refreshItems()
      return true
    },
    [refreshItems, refreshLogs, refreshPendingChanges],
  )

  /**
   * 合并确认后执行：产生挂起更改并刷新，冲突自动进入冲突弹窗（针对目标路径）。
   */
  const handleMergeConfirmed = useCallback(
    async (
      sourceServerPath: string,
      targetServerPath: string,
      changeset: number | undefined,
    ): Promise<boolean> => {
      setNotice({
        kind: "info",
        text: changeset == null ? "正在合并全部候选变更集…" : `正在合并变更集 C${changeset}…`,
      })
      const result = await api.merge({ sourceServerPath, targetServerPath, changeset })
      refreshLogs()
      if (!result.ok || !result.data) {
        setNotice({ kind: "error", text: result.errorMessage ?? "合并失败" })
        return false
      }
      const summary = result.data.result
      const parts = [`产生挂起更改 ${summary.operations} 项`]
      if (summary.conflicts > 0) {
        parts.push(`冲突 ${summary.conflicts} 项`)
      }
      if (summary.failures > 0) {
        parts.push(`失败 ${summary.failures} 项`)
      }
      setNotice({
        kind: summary.conflicts > 0 || summary.failures > 0 ? "error" : "info",
        text: `合并完成：${parts.join("，")}，请在挂起更改面板审查后签入`,
      })
      await refreshPendingChanges()
      refreshItems()
      if (summary.conflicts > 0) {
        setDialog({ kind: "conflicts", serverPath: targetServerPath })
      }
      return true
    },
    [refreshItems, refreshLogs, refreshPendingChanges],
  )

  /**
   * 强制获取确认后执行：覆盖本地并关闭确认弹窗。
   */
  const handleForceGetConfirmed = useCallback(
    async (serverPath: string, folder: boolean) => {
      setActionBusy(true)
      const target: FileTarget = {
        source: "list",
        folder,
        serverPath,
        localPath: null,
        mapped: true,
        mappingRoot: false,
        pendingStatus: null,
      }
      await runGetLatest(target, true)
      setActionBusy(false)
      setDialog(null)
    },
    [runGetLatest],
  )

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
    handleForceGetConfirmed,
    handleRenameConfirmed,
    handleBranchConfirmed,
    handleMergeConfirmed,
    runGetVersion,
    runRollback,
  }
}
