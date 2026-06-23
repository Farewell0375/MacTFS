import express from "express"
import type { Request } from "express"
import { z } from "zod"

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import {
  HEALTH_WAIT_INTERVAL_MS,
  HEALTH_WAIT_TRIES,
  MCP_HOST,
  MCP_PORT,
  MCP_REQUIRE_TOKEN,
  PARENT_PID,
  readToken,
} from "./config.js"
import { runAdd, runCheckout, summarize } from "./checkout.js"
import { tfsClient } from "./tfs-client.js"

const SERVER_NAME = "mactfs-mcp"
const SERVER_VERSION = "0.1.0"

/** 简单延时。 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** stderr 日志，SSE 走 HTTP，stdout 可用但统一打 stderr 更安全。 */
function log(message: string): void {
  process.stderr.write(`[mactfs-mcp] ${message}\n`)
}

/**
 * 校验请求是否允许连接。
 * 默认不强制 token（已有 127.0.0.1 + 客户端绑定两道保护）；
 * 仅当 MACTFS_MCP_REQUIRE_TOKEN=1 时，才要求 Authorization: Bearer 或 ?token=。
 */
function authorized(req: Request): boolean {
  if (!MCP_REQUIRE_TOKEN) {
    return true
  }
  const expected = readToken()
  if (!expected) {
    return true
  }
  const auth = req.headers["authorization"]
  if (typeof auth === "string" && auth.startsWith("Bearer ") && auth.slice(7).trim() === expected) {
    return true
  }
  const queryToken = req.query.token
  if (typeof queryToken === "string" && queryToken === expected) {
    return true
  }
  return false
}

/**
 * 创建一个 MCP server 实例并注册工具。每个 SSE 连接用独立实例，避免跨连接状态串扰。
 */
function createMcpServer(): McpServer {
  const mcp = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION })

  mcp.registerTool(
    "tfs_checkout",
    {
      title: "TFS 签出文件",
      description:
        "在修改受 TFS 版本控制的文件之前调用本工具签出（checkout / pendEdit）。" +
        "会先做执行前校验：是否在映射目录内、是否已签出、是否为新文件、本地是否落后于服务器最新版本。" +
        "凡是即将编辑、且位于 MacTFS 映射目录下的已有文件，都应先调用本工具。" +
        "默认行为：遇到服务端尚不存在的新文件会自动加入版本控制（add）；本地版本落后时会自动先获取最新再签出。" +
        "返回每个文件的处理结果（checkedOut / alreadyCheckedOut / added / alreadyAdded / skipped / error）。",
      inputSchema: {
        paths: z
          .array(z.string())
          .min(1)
          .describe("要签出的文件本地绝对路径列表（也兼容 $/ 开头的服务端路径）"),
        dryRun: z
          .boolean()
          .optional()
          .describe("只做执行前校验、不真正签出/加入/获取最新，用于预检"),
        getLatestIfStale: z
          .boolean()
          .optional()
          .describe("当本地版本落后于服务器时，自动先获取最新再签出（默认 true；传 false 则仅警告、不自动获取）"),
        autoAdd: z
          .boolean()
          .optional()
          .describe("遇到服务端尚不存在的新文件时，自动加入版本控制（add）（默认 true；传 false 则仅提示改用 tfs_add）"),
      },
    },
    async ({ paths, dryRun, getLatestIfStale, autoAdd }) => {
      const results = await runCheckout(paths, { dryRun, getLatestIfStale, autoAdd })
      const text = `${summarize(results)}\n\n${JSON.stringify({ results }, null, 2)}`
      return { content: [{ type: "text" as const, text }] }
    },
  )

  mcp.registerTool(
    "tfs_add",
    {
      title: "TFS 加入版本控制",
      description:
        "为 MacTFS 映射目录下、尚未纳入版本控制的【新建文件】执行加入（add / pendAdd）。" +
        "新建文件请在写入磁盘后调用本工具（此时文件已存在于本地）。" +
        "会先做执行前校验：是否在映射目录内、本地是否存在、是否已加入、是否其实已受控（已受控应改用 tfs_checkout）。" +
        "返回每个文件的处理结果（added / alreadyAdded / skipped / error）。",
      inputSchema: {
        paths: z
          .array(z.string())
          .min(1)
          .describe("要加入版本控制的文件本地绝对路径列表"),
        dryRun: z
          .boolean()
          .optional()
          .describe("只做执行前校验、不真正加入，用于预检"),
      },
    },
    async ({ paths, dryRun }) => {
      const results = await runAdd(paths, { dryRun })
      const text = `${summarize(results)}\n\n${JSON.stringify({ results }, null, 2)}`
      return { content: [{ type: "text" as const, text }] }
    },
  )

  return mcp
}

