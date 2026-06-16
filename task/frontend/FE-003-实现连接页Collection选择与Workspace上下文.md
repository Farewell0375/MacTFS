# FE-003 实现连接页、Collection 选择与 Workspace 上下文

## 状态

done

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-001
- FE-002
- SERVER-003
- SERVER-004
- SERVER-005
- SERVER-006

## 需求来源

- PRD 七、7.1 首次连接
- [mactfsui/FRONTEND_SPEC.md](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/FRONTEND_SPEC.md)

## 目标

实现前端新的连接入口：登录后先选择 Collection，再自动确保默认 Workspace，进入工作台后固定上下文。

## 实现范围

- 连接表单、连接中状态、错误提示
- 读取并回填默认配置
- 连接成功后加载 Collection 列表
- 登录页确认 Collection 后再进入工作台
- 自动查找或创建默认 Workspace
- 工作台共享状态中固定 `serverUri`、`collection`、`workspace`

## 不在范围

- 不实现工作台三栏布局
- 不实现目录树和文件列表
- 不支持工作台内切换 Collection
- 不提供 Workspace 手动选择控件

## 涉及文件

- [mactfsui/app/routes/home.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/routes/home.tsx)
- [mactfsui/app/components/app](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/app)
- [mactfsui/app/lib/api](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/api)

## 验收标准

- 登录页可以连接 TFS 并展示 Collection 选择
- 配置中有上次 Collection 时可默认回填
- 用户确认 Collection 后才进入工作台
- 工作台内展示固定 Collection 和当前 Workspace
- 前端没有 Workspace 选择控件

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

### 实际修改文件

- `mactfsui/app/components/ui/input.tsx`（新增）：基础输入框组件。
- `mactfsui/app/components/ui/label.tsx`（新增）：基础表单标签组件。
- `mactfsui/app/lib/tfs/session.ts`（新增）：工作台固定上下文 `WorkspaceSession` 类型。
- `mactfsui/app/components/app/connect-view.tsx`（新增）：连接表单 + Collection 选择 + 确保 Workspace 流程。
- `mactfsui/app/components/app/workspace-shell.tsx`（新增）：工作台占位外壳，展示固定上下文。
- `mactfsui/app/routes/home.tsx`：改为编排 检测服务 → 连接 → 工作台 的视图状态机。

### 实际实现内容

- 连接表单覆盖 serverUri / 域 / 用户名 / 密码，第一版固定 `authType = ntlm-explicit`（对齐 PRD 7.1）。
- 进入时调用 `GET /api/config` 回填上次配置（含密码与上次 Collection 选中态）。
- 点击「连接 TFS」依次调用 `POST /api/session/connect` 与 `GET /api/collections`，期间展示「正在连接 TFS…」「正在加载 Collection…」状态，失败统一展示 `errorMessage || message`。
- Collection 以可选列表展示，登录页确认后才调用 `POST /api/workspace/ensure` 确保默认 Workspace，再进入工作台；不提供 Workspace 选择控件。
- 进入工作台后由 `home.tsx` 持有固定上下文 `WorkspaceSession`（serverUri / collection / workspace / mappings），工作台外壳展示 Collection 与当前 Workspace，并提供「重新连接」回到连接入口。
- 所有后端调用走 `app/lib/api` 的 `api` 端点封装，组件不直接 `fetch`、不直接读 token。

### 已执行测试

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

### 测试结果

- `pnpm typecheck`：通过（exit 0）。
- 新增组件 ReadLints 无告警。

### 未执行测试及原因

- 未实际启动 Electron 做端到端联调：连接 / Collection / Workspace 的真实交互依赖真实 TFS 环境与本地服务，留待 FEATURE 阶段；本任务按前端默认验证执行 `pnpm typecheck`。

### 是否满足验收标准

- 登录页可以连接 TFS 并展示 Collection 选择：满足。
- 配置中有上次 Collection 时可默认回填：满足（回填表单字段与选中 Collection）。
- 用户确认 Collection 后才进入工作台：满足（确认后才 ensure workspace 并切换）。
- 工作台内展示固定 Collection 和当前 Workspace：满足（工作台外壳展示）。
- 前端没有 Workspace 选择控件：满足（仅自动 ensure）。

### 遗留问题与建议

- 工作台外壳为占位视图，三栏布局与折叠面板在 FE-004 实现，应将顶部上下文栏收口到正式布局。
- 非 Electron / 纯浏览器环境下无 token，连接请求会 401，属预期（目标运行环境为 Electron）。
- 连接成功后可考虑直接复用 `GET /api/workspace/context` 统一上下文来源，待 FE-004 布局接入时再决定收口位置。
