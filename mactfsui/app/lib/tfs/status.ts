// 状态文案与表现的统一收口：目录对比、挂起更改、文件列表均从这里取文案与配色。

// 业务状态对应的中文文案。
export const STATUS_LABELS: Record<string, string> = {
  localModified: "本地已修改",
  remoteChanged: "服务器已更新",
  bothChanged: "两端都有修改",
  localOnly: "仅本地存在",
  remoteOnly: "仅服务器存在",
  notDownloaded: "未下载",
  localDeleted: "本地已删除",
  pendingEdit: "签出编辑",
  pendingAdd: "挂起新增",
  pendingDelete: "挂起删除",
  pendingRename: "挂起重命名",
  pending: "挂起更改",
  upToDate: "最新",
  notMapped: "未映射",
  mapped: "已映射",
}

// 业务状态对应的 badge 配色（Tailwind class），按 Agents.md 状态色规则。
export const STATUS_BADGE_CLASSES: Record<string, string> = {
  localModified: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  remoteChanged: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  bothChanged: "bg-red-500/15 text-red-700 dark:text-red-400",
  localOnly: "bg-green-500/10 text-green-700 dark:text-green-400",
  remoteOnly: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  notDownloaded: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  localDeleted: "bg-red-500/10 text-red-700 dark:text-red-400",
  pendingEdit: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  pendingAdd: "bg-green-500/10 text-green-700 dark:text-green-400",
  pendingDelete: "bg-red-500/10 text-red-700 dark:text-red-400",
  pendingRename: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  pending: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  upToDate: "bg-muted text-muted-foreground",
  notMapped: "bg-muted text-muted-foreground",
  mapped: "bg-muted text-foreground/80",
}

/**
 * 取状态的中文文案，未知状态原样返回。
 */
export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

/**
 * 取状态 badge 的配色 class，未知状态用中性灰。
 */
export function statusBadgeClass(status: string): string {
  return STATUS_BADGE_CLASSES[status] ?? "bg-muted text-muted-foreground"
}

// 文件列表项的本地映射状态：未映射 / 已映射 / 已映射未下载。
export type ItemLocalState = "notMapped" | "mapped" | "notDownloaded"

/**
 * 依据 Mapping 命中与本地文件存在性推导列表项的本地状态。
 * localExists 为 null 表示无法检测（非 Electron 环境），按已映射处理。
 */
export function resolveItemLocalState(
  mapped: boolean,
  localExists: boolean | null,
): ItemLocalState {
  if (!mapped) {
    return "notMapped"
  }
  if (localExists === false) {
    return "notDownloaded"
  }
  return "mapped"
}
