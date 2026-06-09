# macTFS 前端项目规范

## 一、项目定位

`mactfsui` 是 macTFS 的 Electron + React 桌面 UI。它只负责本机桌面交互、状态展示和本地 API 调用，不直接实现 TFS 协议能力。

项目整体链路：

```text
Electron Renderer
  -> Electron Preload / Main
  -> http://127.0.0.1:38765/api/*
  -> mactfs-server
  -> mactfs-core
  -> TFS SDK
```

第一版前端目标是实现 macOS Source Workspace 风格的日常 TFS 操作界面，视觉参考 Finder、Xcode Source Control、Fork / SourceTree：

- 连接配置
- Collection 服务端目录树
- 当前目录文件列表
- Workspace / Mapping 管理
- Get Latest
- 目录对比
- checkout / add / delete / undo
- Pending Changes
- Checkin
- History
- Diff
- 操作日志

不在第一版前端范围：

- 多 Profile
- Work Item
- Check-in Policy UI
- 三方 merge
- 冲突解决器
- 实时 watcher
- 自定义布局
- 自动更新

## 二、关键设计决策

### 2.1 前端技术栈

推荐答案：继续使用现有技术栈，不新增 Vue、MicroFront 或大型状态库。

当前项目已经确定：

- React 19
- React Router 7 framework mode
- TypeScript strict
- Vite
- Electron
- Tailwind CSS 4
- shadcn/ui `radix-nova`
- Radix UI
- lucide-react
- class-variance-authority
- clsx + tailwind-merge

后续新增 UI 组件优先通过 shadcn/ui 生成到 `app/components/ui`，业务组件放到业务目录，不修改 shadcn 组件的职责边界。

### 2.2 架构复杂度

推荐答案：使用轻量分层，不引入 Redux、Zustand、TanStack Query。

原因：

- 第一版 API 是本机同步接口，页面规模可控。
- PRD 明确第一版优先可用和清晰，不做复杂自动化。
- 当前任务要求最小实现，过早引入状态库会增加维护成本。

状态先放在主界面路由和功能组件内，通过自定义 hook 拆分 API 调用。只有跨多个面板共用的状态，才上提到 `AppShell`。

### 2.3 Electron 与本机能力

推荐答案：Electron 主进程负责服务启动、token 读取、目录选择，渲染进程只通过 preload 暴露的窄接口访问。

约束：

- 不开启 renderer 的 Node.js 能力。
- 不在 React 组件里读取本机文件。
- 不在 React 组件里启动 Java 进程。
- Bearer token 由主进程读取 `~/.mactfs/server-token` 后通过 preload 提供。
- 选择本地目录通过 Electron dialog 完成。

### 2.4 页面组织

推荐答案：第一版以一个主路由承载工作台，登录配置是主路由内的连接态视图。

原因：

- 这是桌面工具，不需要营销页或多页面站点结构。
- 登录成功后进入同一个 macOS Source Workspace 工作台。
- Diff 后续如果需要独立沉浸视图，再新增 `routes/diff.tsx`。

## 三、推荐文件层级

后续按以下结构演进：

```text
mactfsui/
  app/
    app.css
    root.tsx
    routes.ts
    routes/
      home.tsx
      diff.tsx                  # FE-012 需要独立页面时再新增
    components/
      app/
        app-shell.tsx           # 主工作台布局
        connection-gate.tsx     # health/config/connect 入口
        connection-bar.tsx      # 顶部连接、Collection、Workspace 信息
      explorer/
        server-tree-panel.tsx   # 左侧服务端目录树
        folder-items-panel.tsx  # 中间目录文件列表
        mapping-dialog.tsx      # Mapping 创建流程
        status-badge.tsx        # TFS 状态展示
      pending/
        pending-changes-panel.tsx
        checkin-form.tsx
      compare/
        folder-compare-panel.tsx
        compare-actions.tsx
      history/
        history-panel.tsx
        changeset-files-panel.tsx
      diff/
        diff-view.tsx
      logs/
        operation-log-panel.tsx
      ui/
        button.tsx              # shadcn/ui 生成组件
    hooks/
      use-api-operation.ts
      use-folder-selection.ts
      use-pending-selection.ts
    lib/
      api/
        client.ts               # fetch、token、统一响应处理
        endpoints.ts            # API 方法
        types.ts                # 后端响应类型
      electron/
        bridge.ts               # window.mactfs 类型封装
      tfs/
        status.ts               # 状态文案、颜色、可用操作
      utils.ts
  electron/
    main.cjs
    preload.cjs                 # FE-001 新增
```

