# FE-001 实现 Electron 启动服务与 API 客户端

## 状态

done

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- SERVER-002

## 需求来源

- PRD 三、阶段三：Frontend
- PRD 六、UI 设计

## 目标

让 Electron 启动时能够拉起或连接本地 Java API 服务，并提供前端 API 客户端。

## 实现范围

- Electron 主进程启动本地服务
- 检查 `127.0.0.1:38765` health
- 读取 token 文件
- 前端封装统一 API 请求方法
- 请求自动带 Bearer token

## 不在范围

- 不实现业务页面
- 不做打包
- 不做自动更新

## 涉及文件

- [mactfsui/electron/main.cjs](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/electron/main.cjs)
- [mactfsui/app](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app)

## 验收标准

- Electron 启动后可连接本地 API
- API 请求能自动带 token
- 服务未启动时 UI 有明确提示

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

- 完成日期：2026-06-08
- 实际修改文件：
  - `mactfsui/electron/main.cjs`
  - `mactfsui/electron/preload.cjs`
  - `mactfsui/app/lib/electron/bridge.ts`
  - `mactfsui/app/lib/api/client.ts`
  - `mactfsui/app/lib/api/types.ts`
  - `mactfsui/app/routes/home.tsx`
  - `mactfsui/package.json`
  - `task/README.md`
  - `task/frontend/FE-001-实现Electron启动服务与API客户端.md`
- 实际实现内容：
  - Electron 主进程增加 preload 配置、contextIsolation、nodeIntegration 关闭。
  - Electron 主进程增加本地 token 读取、`/api/health` 检查、未运行时通过 `../tfsIntegration/gradlew runServer` 拉起本地 Java API 服务。
  - 新增 preload 窄接口：`getToken`、`getServiceStatus`。
  - 新增 renderer 侧 Electron bridge 类型封装。
  - 新增统一 API client，所有请求自动读取 token 并附加 `Authorization: Bearer <token>`。
  - 首页替换脚手架内容，展示本地 API 服务状态、token 路径和请求状态；服务未就绪时给出明确提示。
  - 调整 `electron:dev` 等待条件为 `wait-on tcp:5173`，避免 React Router dev 的 HTTP 探测差异阻塞 Electron 启动。
- 已执行测试：
  - `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui && pnpm typecheck`：通过。
  - `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui && node -c electron/main.cjs`：通过。
  - `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui && node -c electron/preload.cjs`：通过。
  - `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew runServer` 后请求 `/api/health`：通过，返回 `success=true`。
  - `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui && pnpm electron:dev`：通过，Electron 启动后拉起 Java API 服务，`curl /api/health` 返回 `success=true`。
  - 内置浏览器打开 `http://127.0.0.1:5173/`：通过，非 Electron 环境显示明确的 preload 缺失提示，不是空白页。
- 未执行测试及原因：
  - 未执行真实 TFS 连接、目录浏览或文件操作；本任务只要求本地服务、health 和 API client，不涉及真实 TFS 业务操作。
- 验收标准确认：
  - Electron 启动后可连接本地 API：满足，`electron:dev` 启动后 38765 端口监听，health 返回 `success=true`。
  - API 请求能自动带 token：满足，`apiRequest` 统一从 preload 获取 token 并设置 Bearer header，首页通过该 client 请求 health。
  - 服务未启动时 UI 有明确提示：满足，首页根据 bridge/service 状态展示未就绪或 preload 缺失提示。
- 遗留问题：
  - 生产环境打包启动命令仍待 Release 阶段确定，当前按前端规范使用开发期 Gradle `runServer`。
