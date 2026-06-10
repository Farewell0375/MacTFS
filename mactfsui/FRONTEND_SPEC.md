# macTFS 前端设计规范

## 一、文档定位

这份文档是当前分支唯一有效的前端设计规范。

用途：

- 定义前端阶段的交互设计和实现约束
- 作为 `task/frontend` 的设计基线
- 替代旧 `task/frontend-refactor` 中分散的方案文档

约束：

- 当前前端任务只看 `task/frontend`
- 旧 `UIR-*` 编号不再继续维护
- 如果后续要改前端方向，先改本文件，再改 `task/frontend`

## 二、项目定位

`mactfsui` 是 macTFS 的 Electron + React 桌面 UI。

它只负责：

- 本机桌面交互
- 状态展示
- 本地 API 调用

它不直接负责：

- TFS 协议实现
- 本机文件系统裸访问
- Java 进程细节控制

整体链路：

```text
Electron Renderer
  -> Electron Preload / Main
  -> http://127.0.0.1:38765/api/*
  -> mactfs-server
  -> mactfs-core
  -> TFS SDK
```

## 三、当前前端目标

第一版前端目标不是铺满所有能力，而是先实现一个围绕固定 Collection / Workspace 上下文展开的桌面工作台。

第一版要覆盖：

- 登录配置
- Collection 选择
- 默认 Workspace 自动使用 / 创建
- 左侧服务端目录树
- 中间当前目录文件列表
- Mapping
- 目录对比
- 文件查看
- Diff
- Get Latest / Checkout 冲突处理
- Pending Changes
- Checkin
- 操作日志

第一版不做：

- 多 Profile
- Work Item
- Check-in Policy UI
- 手动冲突块编辑
- 自定义布局
- 自动更新

## 四、关键设计结论

### 4.1 固定上下文

前端进入工作台后固定：

- `serverUri`
- `collection`
- `workspace`

规则：

- Collection 在登录页确认
- Workspace 不让用户手动选
- 工作台内不允许切换 Collection
- 需要切换 Collection 时，走重新连接流程

原因：

- TFS 的日常操作围绕单一 Workspace 展开
- 固定上下文能减少目录树、Mapping、Pending、History、Diff 的联动复杂度

### 4.2 三栏工作台

工作台采用固定三栏 + 底部台：

```text
┌──────────────────────────────────────────────────────────────┐
│ Top Bar: macTFS | Server | Collection | Workspace | Actions  │
├──────────────┬────────────────────────────────┬──────────────┤
│ Source Tree  │ Current Folder Items            │ Changes      │
│ collapsible  │ main workspace                  │ collapsible  │
├──────────────┴────────────────────────────────┴──────────────┤
│ Operation Console collapsible                                 │
└──────────────────────────────────────────────────────────────┘
```

职责：

- Top Bar：全局上下文与服务入口
- Source Tree：目录浏览
- Current Folder Items：主工作区
- Changes：Pending 与 Checkin
- Operation Console：日志与执行反馈

### 4.3 中间区域减负

中间区域只保留：

- 当前路径
- 当前目录 Mapping 摘要
- 文件 / 文件夹表格
- 选中项摘要

中间区域不再内嵌：

- Mapping 表单
- History 面板
- Diff 面板
- 目录对比结果大块内容
- 选中项底部操作区

### 4.4 对象操作入口

对象操作统一走右键菜单。

覆盖对象：

- 左侧目录树节点
- 中间文件列表行
- Pending Changes 项
- 目录对比结果项

不放到右键菜单的操作：

- Checkin
- 全局设置
- 连接重试
- 日志开关

### 4.5 弹窗承载策略

以下能力优先使用弹窗：

- Mapping
- History
- 目录对比
- 文件查看
- Diff
- 冲突处理

原因：

- 避免中间文件列表失控
- 让主工作区保持浏览优先
- 让复杂交互按场景进入

## 五、前端分层规范

### 5.1 Electron Main

职责：

- 创建主窗口
- 检查本地 API 服务
- 服务未启动时尝试拉起
- 读取 token 文件
- 打开目录选择器

约束：

- 不把任意 shell 能力直接暴露给渲染进程
- 不在渲染进程直接读 `~/.mactfs/server-token`

### 5.2 Electron Preload

preload 只暴露窄接口，例如：

```ts
window.mactfs = {
  getToken(): Promise<string>
  selectDirectory(): Promise<string | null>
  getServiceStatus(): Promise<ServiceStatus>
}
```