/**
 * 启动「父进程（Electron）看护」：父进程消失则自杀，避免遗留孤儿。
 */
function startParentWatchdog(): void {
  const pid = PARENT_PID
  if (pid === null) {
    return
  }
  log(`watching parent pid ${pid}`)
  setInterval(() => {
    try {
      process.kill(pid, 0)
    } catch {
      log("parent process gone, exiting")
      process.exit(0)
    }
  }, 3000)
}

/**
 * 等待 Java 后端 health 就绪；超过上限仍未就绪则降级继续（工具会返回 notConnected）。
 */
async function waitForBackend(): Promise<boolean> {
  for (let attempt = 0; attempt < HEALTH_WAIT_TRIES; attempt += 1) {
    const health = await tfsClient.health()
    if (health.ok) {
      return true
    }
    await delay(HEALTH_WAIT_INTERVAL_MS)
  }
  return false
}

/**
 * 启动 MCP SSE 服务：等待后端、注册路由、监听端口、挂看护。
 */
export async function startServer(): Promise<void> {
  startParentWatchdog()

  log("waiting for MacTFS backend ...")
  const ready = await waitForBackend()
  if (ready) {
    log("backend ready")
  } else {
    log("backend not ready after wait, starting in degraded mode")
  }

  const app = express()
  const transports: Record<string, SSEServerTransport> = {}

  app.get("/sse", async (req, res) => {
    if (!authorized(req)) {
      res.status(401).json({ error: "unauthorized" })
      return
    }
    const transport = new SSEServerTransport("/messages", res)
    transports[transport.sessionId] = transport
    res.on("close", () => {
      delete transports[transport.sessionId]
    })
    const mcp = createMcpServer()
    try {
      await mcp.connect(transport)
    } catch (error) {
      log(`sse connect error: ${error instanceof Error ? error.message : String(error)}`)
    }
  })

  app.post("/messages", async (req, res) => {
    if (!authorized(req)) {
      res.status(401).json({ error: "unauthorized" })
      return
    }
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : ""
    const transport = transports[sessionId]
    if (!transport) {
      res.status(400).json({ error: "no transport for sessionId" })
      return
    }
    await transport.handlePostMessage(req, res)
  })

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, name: SERVER_NAME, version: SERVER_VERSION })
  })

  app.listen(MCP_PORT, MCP_HOST, () => {
    log(`SSE listening on http://${MCP_HOST}:${MCP_PORT}/sse`)
  })
}

/**
 * 启动 MCP stdio 服务：供 Codex / Claude 等「以命令启动子进程」方式接入的通用客户端使用。
 *
 * 与 SSE 模式的差异：
 * - 不监听 38766 端口、不起 express，AI 客户端直接通过 stdin/stdout 与本进程通信。
 * - 直连 38765 Java 后端（tfsClient 已走 MACTFS_API_BASE_URL）；后端未起时工具会返回 notConnected。
 * - 必须尽快 connect，让客户端的 initialize 握手立即完成，故不在启动时阻塞等待后端，
 *   仅在后台探测一次后端就绪并打日志（stderr，绝不写 stdout，避免污染 JSON-RPC 通道）。
 */
export async function startStdioServer(): Promise<void> {
  startParentWatchdog()

  void waitForBackend().then((ready) => {
    log(ready ? "backend ready" : "backend not ready, running in degraded mode (tools will report notConnected)")
  })

  const mcp = createMcpServer()
  const transport = new StdioServerTransport()
  await mcp.connect(transport)
  log("stdio transport connected")
}
