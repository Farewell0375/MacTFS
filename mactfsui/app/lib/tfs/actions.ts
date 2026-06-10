// 对象动作统一模型：左侧树、中间列表、Pending Changes、目录对比结果
// 都转换成 FileTarget，再由 buildFileMenu 按状态生成同一套菜单与置灰规则。

import type { MappingInfo } from "~/lib/api"

import { resolveLocalPath } from "./mapping"
import { normalizeServerPath } from "./path"

// 对象来源：决定菜单里展示哪一组动作。
export type FileTargetSource = "tree" | "list" | "pending" | "compare"

// 统一的对象目标描述。
export interface FileTarget {
  source: FileTargetSource
  folder: boolean
  serverPath: string
  /** 依据 Mapping 推导出的本地路径，未映射为 null。 */
  localPath: string | null
  /** 是否处于某条 Mapping 子树内。 */
  mapped: boolean
  /** serverPath 本身是否就是一条 Mapping 的根。 */
  mappingRoot: boolean
  /** 挂起更改状态（pendingEdit / pendingAdd / ...），无挂起为 null。 */
  pendingStatus: string | null
}

// 全部对象动作。
export type FileActionId =
  | "map"
  | "unmap"
  | "getLatest"
  | "checkout"
  | "delete"
  | "undo"
  | "compare"
  | "history"
  | "viewFile"
  | "diffLocalLatest"

// 单个菜单项：是否可用与置灰原因。
export interface FileMenuItem {
  id: FileActionId
  label: string
  enabled: boolean
  danger?: boolean
  /** 置灰原因，展示为菜单项后缀说明。 */
  reason?: string
}

/**
 * 由来源数据构造统一 FileTarget，本地路径与映射状态从 mappings 推导。
 */
export function makeFileTarget(input: {
  source: FileTargetSource
  folder: boolean
  serverPath: string
  mappings: MappingInfo[]
  pendingStatus?: string | null
}): FileTarget {
  const serverPath = normalizeServerPath(input.serverPath)
  const localPath = resolveLocalPath(input.mappings, serverPath)
  const mappingRoot = input.mappings.some(
    (mapping) => normalizeServerPath(mapping.serverPath) === serverPath,
  )
  return {
    source: input.source,
    folder: input.folder,
    serverPath,
    localPath,
    mapped: localPath != null,
    mappingRoot,
    pendingStatus: input.pendingStatus ?? null,
  }
}

const NOT_MAPPED_REASON = "未映射到本地"

/**
 * 按对象状态生成右键菜单分组：同一路径在树和列表中产出完全一致的动作与置灰规则。
 * Checkin、全局设置等不进入对象菜单。
 */
export function buildFileMenu(target: FileTarget): FileMenuItem[][] {
  return target.folder ? buildFolderMenu(target) : buildFileItemMenu(target)
}

/**
 * 目录菜单：本地工作区动作（未映射置灰）+ Mapping 动作 + 服务端动作。
 */
function buildFolderMenu(target: FileTarget): FileMenuItem[][] {
  const sections: FileMenuItem[][] = []

  const workspaceActions: FileMenuItem[] = [
    {
      id: "getLatest",
      label: "获取最新",
      enabled: target.mapped,
      reason: target.mapped ? undefined : NOT_MAPPED_REASON,
    },
    {
      id: "checkout",
      label: "签出编辑",
      enabled: target.mapped,
      reason: target.mapped ? undefined : NOT_MAPPED_REASON,
    },
    {
      id: "delete",
      label: "挂起删除",
      enabled: target.mapped,
      danger: true,
      reason: target.mapped ? undefined : NOT_MAPPED_REASON,
    },
    {
      id: "undo",
      label: "撤销更改",
      enabled: target.mapped,
      reason: target.mapped ? undefined : NOT_MAPPED_REASON,
    },
  ]
  sections.push(workspaceActions)

  const mappingActions: FileMenuItem[] = []
  if (!target.mapped) {
    mappingActions.push({ id: "map", label: "映射到本地", enabled: true })
  }
  if (target.mappingRoot) {
    mappingActions.push({ id: "unmap", label: "取消映射", enabled: true, danger: true })
  }
  if (mappingActions.length > 0) {
    sections.push(mappingActions)
  }

  sections.push([
    {
      id: "compare",
      label: "目录对比",
      enabled: target.mapped,
      reason: target.mapped ? undefined : NOT_MAPPED_REASON,
    },
    { id: "history", label: "查看历史", enabled: true },
  ])

  return sections
}

/**
 * 文件菜单：查看 / 比较 / 历史 + 本地工作区动作，按挂起状态控制可用性。
 * pendingAdd 文件不展示服务器比较与历史入口；pendingEdit 禁止直接 Get Latest 覆盖。
 */
function buildFileItemMenu(target: FileTarget): FileMenuItem[][] {
  const sections: FileMenuItem[][] = []
  const pending = target.pendingStatus
  const isPendingAdd = pending === "pendingAdd"

  const viewActions: FileMenuItem[] = [
    { id: "viewFile", label: "查看文件", enabled: true },
  ]
  if (!isPendingAdd) {
    viewActions.push({
      id: "diffLocalLatest",
      label: "与最新版本比较",
      enabled: target.mapped,
      reason: target.mapped ? undefined : NOT_MAPPED_REASON,
    })
    viewActions.push({ id: "history", label: "查看历史", enabled: true })
  }
  sections.push(viewActions)

  // Pending Changes 列表项以撤销为主，不再重复签出 / 删除入口。
  if (target.source === "pending") {
    sections.push([
      { id: "undo", label: "撤销更改", enabled: true, danger: true },
    ])
    return sections
  }

  const workspaceActions: FileMenuItem[] = [
    {
      id: "getLatest",
      label: "获取最新",
      enabled: target.mapped && pending == null,
      reason: !target.mapped
        ? NOT_MAPPED_REASON
        : pending != null
          ? "存在挂起更改，先撤销或签入"
          : undefined,
    },
    {
      id: "checkout",
      label: "签出编辑",
      enabled: target.mapped && pending == null,
      reason: !target.mapped
        ? NOT_MAPPED_REASON
        : pending === "pendingEdit"
          ? "已签出"
          : pending != null
            ? "存在挂起更改"
            : undefined,
    },
    {
      id: "delete",
      label: "挂起删除",
      enabled: target.mapped && pending !== "pendingDelete",
      danger: true,
      reason: !target.mapped
        ? NOT_MAPPED_REASON
        : pending === "pendingDelete"
          ? "已挂起删除"
          : undefined,
    },
    {
      id: "undo",
      label: "撤销更改",
      enabled: pending != null,
      reason: pending == null ? "没有挂起更改" : undefined,
    },
  ]
  sections.push(workspaceActions)

  return sections
}