### 5.3 React Route

`routes/home.tsx` 是第一版主入口。

它负责：

- 初始化 health / config
- 管理连接态和工作台态切换
- 持有共享上下文状态
- 协调目录树、中间列表、弹窗、Pending、日志

### 5.4 API 层

API 层统一放在 `app/lib/api`。

要求：

- 组件不直接 `fetch`
- 组件不直接读 token
- 统一返回后端结构化结果
- 统一处理网络失败与后端失败

### 5.5 动作编排

对象动作由 `home.tsx` 或轻量 hook 编排。

原则：

- 不引入 Redux、Zustand、TanStack Query
- 只抽真实复用的 hook
- 不为了未来复用提前抽象复杂 service 层

## 六、推荐文件层级

```text
mactfsui/
  app/
    app.css
    root.tsx
    routes.ts
    routes/
      home.tsx
    components/
      app/
      explorer/
      inspector/
      logs/
      ui/
    hooks/
    lib/
      api/
      electron/
      tfs/
      utils.ts
  electron/
    main.cjs
    preload.cjs
```

规则：

- `routes` 只编排页面
- `components/ui` 只放基础 UI 组件
- 业务组件按域拆分
- `lib/tfs` 存放状态、动作和表现映射

## 七、后端接口对接规范

基础配置：

```text
Base URL: http://127.0.0.1:38765
Auth: Authorization: Bearer <token>
```

前端必须覆盖的接口：

| 功能 | 方法 | 路径 |
|---|---|---|
| 健康检查 | GET | `/api/health` |
| 配置读写 | GET / PUT | `/api/config` |
| 连接 | POST | `/api/session/connect` |
| Collection | GET | `/api/collections` |
| 目录树 | GET | `/api/server-tree` |
| 当前目录 | GET | `/api/server-folder/items` |
| Workspace | GET | `/api/workspace` |
| Workspace 上下文 | GET | `/api/workspace/context` |
| Mapping 目标预校验 | POST | `/api/mappings/check-target` |
| Mapping | GET / POST / DELETE | `/api/mappings` |
| Get Latest | POST | `/api/files/get-latest` |
| Checkout | POST | `/api/files/checkout` |
| Add | POST | `/api/files/add` |
| Delete | POST | `/api/files/delete` |
| Undo | POST | `/api/files/undo` |
| Pending Changes | GET | `/api/pending-changes` |
| Checkin | POST | `/api/checkin` |
| 文件内容 | GET | `/api/files/content` |
| 目录对比 | POST | `/api/compare/folder` |
| 历史 | GET | `/api/history` |
| Changeset 文件 | GET | `/api/history/changeset` |
| 本地 vs latest Diff | POST | `/api/diff/local-latest` |
| 历史版本 Diff | POST | `/api/diff/revisions` |
| 冲突明细 | GET | `/api/conflicts` |
| 冲突应用 | POST | `/api/conflicts/apply` |
| 操作日志 | GET | `/api/logs` |

## 八、页面与交互规范

### 8.1 登录页

流程：

1. 输入连接信息
2. 连接 TFS
3. 加载 Collection
4. 确认 Collection
5. 自动确保 Workspace
6. 进入工作台

要求：

- 配置可回填
- Collection 必须确认
- Workspace 不让用户手动选

### 8.2 左侧目录树

要求：

- 固定 Collection
- 懒加载
- 未映射目录也可浏览
- 支持右键菜单

### 8.3 中间文件列表

要求：

- 展示当前目录下一级内容
- 单击只选中
- 双击目录进入
- 与左侧树同步导航
- 展示映射状态和核心元数据

### 8.4 Mapping 弹窗

要求：

- 展示服务端路径
- 选择本地父目录
- 选择完成后调用本地后端预校验最终目标路径
- 最终映射路径以后端返回结果为准
- 如果最终目标目录已存在，弹窗内直接提示“已存在，禁止映射”，并禁用确认操作
- 支持是否立即 Get Latest
- 成功后刷新 mappings 和当前目录列表
- 成功后停留在当前浏览位置，不做跳转

### 8.5 History 弹窗

要求：

- 支持文件历史
- 支持目录历史
- 支持 changeset 文件列表
- 支持从历史进入 Diff

### 8.6 目录对比弹窗

要求：

- 默认隐藏 `upToDate`
- 支持状态筛选
- 结果项走右键菜单
- 支持刷新和重新对比

