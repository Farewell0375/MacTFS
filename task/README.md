# macTFS 开发任务看板

## 使用规则

- 每次开发任务前，AI 必须先读取 [AI-RULES.md](/Users/fenghp/Desktop/DEV/project/mydev/task/AI-RULES.md)。
- 每次开发任务前，AI 必须读取 [mactfs-api-product-prd.md](/Users/fenghp/Desktop/DEV/project/mydev/docs/mactfs-api-product-prd.md)。
- 前端相关任务还必须读取 [mactfsui/FRONTEND_SPEC.md](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/FRONTEND_SPEC.md)。
- 每次开发任务前，AI 必须读取当前任务文件。
- 开始任务时，将任务状态改为 `doing`。
- 完成任务后，将任务状态改为 `done`，填写完成记录，并更新本看板。
- 阻塞任务必须标记为 `blocked`，并写清阻塞原因和需要的输入。

说明：

- `task/frontend` 是当前唯一有效的前端阶段目录。
- `task/frontend-refactor` 已归档，设计结论已并入 `task/frontend` 和 `mactfsui/FRONTEND_SPEC.md`。

## 状态枚举

```text
todo
doing
done
blocked
```

## 总进度

| 模块 | done | total | progress |
|---|---:|---:|---:|
| Core | 12 | 12 | 100% |
| Server API | 10 | 10 | 100% |
| CLI | 2 | 2 | 100% |
| Frontend | 30 | 34 | 88% |
| Feature E2E | 0 | 5 | 0% |
| Release | 0 | 4 | 0% |
| Overall | 54 | 67 | 81% |

## 当前阶段

UI 风格改版·macOS 原生风方案（分支 `feature/ui-macos-restyle`，FE-026 ~ FE-034，需求见 [docs/mactfs-ui-restyle-requirements.md](/Users/fenghp/Desktop/DEV/project/mydev/docs/mactfs-ui-restyle-requirements.md)；姊妹分支 `feature/ui-modern-restyle` 做 Codex/CC Switch 现代工具风方案，两套并行对比）

## 前端规范

- [mactfsui/FRONTEND_SPEC.md](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/FRONTEND_SPEC.md)

## 下一步任务

- [FE-031-弹窗体系统一macOS风格.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-031-弹窗体系统一macOS风格.md)
- UI 改版完成后再回到 [FEATURE-001-连接与目录浏览端到端验收.md](/Users/fenghp/Desktop/DEV/project/mydev/task/feature/FEATURE-001-连接与目录浏览端到端验收.md)（需要真实 TFS 环境）

## Core

| 任务 | 状态 | 优先级 |
|---|---|---|
| [CORE-001-抽离核心服务层.md](/Users/fenghp/Desktop/DEV/project/mydev/task/core/CORE-001-抽离核心服务层.md) | done | P0 |
| [CORE-002-实现连接认证与配置模型.md](/Users/fenghp/Desktop/DEV/project/mydev/task/core/CORE-002-实现连接认证与配置模型.md) | done | P0 |
| [CORE-003-实现Collection与目录浏览.md](/Users/fenghp/Desktop/DEV/project/mydev/task/core/CORE-003-实现Collection与目录浏览.md) | done | P0 |
| [CORE-004-实现Workspace与Mapping管理.md](/Users/fenghp/Desktop/DEV/project/mydev/task/core/CORE-004-实现Workspace与Mapping管理.md) | done | P0 |
| [CORE-005-实现GetLatest能力.md](/Users/fenghp/Desktop/DEV/project/mydev/task/core/CORE-005-实现GetLatest能力.md) | done | P0 |
| [CORE-006-实现PendingChanges查询与状态模型.md](/Users/fenghp/Desktop/DEV/project/mydev/task/core/CORE-006-实现PendingChanges查询与状态模型.md) | done | P0 |
| [CORE-007-实现签出新增删除撤销.md](/Users/fenghp/Desktop/DEV/project/mydev/task/core/CORE-007-实现签出新增删除撤销.md) | done | P0 |
| [CORE-008-实现签入能力.md](/Users/fenghp/Desktop/DEV/project/mydev/task/core/CORE-008-实现签入能力.md) | done | P0 |
| [CORE-009-实现目录对比能力.md](/Users/fenghp/Desktop/DEV/project/mydev/task/core/CORE-009-实现目录对比能力.md) | done | P0 |
| [CORE-010-实现历史查询能力.md](/Users/fenghp/Desktop/DEV/project/mydev/task/core/CORE-010-实现历史查询能力.md) | done | P0 |
| [CORE-011-实现文件内容与Diff能力.md](/Users/fenghp/Desktop/DEV/project/mydev/task/core/CORE-011-实现文件内容与Diff能力.md) | done | P0 |
| [CORE-012-实现异常超时与日志模型.md](/Users/fenghp/Desktop/DEV/project/mydev/task/core/CORE-012-实现异常超时与日志模型.md) | done | P1 |

