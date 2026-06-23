import path from "node:path"

import { tfsClient } from "./tfs-client.js"
import type {
  FileStatus,
  PendAction,
  PendItemResult,
  PendReason,
} from "./types.js"

export interface PendOptions {
  dryRun?: boolean
  /** 本地落后于服务器时是否先自动获取最新再签出。默认 true，传 false 才退回仅警告。 */
  getLatestIfStale?: boolean
  /** 遇到服务端尚不存在的新文件时是否自动加入版本控制（add）。默认 true，传 false 才退回仅提示。 */
  autoAdd?: boolean
}

/**
 * 组装单条结果，缺省字段从已知的 FileStatus 回填。
 */
function item(
  filePath: string,
  serverPath: string | null,
  action: PendAction,
  reason: PendReason,
  message: string,
  status?: FileStatus,
): PendItemResult {
  return {
    path: filePath,
    serverPath: serverPath ?? status?.serverPath ?? null,
    action,
    reason,
    mapped: status?.mapped ?? false,
    pendingEdit: status?.pendingEdit ?? false,
    localVersion: status?.localVersion ?? 0,
    latestVersion: status?.latestVersion ?? 0,
    upToDate: status?.upToDate ?? false,
    message,
  }
}

/**
 * 连接预检：返回 null 表示后端可用，否则返回给所有路径的统一失败结果。
 */
async function connectionGuard(paths: string[]): Promise<PendItemResult[] | null> {
  const health = await tfsClient.health()
  if (health.ok) {
    return null
  }
  return paths.map((p) =>
    item(
      p,
      null,
      "error",
      "notConnected",
      `连不上本地 MacTFS 服务（${health.errorMessage ?? "服务未运行"}）。请确认 MacTFS 客户端已打开。`,
    ),
  )
}

/** 读取单个本地文件状态，失败时返回 null（调用方据此产出 error 结果）。 */
async function loadStatus(localPath: string): Promise<FileStatus | { error: string }> {
  const resp = await tfsClient.fileStatus(localPath)
  if (!resp.ok || !resp.data || !resp.data.status) {
    return { error: resp.errorMessage ?? "未知错误" }
  }
  return resp.data.status
}

/**
 * 真正执行签出（pendEdit）。checkoutArg 可为本地绝对路径或服务端路径。
 */
async function doCheckout(
  checkoutArg: string,
  serverPath: string | null,
  status?: FileStatus,
): Promise<PendItemResult> {
  const resp = await tfsClient.checkout([checkoutArg], false)
  if (!resp.ok || !resp.data) {
    return item(checkoutArg, serverPath, "error", "error", `签出失败：${resp.errorMessage ?? "未知错误"}`, status)
  }
  const result = resp.data.result
  if (result.failures && result.failures.length > 0) {
    return item(checkoutArg, serverPath, "error", "error", `签出未成功：${result.failures.join("；")}`, status)
  }
  return item(checkoutArg, serverPath, "checkedOut", "ok", `已签出（影响 ${result.affected} 项），可以开始修改。`, status)
}

/**
 * 真正执行加入版本控制（pendAdd），只接受本地路径。
 */
async function doAdd(localPath: string, status: FileStatus): Promise<PendItemResult> {
  const resp = await tfsClient.add([localPath], false)
  if (!resp.ok || !resp.data) {
    return item(localPath, status.serverPath, "error", "error", `加入版本控制失败：${resp.errorMessage ?? "未知错误"}`, status)
  }
  const result = resp.data.result
  if (result.failures && result.failures.length > 0) {
    return item(localPath, status.serverPath, "error", "error", `加入未成功：${result.failures.join("；")}`, status)
  }
  return item(localPath, status.serverPath, "added", "ok", `已加入版本控制（影响 ${result.affected} 项），签入后服务器生效。`, status)
}

/**
 * 对单个路径跑「签出」校验流水线：
 * 映射 → 已签出 → 新文件 → 未下载 → 是否落后 → 真正签出。
 */
