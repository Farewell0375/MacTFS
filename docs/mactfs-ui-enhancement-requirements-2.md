# macTFS 工作台增强需求·第二批（属性 / 重命名 / 回滚 / 工作区管理 / 分支合并）

## 一、背景

第一批增强（FE-014 ~ FE-017，见 [mactfs-ui-enhancement-requirements.md](/Users/fenghp/Desktop/DEV/project/mydev/docs/mactfs-ui-enhancement-requirements.md)）
完成后，用户继续按 Visual Studio Source Control Explorer 的日常用法试用工作台，
提出第二批功能缺口。本文档收口这批需求，作为 `task/frontend` 中 FE-019 ~ FE-024 的需求来源。

## 二、用户反馈原文与解读

### 2.1 选中文件 / 文件夹缺少「高级」能力

- 原文：选中文件和文件夹的时候，需要一个高级功能。高级功能至少有属性：显示服务器地址、本地地址。
  还有获取特定版本功能，根据历史变更集，获取这个变更集的内容（相当于整体代码回滚到这个变更集提交的时候）。
- 解读：
  - 「属性」对应 VS 的 Properties 面板：展示服务器路径、本地路径、映射状态、挂起状态、最新版本号等
  - 「获取特定版本」对应 VS 的 Get Specific Version 对话框：不必先打开历史弹窗，
    右键即可选择 / 输入 changeset，把该对象（含目录递归）的本地内容切到那个版本
  - 与 FE-014 已实现的「历史弹窗 → 获取此版本」互补：那是从历史入口走，这次要求从对象右键直达，
    并提供 changeset 选择器

### 2.2 缺少重命名、回滚

- 原文：缺少重命名、回滚等功能。
- 解读：
  - 重命名 = TFS pendRename：产生 rename 挂起更改，签入后服务器生效
  - 回滚 = TFS Rollback：把某个 changeset 的改动反做（或回滚到某 changeset 之后的全部改动反做），
    产生挂起更改，由用户审查后签入，区别于 2.1 的「获取特定版本」（后者只动本地工作区不产生挂起更改）

### 2.3 缺少工作区集中管理

- 原文：缺少管理工作区的功能。一个工作区下有很多 mapping，肯定是需要一个集中管理的地方，比如删除或者修改。
- 解读：对应 VS 的 Manage Workspaces / Edit Workspace 对话框。当前 mapping 只能在目录树逐个右键
  「映射 / 取消映射」，需要一个集中入口：查看 workspace 信息 + 全部 mapping 列表，支持新增、删除、修改本地路径。

### 2.4 缺少分支与合并

- 原文：缺少分支和合并的功能。
- 解读：对应 VS 的 Branch / Merge：
  - 分支：把源路径在服务器上分叉出目标路径（pendBranch + 签入）
  - 合并：把源分支的 changeset 合并到目标分支，冲突进入冲突处理，结果是挂起更改，审查后签入

## 三、可行性盘点（现状 → 需要补什么）

| 能力 | TFS SDK 支持 | core 现状 | server 现状 | 前端现状 | 结论 |
|---|---|---|---|---|---|
| 属性（服务器/本地路径等） | `VersionControlClient.getItem` | 路径推导已有（mapping.ts） | 缺 item 详情接口 | 缺属性弹窗 | 主要是前端 + 1 个轻量接口 |
| 获取特定版本 | `ChangesetVersionSpec` | 已有 `getVersion`（FE-014） | 已有 `/api/files/get-version` | 仅历史弹窗入口 | 纯前端（右键直达 + 版本选择器） |
| 重命名 | `Workspace.pendRename` | 缺 | 缺 | 缺 | 全链路新增 |
| 回滚 | `Workspace.rollback`（RollbackOptions） | 缺 | 缺 | 缺 | 全链路新增 |
| 工作区管理 | `Workspace.update` / 现有 mapping API | mapping 增删已有 | `GET/POST/DELETE /api/mappings` 已有 | 仅目录树右键 | 主要是前端集中管理弹窗 |
| 分支 | `Workspace.pendBranch` / `createBranch` | 缺 | 缺 | 缺 | 全链路新增 |
| 合并 | `Workspace.merge` + `getMergeCandidates`；冲突复用 `listConflicts/applyConflict` | 缺 merge | 缺 | 冲突弹窗已有 | 全链路新增，冲突流程复用 |

SDK 均为 `com.microsoft.tfs.sdk-14.0.1.jar` 已验证存在的公开方法，无协议层风险。

## 四、需求定义

### R5 对象属性与获取特定版本（FE-019，P0）