## Server API

| 任务 | 状态 | 优先级 |
|---|---|---|
| [SERVER-001-创建本地API服务.md](/Users/fenghp/Desktop/DEV/project/mydev/task/server/SERVER-001-创建本地API服务.md) | done | P0 |
| [SERVER-002-实现Token认证与健康检查.md](/Users/fenghp/Desktop/DEV/project/mydev/task/server/SERVER-002-实现Token认证与健康检查.md) | done | P0 |
| [SERVER-003-实现配置读写API.md](/Users/fenghp/Desktop/DEV/project/mydev/task/server/SERVER-003-实现配置读写API.md) | done | P0 |
| [SERVER-004-实现连接会话API.md](/Users/fenghp/Desktop/DEV/project/mydev/task/server/SERVER-004-实现连接会话API.md) | done | P0 |
| [SERVER-005-实现Collection与目录API.md](/Users/fenghp/Desktop/DEV/project/mydev/task/server/SERVER-005-实现Collection与目录API.md) | done | P0 |
| [SERVER-006-实现Workspace与MappingAPI.md](/Users/fenghp/Desktop/DEV/project/mydev/task/server/SERVER-006-实现Workspace与MappingAPI.md) | done | P0 |
| [SERVER-007-实现文件操作API.md](/Users/fenghp/Desktop/DEV/project/mydev/task/server/SERVER-007-实现文件操作API.md) | done | P0 |
| [SERVER-008-实现目录对比API.md](/Users/fenghp/Desktop/DEV/project/mydev/task/server/SERVER-008-实现目录对比API.md) | done | P0 |
| [SERVER-009-实现历史与DiffAPI.md](/Users/fenghp/Desktop/DEV/project/mydev/task/server/SERVER-009-实现历史与DiffAPI.md) | done | P0 |
| [SERVER-010-实现操作日志与超时.md](/Users/fenghp/Desktop/DEV/project/mydev/task/server/SERVER-010-实现操作日志与超时.md) | done | P1 |

## CLI

| 任务 | 状态 | 优先级 |
|---|---|---|
| [CLI-001-改造CLI调用本地API.md](/Users/fenghp/Desktop/DEV/project/mydev/task/cli/CLI-001-改造CLI调用本地API.md) | done | P1 |
| [CLI-002-实现Token与调试命令.md](/Users/fenghp/Desktop/DEV/project/mydev/task/cli/CLI-002-实现Token与调试命令.md) | done | P1 |

## Frontend

