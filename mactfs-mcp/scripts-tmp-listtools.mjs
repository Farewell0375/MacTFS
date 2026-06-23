import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"

const transport = new SSEClientTransport(new URL("http://127.0.0.1:38766/sse"))
const client = new Client({ name: "probe", version: "1.0.0" })
await client.connect(transport)
const tools = await client.listTools()
console.log("TOOLS:", tools.tools.map((t) => t.name).join(", "))
for (const t of tools.tools) {
  console.log("-", t.name, "::", JSON.stringify(Object.keys(t.inputSchema?.properties ?? {})))
}
await client.close()
process.exit(0)