目录规则：

- `routes` 只做页面编排，不堆业务细节。
- `components/ui` 只放 shadcn/ui 基础组件。
- `components/*` 按业务域组织，避免一个 `components/common` 装所有东西。
- `lib/api` 只关心 HTTP 和类型，不关心界面状态。
- `lib/tfs` 放 TFS 状态到 UI 表现的纯映射逻辑。
- `hooks` 只抽真实复用的交互状态，不为未来扩展提前抽象。

## 四、前端分层规范

### 4.1 Electron Main

职责：

- 创建主窗口。
- 开发环境加载 `http://localhost:5173`。
- 生产环境加载 `build/client/index.html`。
- 检查 `http://127.0.0.1:38765/api/health`。
- 服务未启动时拉起本地 Java API 服务。
- 读取 `~/.mactfs/server-token`。
- 打开本地目录选择器。

开发期建议：

- 优先检测已有服务。
- 服务不存在时可以通过 `cd ../mactfs && ../tfsIntegration/gradlew runServer` 拉起。
- 发行期启动命令由 release 任务统一确定，前端不要长期硬编码 Gradle 路径。

### 4.2 Electron Preload

preload 只暴露必要能力：

```ts
window.mactfs = {
  getToken(): Promise<string>
  selectDirectory(): Promise<string | null>
  getServiceStatus(): Promise<ServiceStatus>
}
```

不要把 `fs`、`child_process`、任意 shell 执行能力直接暴露给渲染进程。

### 4.3 React Route

`routes/home.tsx` 是第一版主入口：

- 初始化 health。
- 读取配置。
- 判断是否展示连接配置页或主工作台。
- 持有跨面板共享状态：
  - 当前 Collection
  - 当前 Workspace
  - mappings
  - 当前选中的 serverPath
  - 当前选中的文件 / diff 项
  - pending included / excluded

路由组件不直接写复杂 JSX，具体区域拆到 `components/app` 和业务组件。

### 4.4 API 层

API 层固定返回后端统一响应，不在组件里重复拼 `fetch`。

统一响应：

```ts
export interface ApiResult<TData> {
  success: boolean
  message: string
  errorMessage?: string
  operation: string
  startedAt: number
  endedAt: number
  durationMs: number
  logs: string[]
  data: TData
}
```

API client 职责：

- 从 preload 获取 Bearer token。
- 请求 `http://127.0.0.1:38765`。
- 自动设置 `Authorization: Bearer <token>`。
- 自动设置 JSON header。
- 返回 `ApiResult<T>`。
- 网络失败时返回统一的前端失败结果，供 UI 展示。

组件规则：

- 组件不直接读 token。
- 组件不直接写 `fetch`。
- 组件不猜测后端错误类型，只展示 `errorMessage || message`。

## 五、后端 API 对接规范

基础配置：

```text
Base URL: http://127.0.0.1:38765
Auth: Authorization: Bearer <token>
```

当前后端路由以 `MacTfsServer` 为准：