### 8.7 文件查看与 Diff

要求：

- 文件查看支持本地 / 服务器内容
- Diff 支持本地 vs latest、历史 vs 历史
- 支持搜索、行号、差异高亮
- 大文件、二进制、非 Mapping 路径必须提示

### 8.8 冲突弹窗

要求：

- Get Latest 和 Checkout 复用
- 支持批量选择
- 支持逐文件选择
- 支持从冲突项进入 Diff
- 第一版不做手动冲突块编辑

### 8.9 Pending Changes 与 Checkin

要求：

- 右侧 Changes 保留为主入口
- 支持 Included / Excluded
- Pending Changes 项支持右键菜单
- Checkin comment 必填
- Checkin 成功后刷新 Pending 和目录状态

### 8.10 操作日志

要求：

- 底部可收起
- 显示主要操作
- 显示耗时和错误摘要
- 长操作期间有明确执行中文案

## 九、状态与动作模型

### 9.1 共享状态

主工作台至少维护：

- `serviceStatus`
- `config`
- `selectedCollection`
- `workspace`
- `mappings`
- `selectedServerPath`
- `pendingChanges`
- `includedKeys`
- `excludedKeys`

### 9.2 状态文案

状态统一收口到 `app/lib/tfs/status.ts` 或等价文件。

至少覆盖：

```text
localModified
remoteChanged
bothChanged
localOnly
remoteOnly
notDownloaded
localDeleted
pendingEdit
pendingAdd
pendingDelete
pending
upToDate
```

### 9.3 刷新规则

最小刷新规则：

- 连接成功：刷新 config、collections
- 确认 Collection：刷新 workspace、mappings、目录树根
- 创建 Mapping：刷新 mappings 和当前目录
- 取消 Mapping：刷新 mappings 和当前目录，停留在当前浏览位置
- Get Latest：刷新当前目录和日志
- Checkout / Add / Delete / Undo：刷新 pending changes
- Checkin：刷新 pending changes、当前目录、必要时刷新树节点

## 十、视觉与文案规范

### 10.1 风格

参考：

- Finder
- Xcode Source Control
- Fork / SourceTree

要求：

- 高信息密度
- 工具型而不是营销型
- 边界清晰
- 控件克制

### 10.2 布局尺寸建议

- 顶部：48-56px
- 左侧：260-320px
- 右侧：320-380px
- 底部：150-220px

### 10.3 文案

界面文案用中文。

推荐：

- 连接 TFS
- 选择 Collection
- 当前 Workspace
- 映射到本地
- 获取最新
- 目录对比
- 挂起更改
- 签入注释
- 操作日志

## 十一、开发实现规范

### 11.1 TypeScript

- 保持 `strict: true`
- 不在组件里重复定义相同响应类型
- 尽量不使用 `any`

### 11.2 注释

- 新增函数必须有函数级注释
- 核心逻辑修改要补必要注释

### 11.3 样式

- 优先 Tailwind
- 复用 `cn`
- 不新增不必要的全局样式

### 11.4 错误处理

- 统一展示 `errorMessage || message`
- 不堆多层 try/catch
- 不默认做 retry

### 11.5 文件权限

改代码前必须先执行：

```bash
chmod u+w <file>
```

或：

```bash
chmod 644 <file>
```

## 十二、前端阶段任务映射

当前前端阶段任务按以下顺序推进：

1. `FE-001`：Electron、preload、API client
2. `FE-002`：前端集成所需服务端接口与类型契约
3. `FE-003`：连接页、Collection 选择、Workspace 上下文
4. `FE-004`：工作台布局、折叠面板、同步导航
5. `FE-005`：目录树与当前目录列表
6. `FE-006`：对象右键菜单与动作模型
7. `FE-007`：Mapping、History、目录对比弹窗
8. `FE-008`：文件查看与 Diff 弹窗
9. `FE-009`：Get Latest 与 Checkout 冲突处理
10. `FE-010`：Pending Changes 与 Checkin
11. `FE-011`：FolderItemsPanel 拆分与动作收口
12. `FE-012`：操作日志与刷新反馈
13. `FE-013`：前端阶段联调验收基线

## 十三、当前分支现状

`FE-001` 至 `FE-012` 已完成，前端基础设施、接口契约、连接入口、工作台骨架、目录浏览、对象右键菜单、业务弹窗（Mapping / History / 目录对比 / 文件查看 / Diff / 冲突处理）、Get Latest / Checkout 执行链、Pending / Checkin 体验、动作编排收口与操作日志面板已就绪：