async function checkoutOne(raw: string, options: PendOptions): Promise<PendItemResult> {
  if (raw.startsWith("$/")) {
    if (options.dryRun) {
      return item(raw, raw, "skipped", "ok", "服务端路径，dryRun 跳过实际签出。")
    }
    return doCheckout(raw, raw)
  }

  const localPath = path.resolve(raw)
  const status = await loadStatus(localPath)
  if ("error" in status) {
    return item(localPath, null, "error", "error", `查询文件状态失败：${status.error}`)
  }

  if (!status.mapped) {
    return item(localPath, status.serverPath, "skipped", "notMapped", "该文件不在任何 TFS 映射目录下，无需签出。", status)
  }
  if (status.pendingEdit) {
    return item(localPath, status.serverPath, "alreadyCheckedOut", "ok", "文件已处于签出状态，可直接修改。", status)
  }
  if (!status.serverExists) {
    if (options.autoAdd === false) {
      return item(localPath, status.serverPath, "skipped", "newFileNeedsAdd", "这是服务端尚不存在的新文件，请改用 tfs_add 加入版本控制。", status)
    }
    if (!status.exists) {
      return item(localPath, status.serverPath, "skipped", "notExist", "这是新文件但本地不存在；请先创建文件再加入版本控制。", status)
    }
    if (status.pendingChangeType === "pendingAdd") {
      return item(localPath, status.serverPath, "alreadyAdded", "ok", "文件已挂起新增，无需重复加入。", status)
    }
    if (options.dryRun) {
      return item(localPath, status.serverPath, "skipped", "ok", "校验通过：这是新文件，将自动加入版本控制（dryRun 未真正执行）。", status)
    }
    return doAdd(localPath, status)
  }
  if (!status.exists || status.status === "notDownloaded") {
    return item(localPath, status.serverPath, "skipped", "notDownloaded", "本地尚未下载该文件，请先获取最新。", status)
  }

  const stale = !status.upToDate || status.status === "remoteChanged" || status.status === "bothChanged"
  const autoGetLatest = options.getLatestIfStale !== false
  if (stale && !autoGetLatest) {
    return item(
      localPath,
      status.serverPath,
      "skipped",
      "stale",
      `本地版本(${status.localVersion})落后于服务器最新(${status.latestVersion})。已按 getLatestIfStale=false 跳过；若要在旧版本上修改请自行处理。`,
      status,
    )
  }
  if (stale) {
    if (options.dryRun) {
      return item(
        localPath,
        status.serverPath,
        "skipped",
        "ok",
        `校验通过：本地落后(${status.localVersion}→${status.latestVersion})，将先自动获取最新再签出（dryRun 未真正执行）。`,
        status,
      )
    }
    const gl = await tfsClient.getLatest(status.serverPath ?? undefined, false)
    if (!gl.ok) {
      return item(localPath, status.serverPath, "error", "stale", `自动获取最新失败：${gl.errorMessage ?? "未知错误"}`, status)
    }
  }

  if (options.dryRun) {
    return item(localPath, status.serverPath, "skipped", "ok", "校验通过：可签出（dryRun 未真正执行）。", status)
  }
  return doCheckout(localPath, status.serverPath, status)
}

/**
 * 对单个路径跑「加入版本控制」校验流水线：
 * 映射 → 本地存在 → 已加入 → 是否已受控(应改签出) → 真正 add。
 */
async function addOne(raw: string, options: PendOptions): Promise<PendItemResult> {
  const localPath = path.resolve(raw)
  const status = await loadStatus(localPath)
  if ("error" in status) {
    return item(localPath, null, "error", "error", `查询文件状态失败：${status.error}`)
  }

  if (!status.mapped) {
    return item(localPath, status.serverPath, "skipped", "notMapped", "该文件不在任何 TFS 映射目录下，无法加入版本控制。", status)
  }
  if (!status.exists) {
    return item(localPath, status.serverPath, "skipped", "notExist", "本地文件不存在；请先创建文件再加入版本控制。", status)
  }
  if (status.pendingChangeType === "pendingAdd") {
    return item(localPath, status.serverPath, "alreadyAdded", "ok", "文件已挂起新增，无需重复加入。", status)
  }
  if (status.serverExists) {
    return item(localPath, status.serverPath, "skipped", "alreadyTracked", "该文件已在版本控制中；若要修改请用 tfs_checkout 签出，而非加入。", status)
  }

  if (options.dryRun) {
    return item(localPath, status.serverPath, "skipped", "ok", "校验通过：可加入版本控制（dryRun 未真正执行）。", status)
  }
  return doAdd(localPath, status)
}

/**
 * tfs_checkout 主流程。
 */
export async function runCheckout(rawPaths: string[], options: PendOptions): Promise<PendItemResult[]> {
  const paths = rawPaths.map((p) => p.trim()).filter((p) => p.length > 0)
  if (paths.length === 0) {
    return []
  }
  const guard = await connectionGuard(paths)
  if (guard) {
    return guard
  }
  const results: PendItemResult[] = []
  for (const raw of paths) {
    results.push(await checkoutOne(raw, options))
  }
  return results
}

/**
 * tfs_add 主流程。
 */
export async function runAdd(rawPaths: string[], options: PendOptions): Promise<PendItemResult[]> {
  const paths = rawPaths.map((p) => p.trim()).filter((p) => p.length > 0)
  if (paths.length === 0) {
    return []
  }
  const guard = await connectionGuard(paths)
  if (guard) {
    return guard
  }
  const results: PendItemResult[] = []
  for (const raw of paths) {
    results.push(await addOne(raw, options))
  }
  return results
}

const ACTION_TAGS: Record<PendAction, string> = {
  checkedOut: "✓ 已签出",
  alreadyCheckedOut: "✓ 已签出(无需重复)",
  added: "✓ 已加入",
  alreadyAdded: "✓ 已加入(无需重复)",
  skipped: "• 跳过",
  error: "✗ 失败",
}

/**
 * 把结构化结果汇总成一段人话 summary，方便 AI 与人快速读懂。
 */
export function summarize(results: PendItemResult[]): string {
  if (results.length === 0) {
    return "未提供任何文件路径。"
  }
  return results.map((r) => `${ACTION_TAGS[r.action]}　${r.path}　— ${r.message}`).join("\n")
}