| 任务 | 状态 | 优先级 |
|---|---|---|
| [FE-001-实现Electron启动服务Preload与API客户端.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-001-实现Electron启动服务Preload与API客户端.md) | done | P0 |
| [FE-002-补齐前端集成所需服务端接口与类型契约.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-002-补齐前端集成所需服务端接口与类型契约.md) | done | P0 |
| [FE-003-实现连接页Collection选择与Workspace上下文.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-003-实现连接页Collection选择与Workspace上下文.md) | done | P0 |
| [FE-004-实现工作台布局折叠面板与同步导航.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-004-实现工作台布局折叠面板与同步导航.md) | done | P0 |
| [FE-005-实现服务端目录树与当前目录文件列表.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-005-实现服务端目录树与当前目录文件列表.md) | done | P0 |
| [FE-006-实现对象右键菜单与通用动作模型.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-006-实现对象右键菜单与通用动作模型.md) | done | P0 |
| [FE-007-实现MappingHistory与目录对比弹窗.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-007-实现MappingHistory与目录对比弹窗.md) | done | P0 |
| [FE-008-实现文件查看与Diff弹窗.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-008-实现文件查看与Diff弹窗.md) | done | P0 |
| [FE-009-实现GetLatest与Checkout冲突处理.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-009-实现GetLatest与Checkout冲突处理.md) | done | P0 |
| [FE-010-实现PendingChanges与Checkin体验.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-010-实现PendingChanges与Checkin体验.md) | done | P0 |
| [FE-011-拆分FolderItemsPanel与收口动作编排.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-011-拆分FolderItemsPanel与收口动作编排.md) | done | P1 |
| [FE-012-实现操作日志面板与刷新反馈.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-012-实现操作日志面板与刷新反馈.md) | done | P1 |
| [FE-013-前端阶段联调验收基线.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-013-前端阶段联调验收基线.md) | done | P0 |
| [FE-014-实现安全获取与强制获取及指定版本.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-014-实现安全获取与强制获取及指定版本.md) | done | P0 |
| [FE-015-完善历史与对比结果的对象操作.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-015-完善历史与对比结果的对象操作.md) | done | P0 |
| [FE-016-优化Diff与历史弹窗体验.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-016-优化Diff与历史弹窗体验.md) | done | P1 |
| [FE-017-实现工作台手动刷新.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-017-实现工作台手动刷新.md) | done | P1 |
| [FE-018-Diff弹窗替换为MonacoDiffEditor.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-018-Diff弹窗替换为MonacoDiffEditor.md) | done | P1 |
| [FE-019-实现对象属性与获取特定版本.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-019-实现对象属性与获取特定版本.md) | done | P0 |
| [FE-020-实现重命名.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-020-实现重命名.md) | done | P0 |
| [FE-021-实现变更集回滚.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-021-实现变更集回滚.md) | done | P1 |
| [FE-022-实现工作区与Mapping集中管理.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-022-实现工作区与Mapping集中管理.md) | done | P1 |
| [FE-023-实现分支.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-023-实现分支.md) | done | P1 |
| [FE-024-实现合并.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-024-实现合并.md) | done | P1 |
| [FE-025-实现访达打开与添加本地文件.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-025-实现访达打开与添加本地文件.md) | done | P0 |
| [FE-026-建立macOS设计基建.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-026-建立macOS设计基建.md) | done | P0 |
| [FE-027-Electron窗口macOS化.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-027-Electron窗口macOS化.md) | done | P0 |
| [FE-028-重设计登录页.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-028-重设计登录页.md) | done | P0 |
| [FE-029-工作台外壳与顶栏改版.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-029-工作台外壳与顶栏改版.md) | done | P0 |
| [FE-030-目录树与文件列表精致化.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-030-目录树与文件列表精致化.md) | done | P0 |
| [FE-031-弹窗体系统一macOS风格.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-031-弹窗体系统一macOS风格.md) | todo | P1 |
| [FE-032-操作反馈与微交互.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-032-操作反馈与微交互.md) | todo | P1 |
| [FE-033-明暗主题跟随系统.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-033-明暗主题跟随系统.md) | todo | P1 |
| [FE-034-UI改版回归验收.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-034-UI改版回归验收.md) | todo | P0 |

## Feature E2E

| 任务 | 状态 | 优先级 |
|---|---|---|
| [FEATURE-001-连接与目录浏览端到端验收.md](/Users/fenghp/Desktop/DEV/project/mydev/task/feature/FEATURE-001-连接与目录浏览端到端验收.md) | todo | P0 |
| [FEATURE-002-Mapping与GetLatest端到端验收.md](/Users/fenghp/Desktop/DEV/project/mydev/task/feature/FEATURE-002-Mapping与GetLatest端到端验收.md) | todo | P0 |
| [FEATURE-003-目录对比与差异处理端到端验收.md](/Users/fenghp/Desktop/DEV/project/mydev/task/feature/FEATURE-003-目录对比与差异处理端到端验收.md) | todo | P0 |
| [FEATURE-004-PendingChanges与Checkin端到端验收.md](/Users/fenghp/Desktop/DEV/project/mydev/task/feature/FEATURE-004-PendingChanges与Checkin端到端验收.md) | todo | P0 |
| [FEATURE-005-History与Diff端到端验收.md](/Users/fenghp/Desktop/DEV/project/mydev/task/feature/FEATURE-005-History与Diff端到端验收.md) | todo | P0 |

## Release

| 任务 | 状态 | 优先级 |
|---|---|---|
| [RELEASE-001-运行环境与JDK配置.md](/Users/fenghp/Desktop/DEV/project/mydev/task/release/RELEASE-001-运行环境与JDK配置.md) | todo | P0 |
| [RELEASE-002-打包Electron桌面应用.md](/Users/fenghp/Desktop/DEV/project/mydev/task/release/RELEASE-002-打包Electron桌面应用.md) | todo | P0 |
| [RELEASE-003-编写README与调试说明.md](/Users/fenghp/Desktop/DEV/project/mydev/task/release/RELEASE-003-编写README与调试说明.md) | todo | P0 |
| [RELEASE-004-日志导出与故障排查.md](/Users/fenghp/Desktop/DEV/project/mydev/task/release/RELEASE-004-日志导出与故障排查.md) | todo | P1 |