| 功能 | 方法 | 路径 | 前端 data 字段 |
|---|---|---|---|
| 健康检查 | GET | `/api/health` | `status`, `connected`, `tokenFile`, `configFile` |
| 读取配置 | GET | `/api/config` | `config` |
| 保存配置 | PUT | `/api/config` | `config` |
| 连接 TFS | POST | `/api/session/connect` | `serverUri`, `collectionCount` |
| Collection | GET | `/api/collections` | `collections` |
| 目录树 | GET | `/api/server-tree?path=...` | `path`, `items` |
| 目录文件 | GET | `/api/server-folder/items?path=...` | `path`, `items` |
| Workspace | GET | `/api/workspace` | `workspace`, `mappings` |
| 创建 Workspace | POST | `/api/workspace/ensure` | `workspace` |
| Mapping 列表 | GET | `/api/mappings` | `mappings` |
| 创建 Mapping | POST | `/api/mappings` | `mapping`, `getLatest` |
| 删除 Mapping | DELETE | `/api/mappings` | `mappings` |
| Get Latest | POST | `/api/files/get-latest` | `result` |
| Checkout | POST | `/api/files/checkout` | `result` |
| Add | POST | `/api/files/add` | `result` |
| Delete | POST | `/api/files/delete` | `result` |
| Undo | POST | `/api/files/undo` | `result` |
| Pending Changes | GET | `/api/pending-changes` | `pendingChanges` |
| Checkin | POST | `/api/checkin` | `checkin` |
| 目录对比 | POST | `/api/compare/folder` | `diffs` |
| 历史 | GET | `/api/history?path=...&folder=true|false` | `history` |
| Changeset 文件 | GET | `/api/history/changeset?changeset=...` | `files` |
| 本地 vs latest diff | POST | `/api/diff/local-latest` | `diff` |
| 历史版本 diff | POST | `/api/diff/revisions` | `diff` |
| 操作日志 | GET | `/api/logs` | `logs` |

常用类型字段：

```ts
export interface AppConfig {
  serverUri?: string
  authType: "ntlm-explicit"
  domain?: string
  username?: string
  password?: string
  collection?: string
  workspace?: string
  mappings: MappingConfig[]
}

export interface ServerItem {
  name: string
  path: string
  serverPath: string
  type: "folder" | "file"
  folder: boolean
  latestVersion: number
  checkinDate?: number
}

export interface MappingInfo {
  serverPath: string
  localPath: string
}

export interface PendingChangeInfo {
  serverPath: string
  localPath: string
  name: string
  folder: boolean
  status: TfsStatus
  changeType: string
  version: number
}

export interface FolderDiffItem {
  serverPath: string
  localPath: string
  name: string
  folder: boolean
  status: TfsStatus
  localVersion: number
  latestVersion: number
}
```

## 六、状态模型

### 6.1 App 状态

主工作台维护：

- `serviceStatus`
- `config`
- `collections`
- `selectedCollection`
- `workspace`
- `mappings`
- `selectedServerPath`

这些状态来源于 `/api/health`、`/api/config`、`/api/collections`、`/api/workspace`。

### 6.2 Explorer 状态

目录树：

- 以 `serverPath` 作为节点 key。
- 懒加载子节点。
- 未映射目录也允许浏览。
- 展开目录时调用 `/api/server-tree`。

文件列表：

- 选中左侧目录后调用 `/api/server-folder/items`。
- 结合 mappings 计算是否已映射和本地路径。
- 已映射但本地不存在时展示 `notDownloaded / 未下载`。

### 6.3 Mapping 状态

Mapping 创建流程：

```text
选中服务端目录
点击“映射到本地”
调用 preload selectDirectory
POST /api/mappings
询问是否立即 Get Latest
刷新 mappings、当前文件列表、操作日志
```

不做复杂 Mapping 编辑。删除 Mapping 属于后续按任务需要实现的操作入口。

### 6.4 Compare 状态

目录对比只允许已映射目录触发。

前端状态：

- `diffs`
- `selectedDiffKeys`
- `hideUpToDate = true`
- `compareLoading`

默认隐藏 `upToDate`，只展示差异。操作完成后提示用户重新对比或自动刷新当前对比列表，具体按任务实现范围决定。

### 6.5 Pending Changes 状态

右侧面板维护：

- `includedKeys`
- `excludedKeys`
- `pendingChanges`

规则：

