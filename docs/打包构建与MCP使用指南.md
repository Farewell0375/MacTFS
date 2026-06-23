# macTFS 打包构建 & MCP 使用配置指南

本文分两大块：

1. **打包构建**：怎么把整个项目从源码构建成可分发的 macOS 桌面应用（`.app` / `.dmg`）。
2. **MCP 工具**：`mactfs-mcp` 能做什么、怎么在 AI 客户端（Cursor / Claude 等）里配置使用。

> 日常「启动 / 停止 / 重启」服务的操作见根目录 [`服务启停指南.md`](../服务启停指南.md)，本文不重复。

---

## 一、项目组成与端口

运行态由三个进程组成，全部只监听本机（`127.0.0.1`）：

| 进程 | 是什么 | 监听 |
|---|---|---|
| Java 后端 | `com.mydev.mactfs.server.MacTfsServer`，复用微软 TFS SDK 与 TFS 通信 | `127.0.0.1:38765` |
| Electron 前端 | 桌面界面（开发态由 vite 提供页面 `localhost:5173`） | 窗口 |
| mactfs-mcp | 给 AI 客户端用的 SSE 服务（改文件前自动签出） | `127.0.0.1:38766/sse` |

**进程关系（重点）**：

```
Electron 客户端（你启动的）
  ├─ 自动拉起 Java 后端    127.0.0.1:38765
  └─ 自动拉起 mactfs-mcp   127.0.0.1:38766/sse
退出 Electron → 两个子进程一并回收（孤儿进程会被「父死自杀」看护清掉）
```

- 后端 / MCP 都由 Electron 按需拉起、随之退出，所以**日常只需启动前端**。
- MCP 还会看护父进程 PID，Electron 异常退出时自杀；崩溃后 Electron 会自动重拉（2 秒后）。
- 登录 token 存在 `~/.mactfs/server-token`，三个进程共用同一份。

---

## 二、环境要求

