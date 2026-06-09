import { getApiBaseUrl, getToken } from "~/lib/electron"
import type { ApiRequestOptions, ApiResponse, ApiResult } from "./types"

/**
 * 拼接查询参数到请求路径，自动跳过空值。
 */
function buildUrl(
  baseUrl: string,
  path: string,
  query?: ApiRequestOptions["query"],
): string {
  const url = new URL(path, baseUrl)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

/**
 * 统一提取错误信息，遵循 errorMessage || message 的展示约定。
 */
function resolveErrorMessage(
  result: ApiResult<unknown> | null,
  fallback: string,
): string {
  if (result) {
    return result.errorMessage || result.message || fallback
  }
  return fallback
}

/**
 * 发起一次本地 API 请求，自动携带 Bearer Token 并统一封装结果。
 */
async function request<T = Record<string, unknown>>(
  method: string,
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const baseUrl = await getApiBaseUrl()
  const token = await getToken()
  const headers: Record<string, string> = {
    Accept: "application/json",
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const init: RequestInit = { method, headers, signal: options.signal }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json;charset=utf-8"
    init.body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(baseUrl, path, options.query), init)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      ok: false,
      status: 0,
      result: null,
      data: null,
      errorMessage: `无法连接本地服务：${message}`,
    }
  }

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
    result,
    data: result?.data ?? null,
    errorMessage: ok
      ? null
      : resolveErrorMessage(result, `请求失败（HTTP ${response.status}）`),
  }
}

// 统一 API 客户端，组件只通过本对象访问后端，不直接 fetch、不直接读 token。
export const apiClient = {
  /**
   * 发起 GET 请求。
   */
  get<T = Record<string, unknown>>(path: string, options?: ApiRequestOptions) {
    return request<T>("GET", path, options)
  },
  /**
   * 发起 POST 请求。
   */
  post<T = Record<string, unknown>>(path: string, options?: ApiRequestOptions) {
    return request<T>("POST", path, options)
  },
  /**
   * 发起 PUT 请求。
   */
  put<T = Record<string, unknown>>(path: string, options?: ApiRequestOptions) {
    return request<T>("PUT", path, options)
  },
  /**
   * 发起 DELETE 请求。
   */
  delete<T = Record<string, unknown>>(path: string, options?: ApiRequestOptions) {
    return request<T>("DELETE", path, options)
  },
}
