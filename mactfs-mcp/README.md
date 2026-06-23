# mactfs-mcp

让任意支持 MCP 的 AI 客户端（Cursor / Claude / Codex 等）在**修改受 TFS 版本控制的文件之前自动校验并签出**。

本服务暴露 `tfs_checkout`、`tfs_add` 两个工具，背后调用 MacTFS 本地 Java 服务（`127.0.0.1:38765`）完成实际签出（TFVC pendEdit）/ 加入（pendAdd）。

## 两种接入模式

| 模式 | 启动方式 | 适用客户端 | 说明 |
|---|---|---|---|
| **SSE**（默认） | 由 MacTFS 桌面客户端拉起，监听 `127.0.0.1:38766/sse` | **Cursor**（支持填 URL） | 随客户端启停，端口存在才能连 |
| **stdio** | `mactfs-mcp --mcp-stdio`（由 AI 客户端以子进程拉起） | **Codex / Claude 等**（只认「启动一个命令」） | 不占 38766 端口，直连 38765 Java 后端；后端没起时工具返回 notConnected |

> 为什么要两种：Cursor 天生支持「填个网址就连」(SSE)，而 Codex / Claude 的配置默认是「给我一个能启动的程序」(stdio)，没法直接贴 SSE 地址。stdio 模式就是为后者准备的通用入口。

## 与客户端绑定

本 MCP **由 MacTFS 桌面客户端（Electron）拉起、随客户端退出而回收**：

```
Electron 客户端(运行中)
  ├─ Java 后端   127.0.0.1:38765
  └─ mactfs-mcp  127.0.0.1:38766/sse   ← AI 客户端用 URL 连接
                    └─ HTTP → Java 后端 → TFS
退出客户端 → 两个子进程都被回收 → AI 连接被拒（天然绑定）
```

- 只有客户端开着，`38766` 端口才存在，AI 才能用。
- MCP 还会看护父进程（`MACTFS_PARENT_PID`），客户端异常退出时自杀，避免孤儿进程。

## 工具：`tfs_checkout`

在编辑受 TFS 管控的已有文件前调用。

入参：

| 参数 | 类型 | 说明 |
|---|---|---|
| `paths` | `string[]` | 文件本地绝对路径（也兼容 `$/` 服务端路径） |
| `dryRun` | `boolean?` | 只做执行前校验、不真正签出 |
| `getLatestIfStale` | `boolean?` | 本地落后于服务器时自动先获取最新再签出（默认 false，仅警告） |

执行前校验流水线：连接 → 是否映射 → 是否已签出 → 是否新文件 → 是否未下载 → 是否落后 → 签出。

每个路径返回结构化结果，`action` 为 `checkedOut | alreadyCheckedOut | skipped | error`，并附人话 `message`。

## 在 Cursor 中配置

**默认无需 token**，配置里只写一个 URL 即可（MCP 调后端用的 token 会自动从 `~/.mactfs/server-token` 读取，AI 端不用管）：

```json
{
  "mcpServers": {
    "mactfs": { "url": "http://127.0.0.1:38766/sse" }
  }
}
```

> 前提：MacTFS 桌面客户端正在运行（否则 38766 端口不存在，连接会被拒）——这就是「客户端开着才能用」的绑定。

### 可选：开启更严格的本机鉴权

如果想防止同机其它程序连本 MCP，给 MCP 进程设环境变量 `MACTFS_MCP_REQUIRE_TOKEN=1`，再在配置里带上 token：

```json
{
  "mcpServers": {
    "mactfs": {
      "url": "http://127.0.0.1:38766/sse",
      "headers": { "Authorization": "Bearer 这里粘贴server-token内容" }
    }
  }
}
```

也可用查询参数：`"url": "http://127.0.0.1:38766/sse?token=server-token内容"`。

## 在 Codex / Claude 中配置（stdio 模式）

Cursor 支持「填个 URL 直接连」(SSE)，而 **Codex / Claude 的配置是「给我一个能启动的命令」**(stdio)，没法直接贴 SSE 地址。
为此本 MCP 增加了 `--mcp-stdio` 模式：启动后**不监听 38766 端口、不起 SSE**，直接通过 stdin/stdout 与 AI 客户端通信，背后仍调用 38765 Java 后端。

### 前提（务必先确认）

1. **MacTFS 桌面客户端正在运行**（Java 后端 38765 在跑）。后端没起时工具不会报错崩溃，只会返回 `notConnected`，等后端起来即可正常用。
2. **本机装了 Node 18+**（`node -v` 能输出版本）。stdio 进程由 AI 客户端拉起，需要一个 Node 运行时来跑那个单文件。
   - 不想另装 Node？见文末「免装 Node：复用 app 自带 Electron」。

### 第 1 步：确定入口文件的绝对路径

入口就是 esbuild 打出的单文件 `index.cjs`，两种来源任选其一：

| 场景 | 绝对路径（示例，按你机器实际替换） |
|---|---|
| **已安装 app**（推荐） | `/Applications/MacTFS.app/Contents/Resources/mcp/index.cjs` |
| **本仓库开发态** | `/Users/你的用户名/.../mydev/mactfs-mcp/dist-bundle/index.cjs` |

> 开发态若还没生成单文件，先在 `mactfs-mcp/` 下执行 `pnpm build:bundle`（产物在 `dist-bundle/index.cjs`）。
> 也可以直接用 tsc 产物 `dist/index.js`（同样加 `--mcp-stdio`），效果一致。

