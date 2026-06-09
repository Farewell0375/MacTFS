import { getMactfsBridge } from "~/lib/electron/bridge"

import type { ApiResult } from "./types"

const API_BASE_URL = "http://127.0.0.1:38765"

interface ApiRequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: unknown
  headers?: HeadersInit
}

export type ApiRequestLogStatus = "running" | "success" | "error"

export interface ApiRequestLogEntry {
  id: string
  operation: string
  summary: string
  startedAt: number
  endedAt?: number
  durationMs?: number
  success?: boolean
  errorMessage?: string
  status: ApiRequestLogStatus
  logs?: string[]
}

type ApiRequestLogListener = (entry: ApiRequestLogEntry) => void

const apiRequestLogListeners = new Set<ApiRequestLogListener>()
let apiRequestLogIndex = 0

/**
 * 订阅统一 API client 的请求日志，供底部 Console 展示每次操作状态。
 */
export function subscribeApiRequestLogs(listener: ApiRequestLogListener) {
  apiRequestLogListeners.add(listener)

  return () => {
    apiRequestLogListeners.delete(listener)
  }
}

/**
 * 向所有日志订阅方发布一条请求状态更新。
 */
function notifyApiRequestLog(entry: ApiRequestLogEntry) {
  apiRequestLogListeners.forEach((listener) => listener(entry))
}

/**
 * 生成本次请求的前端日志 id，用于 running 和完成态更新同一行。
 */
function nextApiRequestLogId(apiPath: string) {
  apiRequestLogIndex += 1
  return `${Date.now()}:${apiRequestLogIndex}:${apiPath}`
}

/**
 * 从请求体或 query 中提取路径摘要，便于 Console 快速定位操作对象。
 */
function summarizeApiRequest(apiPath: string, body?: unknown) {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const bodySummary = summarizeRequestBody(body as Record<string, unknown>)
    if (bodySummary) {
      return bodySummary
    }
  }

  const query = apiPath.split("?")[1]
  return query || apiPath
}

/**
 * 按后端常用字段生成请求体摘要。
 */
function summarizeRequestBody(body: Record<string, unknown>) {
  return [
    "serverPath",
    "path",
    "localPath",
    "paths",
    "serverPaths",
    "changeset",
    "sourceChangeset",
    "targetChangeset",
  ]
    .filter((key) => body[key] !== undefined && body[key] !== "")
    .map((key) => `${key}=${formatSummaryValue(body[key])}`)
    .join(" | ")
}

/**
 * 将摘要字段值转换成单行文本。
 */
function formatSummaryValue(value: unknown) {
  return Array.isArray(value) ? value.join(", ") : String(value)
}

/**
 * 创建前端统一失败响应，供网络或 Electron 桥接不可用时展示明确提示。
 */
function createFailureResult<TData>(
  message: string,
  startedAt = Date.now()
): ApiResult<TData> {
  const endedAt = Date.now()

  return {
    success: false,
    message,
    errorMessage: message,
    operation: "frontendRequest",
    startedAt,
    endedAt,
    durationMs: endedAt - startedAt,
    logs: [],
    data: {} as TData,
  }
}

/**
 * 将统一 API 响应转换为底部 Console 可展示的日志行。
 */
function toApiRequestLogEntry(
  id: string,
  summary: string,
  fallbackStartedAt: number,
  result: ApiResult<unknown>
): ApiRequestLogEntry {
  return {
    id,
    operation: result.operation,
    summary,
    startedAt: result.startedAt || fallbackStartedAt,
    endedAt: result.endedAt,
    durationMs: result.durationMs,
    success: result.success,
    errorMessage: result.errorMessage || (result.success ? "" : result.message),
    status: result.success ? "success" : "error",
    logs: result.logs,
  }
}

/**
 * 通过统一 API client 调用本地 Java API，并自动附加 Bearer token。
 */
export async function apiRequest<TData>(
  apiPath: string,
  options: ApiRequestOptions = {}
): Promise<ApiResult<TData>> {
  const startedAt = Date.now()
  const logId = nextApiRequestLogId(apiPath)
  const summary = summarizeApiRequest(apiPath, options.body)

  notifyApiRequestLog({
    id: logId,
    operation: apiPath,
    summary,
    startedAt,
    status: "running",
  })

  const bridge = getMactfsBridge()
  if (!bridge) {
    const result = createFailureResult<TData>(
      "未检测到 Electron preload，无法读取本地 API token。",
      startedAt
    )
    notifyApiRequestLog(
      toApiRequestLogEntry(logId, summary, startedAt, result)
    )
    return result
  }

  const token = await bridge.getToken()
  if (!token) {
    const result = createFailureResult<TData>(
      "未找到本地 API token，请确认本地服务已启动。",
      startedAt
    )
    notifyApiRequestLog(
      toApiRequestLogEntry(logId, summary, startedAt, result)
    )
    return result
  }

  try {
    const headers = new Headers(options.headers)
    headers.set("Authorization", `Bearer ${token}`)
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json")
    }

    const response = await fetch(`${API_BASE_URL}${apiPath}`, {
      ...options,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    })

    const result = (await response.json()) as ApiResult<TData>
    notifyApiRequestLog(
      toApiRequestLogEntry(logId, summary, startedAt, result)
    )
    return result
  } catch (error) {
    const result = createFailureResult<TData>(
      error instanceof Error ? error.message : "本地 API 请求失败。",
      startedAt
    )
    notifyApiRequestLog(
      toApiRequestLogEntry(logId, summary, startedAt, result)
    )
    return result
  }
}
