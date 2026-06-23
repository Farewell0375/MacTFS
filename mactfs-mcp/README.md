# mactfs-mcp

让任意支持 MCP 的 AI 客户端（Cursor / Claude 等）在**修改受 TFS 版本控制的文件之前自动校验并签出**。

本服务通过 SSE 暴露一个工具 `tfs_checkout`，背后调用 MacTFS 本地 Java 服务（`127.0.0.1:38765`）完成实际签出（TFVC pendEdit）。

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

## 打包（TODO）

打包进 .app 时需把 `dist/` 与生产依赖（express 等）放到 `Resources/mcp/`，并让 `resolveMcpEntry()` 命中。当前已预留打包态路径 `Resources/mcp/index.js`，但 `electron-builder` 的 extraResources 与依赖裁剪待补。