- 后端返回的 pending changes 默认进入 Included。
- 用户移动到 Excluded 后只保存在当前 UI 会话。
- Checkin 只提交 Included。
- Checkin 成功后清空 Included，Excluded 继续保留到当前 UI 会话结束。

### 6.6 Operation 状态

每个主要区域只保留当前操作：

- `idle`
- `loading`
- `success`
- `error`

长耗时操作必须显示明确文案：

- 正在连接 TFS
- 正在查询目录
- 正在执行目录对比
- 正在获取最新
- 正在签入

第一版不做取消按钮。

## 七、TFS 状态与操作映射

状态文案统一放在 `app/lib/tfs/status.ts`。

```text
localModified  -> 本地修改
remoteChanged  -> 服务端有更新
bothChanged    -> 双边变更
localOnly      -> 本地新增
remoteOnly     -> 服务端新增
notDownloaded  -> 未下载
localDeleted   -> 本地删除
pendingEdit    -> 待签入编辑
pendingAdd     -> 待签入新增
pendingDelete  -> 待签入删除
pendingRename  -> 待签入重命名
pending        -> 待签入
upToDate       -> 最新
```

操作入口：

```text
localModified  -> checkout / diff
localOnly      -> add / delete local
localDeleted   -> delete / restore from server
remoteChanged  -> get latest / diff
notDownloaded  -> get latest
pendingEdit    -> checkin / undo / diff
pendingAdd     -> checkin / undo
pendingDelete  -> checkin / undo
bothChanged    -> diff / 手工处理
upToDate       -> 无主要操作
```

UI 不直接散落状态字符串判断。新增状态必须先补 `status.ts`，再接组件展示。

## 八、UI 风格规范

### 8.1 总体风格

参考 Finder、Xcode Source Control、Fork / SourceTree，优先 macOS 工作台效率：

- 信息密度高
- 面板边界清晰
- 控件安静克制
- shadcn/ui 作为组件基础
- macOS 原生工具软件气质
- 不做营销页
- 不做大 Hero
- 不做装饰性渐变和卡片堆叠
- 不使用大面积单一色调

第一屏就是可操作的 TFS 工作台或连接配置，不展示产品介绍页。

### 8.2 布局尺寸

推荐桌面布局：

```text
顶部工具栏：48-56px
左侧 Source List：260-320px
中间文件列表 / 对比 / 历史：自适应
右侧 Inspector / Pending：320-380px
底部 Console / 操作日志：150-220px，可折叠
```

窗口小于可用宽度时：

- 保持顶部和底部可读。
- 左右面板允许压缩到最小宽度。
- 中间列表横向滚动。
- 不把核心操作隐藏到不可发现的位置。

### 8.3 组件使用

- 按钮使用 shadcn `Button`。
- 图标使用 lucide-react。
- 文件操作按钮优先使用图标 + tooltip。
- 关键破坏性操作使用确认弹窗。
- 目录 checkout 必须二次确认影响数量。
- 状态用 badge，不用只靠颜色表达。
- 路径使用等宽字体并允许横向滚动。
- 列表行高保持 28-34px。
- 按钮高度保持 28-32px。
- 圆角控制在 6-8px。
- 表格列宽固定或可伸缩，不因加载文案导致布局跳动。

### 8.4 色彩语义

颜色只表达业务状态：

- `pendingEdit`：蓝色
- `pendingAdd` / 成功：绿色
- `pendingDelete` / 失败：红色
- `notDownloaded` / 等待：琥珀色
- `remoteChanged`：紫色或蓝紫色
- `bothChanged`：红色强调
- `upToDate`：中性灰

颜色通过 Tailwind token 或 CSS 变量实现，不在组件里硬编码大段自定义颜色。

### 8.5 文案

界面文案使用中文，接口字段和路径保持原始英文。

推荐文案：

- 连接 TFS
- 选择 Collection
- 当前 Workspace
- 映射到本地
- 获取最新
- 目录对比
- 挂起更改
- Included Changes
- Excluded Changes
- 签入注释
- 操作日志

