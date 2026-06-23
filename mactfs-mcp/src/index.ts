import { startServer, startStdioServer } from "./server.js"

// --mcp-stdio：以 stdio 模式运行（供 Codex / Claude 等用「命令启动子进程」接入）；
// 缺省仍走 SSE 模式（供 Cursor 用 URL 接入、由 MacTFS 桌面客户端拉起）。
const useStdio = process.argv.includes("--mcp-stdio")
const run = useStdio ? startStdioServer : startServer

run().catch((error) => {
  process.stderr.write(`[mactfs-mcp] fatal: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`)
  process.exit(1)
})
