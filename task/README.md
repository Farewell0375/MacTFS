# macTFS 开发任务看板

## 使用规则

- 每次开发任务前，AI 必须先读取 [AI-RULES.md](/Users/fenghp/Desktop/DEV/project/mydev/task/AI-RULES.md)。
- 每次开发任务前，AI 必须读取 [mactfs-api-product-prd.md](/Users/fenghp/Desktop/DEV/project/mydev/docs/mactfs-api-product-prd.md)。
- 每次开发任务前，AI 必须读取当前任务文件。
- 开始任务时，将任务状态改为 `doing`。
- 完成任务后，将任务状态改为 `done`，填写完成记录，并更新本看板。
- 阻塞任务必须标记为 `blocked`，并写清阻塞原因和需要的输入。

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
| Frontend | 13 | 13 | 100% |
| Frontend Refactor | 0 | 10 | 0% |
| Feature E2E | 0 | 5 | 0% |
| Release | 0 | 4 | 0% |
| Overall | 37 | 56 | 66% |

## 当前阶段

Frontend Refactor

## 下一步任务

- [UIR-001-补齐后端接口能力.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-001-补齐后端接口能力.md)

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
| [FE-001-实现Electron启动服务与API客户端.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-001-实现Electron启动服务与API客户端.md) | done | P0 |
| [FE-002-实现登录配置页.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-002-实现登录配置页.md) | done | P0 |
| [FE-003-实现VS风格主布局.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-003-实现VS风格主布局.md) | done | P0 |
| [FE-004-实现Collection服务端目录树.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-004-实现Collection服务端目录树.md) | done | P0 |
| [FE-005-实现中间目录文件列表.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-005-实现中间目录文件列表.md) | done | P0 |
| [FE-006-实现Mapping创建流程.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-006-实现Mapping创建流程.md) | done | P0 |
| [FE-007-实现目录对比页面.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-007-实现目录对比页面.md) | done | P0 |
| [FE-008-实现右侧挂起更改面板.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-008-实现右侧挂起更改面板.md) | done | P0 |
| [FE-009-实现文件操作交互.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-009-实现文件操作交互.md) | done | P0 |
| [FE-010-实现签入流程.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-010-实现签入流程.md) | done | P0 |
| [FE-011-实现历史记录界面.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-011-实现历史记录界面.md) | done | P0 |
| [FE-012-实现文件Diff界面.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-012-实现文件Diff界面.md) | done | P0 |
| [FE-013-实现操作日志面板.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-013-实现操作日志面板.md) | done | P1 |

## Frontend Refactor

| 任务 | 状态 | 优先级 |
|---|---|---|
| [UIR-001-补齐后端接口能力.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-001-补齐后端接口能力.md) | todo | P0 |
| [UIR-002-重构登录Collection与Workspace上下文.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-002-重构登录Collection与Workspace上下文.md) | todo | P0 |
| [UIR-003-重构工作台布局与同步导航.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-003-重构工作台布局与同步导航.md) | todo | P0 |
| [UIR-004-实现对象右键菜单.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-004-实现对象右键菜单.md) | todo | P0 |
| [UIR-005-实现MappingHistoryCompare弹窗.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-005-实现MappingHistoryCompare弹窗.md) | todo | P0 |
| [UIR-006-实现文件查看与Diff编辑器.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-006-实现文件查看与Diff编辑器.md) | todo | P0 |
| [UIR-007-实现GetLatestCheckout冲突流程.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-007-实现GetLatestCheckout冲突流程.md) | todo | P0 |
| [UIR-008-重构PendingChanges与Checkin体验.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-008-重构PendingChanges与Checkin体验.md) | todo | P0 |
| [UIR-009-拆分FolderItemsPanel与动作编排.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-009-拆分FolderItemsPanel与动作编排.md) | todo | P1 |
| [UIR-010-前端重构端到端验收.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-010-前端重构端到端验收.md) | todo | P0 |

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