错误信息优先展示后端返回的 TFS 原始错误，外层只补充当前操作上下文。

## 九、开发实现规范

### 9.1 TypeScript

- 保持 `strict: true`。
- API 响应类型放到 `app/lib/api/types.ts`。
- 业务组件 props 使用 interface。
- 不使用 `any` 承接后端响应，除非当前接口确实没有稳定结构。
- 不在组件里重复定义相同类型。

### 9.2 注释

遵守项目根目录规则：

- 新增函数必须有简短函数级注释。
- 修改核心逻辑时补充必要注释。
- 注释说明业务作用和约束，不重复代码表面意思。

### 9.3 样式

- 优先 Tailwind class。
- 复用 `cn` 合并 className。
- 通用 variant 用 `class-variance-authority`。
- 不新增全局样式，除非是全局 token、滚动条或布局基础样式。
- shadcn 组件保持生成风格，不混入业务逻辑。

### 9.4 数据刷新

操作后的最小刷新规则：

- 连接成功：刷新 config、collections。
- 选择 Collection：ensure workspace 后刷新 workspace、mappings、目录树根节点。
- 创建 Mapping：刷新 mappings 和当前目录文件列表。
- Get Latest：刷新当前目录文件列表和操作日志。
- Checkout/Add/Delete/Undo：刷新 pending changes；目录对比页提示重新对比或刷新 diffs。
- Checkin 成功：刷新 pending changes 和操作日志。
- History/Diff：只刷新当前面板数据。

### 9.5 错误处理

- API 失败统一展示 `errorMessage || message`。
- 组件内不要堆多层 try/catch。
- 不做 retry 机制，除非任务明确要求。
- 服务未启动时展示明确提示和重新检测入口。
- 长操作超时按后端返回展示，不在前端重复实现超时体系。

### 9.6 文件编辑流程

每次改代码前必须先执行：

```bash
chmod u+w <file>
```

或：

```bash
chmod 644 <file>
```

任务开发前必须读取：

- `docs/mactfs-api-product-prd.md`
- `task/README.md`
- `task/AI-RULES.md`
- 当前 task 文件
- 相关前端源码

前端任务默认验证：

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

涉及明显 UI 改动时，还要用浏览器或 Electron 实际看一遍布局，确认文字不重叠、主区域不空白、操作入口可见。

## 十、FE 任务落地顺序

严格按任务依赖推进，不跳过前置任务。

1. FE-001：Electron 启动服务、preload、API client。
2. FE-002：连接配置视图，成功后进入工作台。
3. FE-003：macOS Source Workspace 主布局。
4. FE-004：Collection 服务端目录树。
5. FE-005：当前目录文件列表。
6. FE-006：Mapping 创建流程。
7. FE-007：目录对比页面。
8. FE-008：Pending Changes 面板。
9. FE-009：文件操作交互。
10. FE-010：签入流程。
11. FE-011：历史记录界面。
12. FE-012：文件 Diff 界面。
13. FE-013：操作日志面板。

每个任务只做当前任务实现范围，不顺手扩展后续任务。

## 十一、验收基线

前端任一 P0 功能完成时，至少满足：

- `pnpm typecheck` 通过。
- 当前任务验收标准逐条可说明。
- API 调用带 Bearer token。
- 服务慢时有明确等待状态。
- 失败时显示可读错误。
- 操作后刷新对应区域或明确提示用户刷新。
- 不破坏现有 Electron 启动。
- 不引入与现有栈不一致的新框架。

## 十二、当前项目现状

当前 `mactfsui` 仍处于模板状态：

- `app/routes/home.tsx` 只有默认欢迎内容。
- `app/components/ui/button.tsx` 已有 shadcn Button。
- `electron/main.cjs` 只创建窗口，尚未启动 Java API 服务。
- 尚未实现 preload。
- 尚未实现 API client。
- 尚未实现业务布局和页面。

因此后续前端开发应从 FE-001 开始，先补齐 Electron 与 API 基础能力，再进入业务页面。