### 第 2 步：按客户端写配置（把路径换成你的真实路径）

**Codex CLI**（`~/.codex/config.toml`）：

```toml
[mcp_servers.mactfs]
command = "node"
args = ["/Applications/MacTFS.app/Contents/Resources/mcp/index.cjs", "--mcp-stdio"]
```

**Claude Desktop**（`~/Library/Application Support/Claude/claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "mactfs": {
      "command": "node",
      "args": ["/Applications/MacTFS.app/Contents/Resources/mcp/index.cjs", "--mcp-stdio"]
    }
  }
}
```

**Claude Code**（命令行，一条搞定）：

```bash
claude mcp add mactfs -- node /Applications/MacTFS.app/Contents/Resources/mcp/index.cjs --mcp-stdio
```

> 改完配置后**重启对应客户端**（Codex 重开会话 / Claude 退出重进），让它重新读取配置并拉起 MCP。

### 第 3 步：验证是否生效

- Codex / Claude 的工具列表里应能看到 `tfs_checkout`、`tfs_add` 两个工具。
- 想在命令行先自测，可临时手动跑：

```bash
node /Applications/MacTFS.app/Contents/Resources/mcp/index.cjs --mcp-stdio
# 正常会在 stderr 打印：[mactfs-mcp] stdio transport connected
# 然后阻塞等待 stdin 的 JSON-RPC（Ctrl+C 退出即可）
```

### 可选 A：免装 Node —— 复用 app 自带的 Electron 当 Node

安装包里已经带了 Electron，可让它「以 Node 模式」运行，无需另装 Node：

```json
{
  "mcpServers": {
    "mactfs": {
      "command": "/Applications/MacTFS.app/Contents/MacOS/MacTFS",
      "args": ["/Applications/MacTFS.app/Contents/Resources/mcp/index.cjs", "--mcp-stdio"],
      "env": { "ELECTRON_RUN_AS_NODE": "1" }
    }
  }
}
```

`ELECTRON_RUN_AS_NODE=1` 让这个 app 二进制不弹窗、纯当 Node 跑脚本。这样**所有路径都在安装包内部，零外部依赖**。

### 可选 B：不另起进程，桥接现成的 SSE 服务

如果只是想复用 app 已经在跑的 SSE（38766），不想再由客户端拉起 stdio 进程，Claude 侧可用桥接：

```bash
npx -y mcp-remote http://127.0.0.1:38766/sse
```

把它作为客户端的 `command`，即可把 SSE 转成 stdio。

### 几点说明（不是问题，但要知道）

- **生命周期**：stdio 进程由 AI 客户端启停，不再随 MacTFS app 开关绑定。但真正干活的是 38765 Java 后端 —— app 没开时工具只返回 `notConnected`，不会误操作，安全。
- **多客户端不冲突**：stdio 模式**不占 38766 端口**，Cursor 的 SSE 与 Codex/Claude 的多个 stdio 进程可同时存在，各自连同一个 38765 后端，互不干扰。
- **鉴权**：stdio 是本机父子进程直连，无需 token；`MACTFS_MCP_REQUIRE_TOKEN` 只对 SSE 连接生效。

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `MACTFS_API_BASE_URL` | `http://127.0.0.1:38765` | Java 后端地址 |
| `MACTFS_MCP_HOST` / `MACTFS_MCP_PORT` | `127.0.0.1` / `38766` | SSE 监听地址 |
| `MACTFS_TOKEN_FILE` | `~/.mactfs/server-token` | Bearer Token 文件（MCP 调后端用，自动读取） |
| `MACTFS_MCP_REQUIRE_TOKEN` | 关 | 设 `1` 时要求 AI 客户端连接也带 token |
| `MACTFS_PARENT_PID` | 无 | 父进程 pid，设置后启用「父死则自杀」 |
| `MACTFS_MCP_HEALTH_TRIES` / `_INTERVAL_MS` | `60` / `1000` | 启动时等待后端就绪的轮询 |

## 开发

```bash
pnpm install
pnpm build      # 产物在 dist/
pnpm dev        # tsx watch 热更新
pnpm typecheck
```

Electron 开发态会自动从 `mactfs-mcp/dist/index.js` 拉起本服务，所以改完记得 `pnpm build`。

## 打包进 .app

打包态用 **esbuild 把整个 MCP 打成单文件**（免带 node_modules），再随 electron-builder 落到 `Resources/mcp/index.cjs`：

```bash
pnpm build:bundle   # 产物 dist-bundle/index.cjs（单文件 CJS）
```

`mactfsui` 侧已接好：

- `package.json` 的 `extraResources` 增加 `{ from: "../mactfs-mcp/dist-bundle", to: "mcp" }`，把单文件包复制进 `Resources/mcp/`。
- `pnpm dist` 链路里加了 `prepare:mcp`（自动 `pnpm install` + `build:bundle`），打包前会自动生成最新单文件包。
- Electron 主进程 `resolveMcpEntry()` 打包态命中 `Resources/mcp/index.cjs`，用 Electron 自带 Node（`ELECTRON_RUN_AS_NODE`）拉起。

> 打包态用 `.cjs`（CJS），开发态仍用 `dist/index.js`（tsc 的 ESM 产物 + node_modules），两条路径互不影响。
