import { HTTP_TIMEOUT_MS, TFS_API_BASE_URL, readToken } from "./config.js"
import type {
  ApiResponse,
  ApiResult,
  FileOperationResult,
  FileStatus,
  HealthData,
} from "./types.js"

/**
 * 发起一次对 Java 服务的请求，自动带 Bearer Token、统一封装结果与错误。
 * 任何网络/解析失败都收敛成 { ok:false }，绝不抛异常，保证 MCP 不被打断。
 */
async function request<T>(
  method: string,
  path: string,
  options: { query?: Record<string, string | undefined>; body?: unknown } = {},
): Promise<ApiResponse<T>> {
  const token = readToken()
  const url = new URL(path, TFS_API_BASE_URL)
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value)
      }
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    // 标记本次请求来自 MCP（AI），供后端操作日志区分「AI 操作 / 手动操作」。
    "X-MacTFS-Source": "mcp",
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const init: RequestInit = { method, headers }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json;charset=utf-8"
    init.body = JSON.stringify(options.body)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)
  init.signal = controller.signal

  let response: Response
  try {
    response = await fetch(url, init)
  } catch (error) {
    clearTimeout(timer)
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, status: 0, data: null, errorMessage: `无法连接本地服务：${message}` }
  }
  clearTimeout(timer)

  let result: ApiResult<T> | null = null
  try {
    result = (await response.json()) as ApiResult<T>
  } catch {
    result = null
  }

  const ok = response.ok && result?.success === true
  return {
    ok,
    status: response.status,
    data: result?.data ?? null,
    errorMessage: ok
      ? null
      : result?.errorMessage || result?.message || `请求失败（HTTP ${response.status}）`,
  }
}

// 统一的 Java 服务客户端，MCP 只通过本对象访问后端。
export const tfsClient = {
  /** 健康检查，返回 { connected } 等服务状态。 */
  health() {
    return request<HealthData>("GET", "/api/health")
  },
  /** 查询单个本地文件的 TFS 状态（依赖后端新增的 /api/files/status）。 */
  fileStatus(localPath: string) {
    return request<{ status: FileStatus }>("GET", "/api/files/status", { query: { localPath } })
  },
  /** 对给定路径执行签出（pendEdit），paths 可为本地绝对路径或服务端路径。 */
  checkout(paths: string[], recursive = false) {
    return request<{ result: FileOperationResult }>("POST", "/api/files/checkout", {
      body: { paths, recursive },
    })
  },
  /** 将本地新增文件加入 pending add，paths 为本地绝对路径。 */
  add(paths: string[], recursive = false) {
    return request<{ result: FileOperationResult }>("POST", "/api/files/add", {
      body: { paths, recursive },
    })
  },
  /** 获取最新（用于 getLatestIfStale 场景），serverPath 缺省按当前 Workspace 全量。 */
  getLatest(serverPath: string | undefined, recursive = false) {
    return request<{ result: unknown }>("POST", "/api/files/get-latest", {
      body: { serverPath, recursive, force: false },
    })
  },
}