- 右键菜单新增「属性…」与「获取特定版本…」（文件与目录均有）
- 属性弹窗内容：
  - 服务器路径、本地路径（未映射明确显示「未映射」）
  - 对象类型（文件 / 目录）、映射状态、挂起状态
  - 服务器侧最新 changeset、签入时间、签入人（来自新增 item 详情接口）
  - 文件补充：大小、编码（SDK item 信息自带）
- 获取特定版本弹窗：
  - changeset 输入框 + 「从历史选择…」（内嵌该对象历史列表，点选回填）
  - 明确提示：会覆盖该对象本地内容（目录为递归覆盖），等价整体切到该变更集时刻
  - 确认后调用既有 `/api/files/get-version`，完成后刷新目录列表与挂起更改
- server 新增 `GET /api/items/info?serverPath=`（item 详情，供属性弹窗）

### R6 重命名（FE-020，P0）

- core 新增 `rename(serverPath, newName)`：`Workspace.pendRename`，要求对象已映射
- server 新增 `POST /api/files/rename`
- 前端：
  - 右键「重命名…」弹窗：输入新名称，前端校验（非空、不含 `/ \ : * ? " < > |`、与原名不同）
  - 产生 rename 挂起更改：挂起面板显示「旧名 → 新名」，可 undo 撤销，checkin 后生效
  - 完成后刷新目录树、列表与挂起更改

### R7 回滚（FE-021，P1）

- core 新增 `rollback(serverPath, mode, changeset)`：
  - `single`：仅反做该 changeset（VS Rollback Entire Changeset）
  - `toVersion`：反做该 changeset 之后的全部改动（VS Rollback to a Specific Version）
- server 新增 `POST /api/files/rollback`
- 前端：
  - 历史弹窗记录行新增「回滚此变更集…」「回滚到此变更集…」（带确认弹窗，说明只产生挂起更改不会直接入库）
  - 回滚产生冲突时进入既有冲突弹窗
  - 完成后刷新挂起更改，由用户审查并签入

### R8 工作区与 Mapping 集中管理（FE-022，P1）

- 顶栏新增「工作区」入口，打开集中管理弹窗：
  - 工作区信息：名称、Owner、Computer、服务器、Collection
  - Mapping 列表：服务器路径、本地路径、本地目录是否存在
  - 操作：新增（复用既有映射弹窗逻辑）、删除（确认弹窗，说明不会删除本地文件）、
    修改本地路径（实现为删旧 + 加新，提示将重新获取）
- server 复用既有 `GET/POST/DELETE /api/mappings`，不强制新增接口

### R9 分支（FE-023，P1）

- core 新增 `branch(sourceServerPath, targetServerPath, changeset?)`：`pendBranch`（默认 latest，可指定 changeset）
- server 新增 `POST /api/files/branch`
- 前端：
  - 右键「分支…」弹窗：默认目标 `源路径-branch`，可编辑；可选基于指定 changeset
  - 产生 branch 挂起更改，审查后签入；完成后刷新目录树
- 目标路径父目录必须已映射（pendBranch 需要本地落盘），未满足时弹窗给出明确提示

### R10 合并（FE-024，P1）

- core 新增：
  - `mergeCandidates(source, target)`：`getMergeCandidates`，返回待合并 changeset 列表
  - `merge(source, target, changeset?)`：默认合并全部候选，可指定单个 changeset
- server 新增 `GET /api/files/merge-candidates`、`POST /api/files/merge`
- 前端：
  - 右键「合并…」向导弹窗：源（当前对象）→ 目标路径（必须已映射）；
    展示候选 changeset 列表，支持「全部合并」或选择单个
  - 冲突进入既有冲突弹窗；结果为挂起更改，审查后签入
  - 完成后刷新挂起更改

## 五、优先级与排期建议

| 任务 | 内容 | 优先级 | 理由 |
|---|---|---|---|
| FE-019 | 属性 + 获取特定版本 | P0 | 用户明确点名；后端基本就绪，见效最快 |
| FE-020 | 重命名 | P0 | 日常高频操作，缺失影响基本可用性 |
| FE-021 | 回滚 | P1 | 重要但低频，依赖挂起更改/冲突链路已稳定 |
| FE-022 | 工作区管理 | P1 | 提升管理效率，API 已就绪纯前端 |
| FE-023 | 分支 | P1 | 团队工作流需要，先于合并 |
| FE-024 | 合并 | P1 | 依赖分支；冲突流程复用既有弹窗 |

## 六、不在本批范围

- Shelve / Unshelve
- Work Item 关联、Check-in Policy
- 多 Workspace 创建 / 切换 / 删除（仅展示与管理当前 Workspace 的 Mapping）
- 二进制三方合并编辑器（合并冲突仍走既有「取本地 / 取服务器」冲突弹窗）
- 移动（Move 跨目录），第一步只做同目录重命名
