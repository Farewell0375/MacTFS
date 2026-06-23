import fs from "node:fs"
import os from "node:os"
import path from "node:path"

/** 读取整数环境变量，非法或缺省时回退默认值。 */
function intEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) {
    return fallback
  }
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) ? value : fallback
}

// MacTFS 本地 Java 服务地址，与 Electron / 前端约定一致（127.0.0.1:38765）。
export const TFS_API_BASE_URL =
  process.env.MACTFS_API_BASE_URL ?? "http://127.0.0.1:38765"

// MCP SSE 监听地址，AI 客户端通过 http://127.0.0.1:38766/sse 连接。
export const MCP_HOST = process.env.MACTFS_MCP_HOST ?? "127.0.0.1"
export const MCP_PORT = intEnv("MACTFS_MCP_PORT", 38766)

// 本地 Bearer Token 文件，与 Java 服务、Electron 复用同一份。
export const TOKEN_FILE =
  process.env.MACTFS_TOKEN_FILE ?? path.join(os.homedir(), ".mactfs", "server-token")

// 启动时等待 Java 后端就绪的最大轮询次数与间隔（毫秒）。
export const HEALTH_WAIT_TRIES = intEnv("MACTFS_MCP_HEALTH_TRIES", 60)
export const HEALTH_WAIT_INTERVAL_MS = intEnv("MACTFS_MCP_HEALTH_INTERVAL_MS", 1000)

// 父进程（Electron）pid：用于「父死则自杀」的看护，避免遗留孤儿进程。
export const PARENT_PID = (() => {
  const raw = process.env.MACTFS_PARENT_PID
  if (!raw) {
    return null
  }
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) && value > 0 ? value : null
})()

// HTTP 调用 Java 服务的默认超时（毫秒）。
export const HTTP_TIMEOUT_MS = intEnv("MACTFS_MCP_HTTP_TIMEOUT_MS", 30000)

// 是否要求 AI 客户端连接 SSE 时携带 token。
// 默认关闭：已有「仅监听 127.0.0.1 + 随客户端生命周期绑定」两道保护，AI 端无需配置 token。
// 设 MACTFS_MCP_REQUIRE_TOKEN=1 可开启更严格的本机鉴权。
export const MCP_REQUIRE_TOKEN = (process.env.MACTFS_MCP_REQUIRE_TOKEN ?? "").trim() === "1"

/**
 * 读取本地 Bearer Token，文件缺失或为空时返回 null。
 * Token 由 Java 服务在 ~/.mactfs/server-token 生成。
 */
export function readToken(): string | null {
  try {
    const value = fs.readFileSync(TOKEN_FILE, "utf8").trim()
    return value.length > 0 ? value : null
  } catch {
    return null
  }
}
