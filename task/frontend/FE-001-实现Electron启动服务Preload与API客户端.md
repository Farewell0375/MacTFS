# FE-001 实现 Electron 启动服务、Preload 与 API 客户端

## 状态

done

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- SERVER-002
- CLI-002

## 需求来源

- PRD 三、阶段四：Frontend Workspace UI
- [mactfsui/FRONTEND_SPEC.md](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/FRONTEND_SPEC.md)

## 目标

补齐 Electron 前端基础设施，让渲染进程通过 preload 和统一 API client 访问本地服务，而不是直接碰本机文件或 Java 进程。

## 实现范围

- Electron 主进程检查 `http://127.0.0.1:38765/api/health`
- 服务未启动时按本地开发约定拉起 `mactfs-server`
- 新增 `preload.cjs` 暴露 token、服务状态、目录选择等窄接口
- 渲染进程封装统一 API client
- API client 自动带 Bearer token
- 服务未就绪时提供明确错误提示和重试入口

## 不在范围

- 不实现业务页面
- 不实现目录树、文件列表、Pending Changes
- 不做 Release 打包
- 不在渲染进程直接暴露 `fs`、`child_process`

## 涉及文件

- [mactfsui/electron/main.cjs](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/electron/main.cjs)
- [mactfsui/electron/preload.cjs](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/electron/preload.cjs)
- [mactfsui/app/lib/api](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/api)
- [mactfsui/app/lib/electron](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/electron)

## 验收标准

- Electron 启动后能检测本地 API 服务状态
- 服务未启动时能拉起或明确提示失败原因
- 渲染进程调用 API 时自动携带 token
- 渲染进程不直接读取 `~/.mactfs/server-token`
- 目录选择能力通过 preload 暴露

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

### 实际修改文件

- `mactfsui/electron/main.cjs`：补齐主进程基础设施。
- `mactfsui/electron/preload.cjs`：新增 preload，暴露窄接口。
- `mactfsui/app/lib/electron/types.ts`：新增桥接类型与 `window.mactfs` 声明。
- `mactfsui/app/lib/electron/bridge.ts`：新增渲染层桥接访问器（含 SSR / 非 Electron 兜底）。
- `mactfsui/app/lib/electron/index.ts`：桥接层出口。
- `mactfsui/app/lib/api/types.ts`：新增 API 响应类型契约。
- `mactfsui/app/lib/api/client.ts`：新增统一 API client。
- `mactfsui/app/lib/api/index.ts`：API 层出口。
- `mactfsui/app/routes/home.tsx`：替换模板页为引导态（检测 / 拉起服务 + 重试入口）。

### 实际实现内容

- 主进程读取 `~/.mactfs/server-token`，通过 IPC 暴露 token，渲染层不直接读取 token 文件。
- 主进程通过 `GET /api/health`（携带 Bearer token，2s 超时）检测本地服务状态。
- 服务未启动时按本地开发约定拉起 `com.mydev.mactfs.server.MacTfsServer`：
  - Java 优先使用项目内置 `zulu8`，回退 `JAVA_HOME`、PATH。
  - classpath 使用 `mactfs/build/install/mactfs/lib/*`（已含全部运行依赖）。
  - 设置 `com.microsoft.tfs.jni.native.base-directory` 指向 native 目录。
  - 拉起后轮询 health 最多 30 次（每次 1s）等待就绪。
- preload 通过 `contextBridge` 暴露 `getApiBaseUrl / getToken / getServiceStatus / startService / selectDirectory`。
- 渲染层统一 API client 自动携带 Bearer token，统一封装网络层与业务层成功/失败，错误展示遵循 `errorMessage || message`。
- 目录选择能力经 preload + `dialog.showOpenDialog` 暴露。
- `will-quit` 回收由本进程拉起的服务端子进程。

### 已执行测试

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

### 测试结果

- `pnpm typecheck` 通过（exit 0）。
- ReadLints 无告警。

### 未执行测试及原因

- 未实际启动 Electron 做端到端联调：FE-001 仅交付基础设施，端到端启动验证留待 FE-013 / FEATURE 阶段，且实际拉起服务依赖真实 TFS 环境与构建产物。

### 是否满足验收标准

- Electron 启动后能检测本地 API 服务状态：满足（`getServiceStatus` → health）。
- 服务未启动时能拉起或明确提示失败原因：满足（`startService` 拉起 + 失败原因文案 + 重试入口）。
- 渲染进程调用 API 时自动携带 token：满足（API client 自动注入 Bearer）。
- 渲染进程不直接读取 `~/.mactfs/server-token`：满足（仅主进程读取，经 IPC 暴露）。
- 目录选择能力通过 preload 暴露：满足（`selectDirectory`）。

### 遗留问题与建议

- `home.tsx` 当前为引导态占位，FE-003 实现连接页时应将服务检测逻辑收口到连接上下文。
- 服务端拉起路径依赖 `mactfs/build/install/mactfs/lib`，建议在 RELEASE 阶段统一打包定位逻辑（生产环境路径与开发不同）。
- 纯浏览器 `pnpm dev`（无 Electron）下 `window.mactfs` 不存在，token 不可用，API 请求会 401，属预期；Electron 为目标运行环境。
