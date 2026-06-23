import { startServer } from "./server.js"

startServer().catch((error) => {
  process.stderr.write(`[mactfs-mcp] fatal: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`)
  process.exit(1)
})
