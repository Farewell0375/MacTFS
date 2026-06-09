// 服务端统一响应结构，对应 MacTfsServer.ApiResult。
export interface ApiResult<T = Record<string, unknown>> {
  success: boolean
  message?: string
  errorMessage?: string
  operation?: string
  startedAt?: number
  endedAt?: number
  durationMs?: number
  logs?: string[]
  data: T
}

// API 客户端对外返回结构，统一封装网络层与业务层成功/失败。
export interface ApiResponse<T = Record<string, unknown>> {
  ok: boolean
  status: number
  result: ApiResult<T> | null
  data: T | null
  errorMessage: string | null
}

// API 请求选项。
export interface ApiRequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  signal?: AbortSignal
}