- macOS 12+（Intel 或 Apple Silicon；Apple Silicon 需装 Rosetta 2）
- [pnpm](https://pnpm.io/)（前端 / MCP 包管理）
- Node ≥ 18（开发 MCP 用）
- 首次构建需联网（自动从 Azul 下载 x64 JDK）
- 目标 TFS：TFS 2015 及以下（TFVC）

> ⚠️ **为什么固定 x64 JDK**：TFS SDK 的 JNI 原生库只含 i386/x86_64，没有 arm64 切片。所以服务端 JVM 固定走 x64，在 Apple Silicon 上经 Rosetta 2 运行；Electron 界面本身仍是原生 universal。

---

## 三、从零打包成桌面应用（.app / .dmg）

下面是一套**完整顺序**，第一次构建建议逐步执行；之后只改了某一层就只重跑对应步骤。

### 步骤 1 · 安装前端依赖

```bash
cd mactfsui
pnpm install
```

### 步骤 2 · 准备 x64 JDK（打包用运行时）

```bash
cd mactfsui
pnpm prepare:runtime
```

脚本逻辑（`scripts/prepare-runtime.mjs`）：

- 检测仓库根是否已有 `zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/`；没有就从 Azul 官方下载 → 校验 sha256 → 解压到仓库根目录。
- 再把精简后的运行时复制到 `mactfsui/runtime/jdk-x64`（去掉 `src.zip`、`demo`、`man` 等无用部分缩小体积）。
- 打包时这个 `runtime/jdk-x64` 会被复制进 `.app` 的 `Resources/jre-x64`。

> `pnpm dist` 会自动先跑这一步，所以你也可以跳过手动执行；单独跑只是为了提前下载/排错。

### 步骤 3 · 构建 Java 后端

```bash
cd mactfs
../tfsIntegration/gradlew installDist
```

- 产物落在 `mactfs/build/install/mactfs/lib/`（含全部依赖 jar 与 `native/` JNI 库）。
- 打包时这个目录会被复制进 `.app` 的 `Resources/server/lib`。
- **改了 Java 代码必须重新 `installDist`**，只跑 `gradlew build` 不更新这个运行目录。

### 步骤 4 · 构建 MCP

```bash
cd mactfs-mcp
pnpm install
pnpm build      # tsc 编译，产物在 dist/
```

- 开发态 Electron 从 `mactfs-mcp/dist/index.js` 拉起 MCP，所以**改完 MCP 代码必须重新 `pnpm build`**。

### 步骤 5 · 打包

```bash
cd mactfsui
pnpm dist
```

`pnpm dist` 等价于：`pnpm build`（打包前端页面）→ `pnpm prepare:runtime`（准备 JDK）→ `electron-builder --mac --arm64 --x64`。

**产物输出**：`mactfsui/dist-app/`，生成 arm64 与 x64 两个 DMG：

| 安装包 | 适用机型 |
|---|---|
| `MacTFS-<版本>-arm64.dmg` | Apple Silicon（M 系列） |
| `MacTFS-<版本>-x64.dmg` | Intel |

打包配置见 `mactfsui/package.json` 的 `build` 字段：`appId=com.mydev.mactfs`，`extraResources` 把后端 lib 与 x64 JRE 带进 `Resources/`，`identity: null`（不签名）。

### ⚠️ 已知限制：MCP 暂未打进 .app

当前 `package.json` 的 `extraResources` **只包含** `server/lib` 与 `jre-x64`，**没有** MCP。打包后的应用里：

- `resolveMcpEntry()` 先找 `Resources/mcp/index.js`（不存在）→ 再退回开发态路径（打包后也不存在）→ 启动时打印「未找到 MCP 入口，跳过启动」。
- **结论：目前只有「开发模式」下 MCP 可用；正式 .app 暂时不带 MCP。**

要让 MCP 进 .app，需要补两步（待办）：

1. 在 `extraResources` 增加一条，把 `mactfs-mcp/dist` + 生产依赖（`express`、`@modelcontextprotocol/sdk`、`zod`）放到 `Resources/mcp/`。
2. 确认 `resolveMcpEntry()` 命中 `Resources/mcp/index.js`。

---

## 四、开发模式运行（推荐日常使用）

```bash
cd mactfsui
pnpm electron:dev
```

一条命令同时拉起 vite（`localhost:5173`）+ Electron 窗口，Electron 再按需自动拉起后端与 MCP。

前置：首次需先跑过 **步骤 3（`installDist`）** 和 **步骤 4（MCP `pnpm build`）**，否则后端 / MCP 起不来。

---

## 五、mactfs-mcp 工具：能做什么 & 怎么用

### 5.1 它是什么

一个 SSE（`http://127.0.0.1:38766/sse`）小服务，让支持 MCP 的 AI 客户端在**改 TFS 受控文件之前自动签出**。它自己不直接连 TFS，而是把请求转成调本机 Java 后端的 REST 接口，由后端经微软 SDK 操作 TFS。

```
AI 客户端 ──SSE──▶ mactfs-mcp ──HTTP(REST+Token)──▶ Java 后端(38765) ──▶ TFS
```

> 前提：MacTFS 桌面客户端正在运行（否则 38766 端口不存在，AI 连接会被拒）——这就是「客户端开着才能用」的天然绑定。

### 5.2 在 Cursor 中配置

**默认无需 token**，配置里只写一个 URL 即可（MCP 调后端用的 token 会自动从 `~/.mactfs/server-token` 读取）：

```json
{
  "mcpServers": {
    "mactfs": { "url": "http://127.0.0.1:38766/sse" }
  }
}
```

### 5.3 两个工具

#### `tfs_checkout` — 签出（改已有文件前用）

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `paths` | `string[]` | 必填 | 文件本地绝对路径（也兼容 `$/` 服务端路径） |
| `dryRun` | `boolean?` | false | 只校验、不真正签出/加入/拉最新 |
| `getLatestIfStale` | `boolean?` | **true** | 本地落后时自动先获取最新再签出；传 `false` 则仅警告 |
| `autoAdd` | `boolean?` | **true** | 遇到服务端尚不存在的新文件时自动加入版本控制；传 `false` 则仅提示改用 `tfs_add` |

执行前校验流水线：连接 → 是否映射 → 是否已签出 → 是否新文件 → 是否未下载 → 是否落后 → 签出。

**默认行为（已内置）**：

- 新文件 → **自动 `add` 加入版本控制**（除非 `autoAdd=false`）。
- 本地落后 → **自动先 `get-latest` 再签出**（除非 `getLatestIfStale=false`）。
- `dryRun=true` 时只报告「会怎么做」，**不会**真的 add / 拉最新（无副作用）。

#### `tfs_add` — 加入版本控制（新建文件用）

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `paths` | `string[]` | 必填 | 要加入版本控制的文件本地绝对路径 |
| `dryRun` | `boolean?` | false | 只校验、不真正加入 |

每个路径都会返回结构化结果，`action` 取值：`checkedOut / alreadyCheckedOut / added / alreadyAdded / skipped / error`，并附一段人话 `message`。

### 5.4 可选：开启更严格的本机鉴权

默认靠「仅监听 127.0.0.1 + 随客户端绑定」两道保护，AI 端不用带 token。若想防止同机其它程序连本 MCP，给 MCP 进程设 `MACTFS_MCP_REQUIRE_TOKEN=1`，再在配置里带上 token：

```json
{
  "mcpServers": {
    "mactfs": {
      "url": "http://127.0.0.1:38766/sse",
      "headers": { "Authorization": "Bearer 这里粘贴 server-token 内容" }
    }
  }
}
```

也可用查询参数：`"url": "http://127.0.0.1:38766/sse?token=server-token内容"`。

### 5.5 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `MACTFS_API_BASE_URL` | `http://127.0.0.1:38765` | Java 后端地址 |
| `MACTFS_MCP_HOST` / `MACTFS_MCP_PORT` | `127.0.0.1` / `38766` | SSE 监听地址 |
| `MACTFS_TOKEN_FILE` | `~/.mactfs/server-token` | Bearer Token 文件（自动读取） |
| `MACTFS_MCP_REQUIRE_TOKEN` | 关 | 设 `1` 时要求 AI 客户端连接也带 token |
| `MACTFS_PARENT_PID` | 无 | 父进程 pid，设置后启用「父死则自杀」 |
| `MACTFS_MCP_HEALTH_TRIES` / `_INTERVAL_MS` | `60` / `1000` | 启动时等待后端就绪的轮询次数 / 间隔 |
| `MACTFS_MCP_HTTP_TIMEOUT_MS` | `30000` | 调 Java 后端的 HTTP 超时 |

> Electron 自动拉起 MCP 时，会注入 `MACTFS_PARENT_PID`、`MACTFS_API_BASE_URL`、`MACTFS_TOKEN_FILE`、`MACTFS_MCP_PORT`。

---

## 六、验证与排错

### 验证后端

```bash
TOKEN=$(cat ~/.mactfs/server-token)
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:38765/api/health
# 返回 "success":true 即正常
```

### 验证 MCP

```bash
curl -s http://127.0.0.1:38766/healthz
# 返回 {"ok":true,"name":"mactfs-mcp",...} 即在跑
```

### 常见问题

| 现象 | 原因与处理 |
|---|---|
| MCP 端口 38766 连不上 | MacTFS 客户端没开，或开发态没先 `pnpm build` 过 MCP |
| 改了 MCP 代码不生效 | 忘了在 `mactfs-mcp` 重新 `pnpm build`（Electron 加载的是 `dist/`） |
| 改了 Java 代码不生效 | 忘了 `gradlew installDist` 或没重启后端 |
| 打包后的 .app 里没有 MCP | 已知限制：MCP 暂未加入 `extraResources`（见三 · 已知限制） |
| 工具返回 `skipped / notMapped` | 文件不在任何 TFS 映射目录下，本就无需签出，可直接继续 |
| 工具返回 `notConnected` | 后端 38765 没起来，确认 MacTFS 客户端在运行 |
| 接口全部 401 | token 不一致，确认用的是 `~/.mactfs/server-token` 的最新值 |