- `electron/main.cjs` 已补齐服务检测、按本地开发约定拉起服务、token 读取与目录选择
- `electron/preload.cjs` 已落地，通过 `contextBridge` 暴露 `window.mactfs` 窄接口
- `app/lib/electron` 已提供渲染层桥接（含非 Electron / SSR 兜底）
- `app/lib/api/client.ts` 已提供统一 API client（自动携带 Bearer token、统一错误处理）
- `app/lib/api/types.ts` 已补齐前端统一领域类型契约
- `app/lib/api/endpoints.ts` 已封装全部工作台所需接口（含 workspace/context、mappings/check-target、files/content、conflicts）
- 服务端已补齐 `GET /api/workspace/context`、`POST /api/mappings/check-target`、`GET /api/files/content`、`GET /api/conflicts`、`POST /api/conflicts/apply`
- `app/components/app/connect-view.tsx` 已实现连接表单、Collection 选择与确保默认 Workspace
- `app/components/app/workspace-shell.tsx` 已实现三栏工作台外壳，左 / 右 / 底面板支持折叠
- `app/components/app/top-bar.tsx` 已实现顶部上下文栏（Server / Collection / Workspace + 面板开关 + 重新连接）
- `app/components/explorer/source-tree-panel.tsx` 已实现目录树懒加载与同步展开；`folder-items-panel.tsx` 已实现当前目录文件列表（状态 / 版本 / 时间 / 本地路径，单击选中、双击进入）
- `app/components/inspector/changes-panel.tsx` 已实现 Included / Excluded 分组、comment 必填校验与签入（成功展示 changeset 并刷新挂起 / 目录）；`app/components/logs/console-panel.tsx` 已实现操作日志面板（成败 / 耗时 / 错误摘要、随操作自动刷新、执行中提示）
- `app/lib/tfs` 已沉淀 `session.ts`（固定上下文、`SERVER_ROOT_PATH`）、`path.ts`（路径工具）、`mapping.ts`（本地路径推导）、`status.ts`（状态文案与配色收口）、`actions.ts`（FileTarget / 菜单生成与置灰规则）及 `index.ts` 出口
- `app/components/app/file-target-menu.tsx` 提供统一右键菜单容器；树、列表、Pending 项共用同一套动作模型
- `workspace-shell.tsx` 持有 pendingChanges 共享状态并集中分发对象动作，已实现「取消映射」（不跳转浏览位置）与 Mapping / History / 目录对比弹窗编排
- `app/components/explorer/mapping-dialog.tsx`（父目录选择 + 后端预校验 + 已存在禁止映射 + 可选立即 Get Latest）、`history-dialog.tsx`（文件 / 目录历史、changeset 下钻、版本勾选进入 Diff）、`compare-dialog.tsx`（默认隐藏 upToDate、状态筛选、重新对比、结果项右键菜单）已落地
- `app/components/explorer/file-view-dialog.tsx`（本地 / 服务器 latest 切换、行号、搜索、二进制 / 超大提示）与 `diff-dialog.tsx`（本地 vs latest、历史版本对比、双行号、差异高亮、仅看差异）已落地
- Electron 桥已含 `pathsExist` 本地存在性批量检测，用于「已映射未下载」状态
- `home.tsx` 已编排 检测服务 → 连接 → 工作台 的视图状态机，统一维护 `selectedServerPath` 与 mappings 更新

- `app/components/explorer/conflict-dialog.tsx`（逐项 / 批量取舍、冲突 Diff、应用后自动刷新）与 `workspace-shell.tsx` 的 `runGetLatest` / `runCheckout`（签出自动先取最新、冲突自动进弹窗、顶部通知条反馈）已落地
- 对象动作中 unmap / getLatest / checkout / delete / undo / checkin 均已实际执行并按 9.3 规则刷新
- 动作编排已收口：`app/hooks/use-pending-changes.ts`（挂起更改共享状态）、`app/hooks/use-file-actions.ts`（弹窗开关 + 动作执行 + 通知），`workspace-shell.tsx` 仅负责组合，业务弹窗统一由 `app/components/app/workspace-dialogs.tsx` 渲染

仍未完成：

- 前端阶段联调验收基线（FE-013，需要真实 TFS 环境联调）

因此当前前端开发应从 `FE-013` 继续推进，不再参考旧分支“已经做完”的状态来判断进度。
