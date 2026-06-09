# macTFS 本地 API 桌面客户端 PRD

## 一、产品定位

### 1.1 产品目标

macTFS 是一个运行在 macOS 本机的 TFS 客户端，用于替代依赖 IntelliJ 宿主的旧 TFS 插件。

第一版目标不是完整复刻 Visual Studio 或 IntelliJ 插件，而是实现一个以本地 API 为核心、带桌面 UI 的 TFS 日常操作工具，支持：

- 输入 TFS 地址、账号、密码并连接服务器
- 登录阶段完成 Collection 选择
- 自动查找或创建当前 Collection 的默认 Workspace
- 浏览固定 Collection 下的服务端目录树
- 管理当前 Workspace 的 Mapping
- 获取最新文件
- 对已映射目录执行目录对比
- 查看文件 / 目录历史记录
- 查看 changeset 影响的文件列表
- 查看本地文件或服务器 latest 文件内容
- 对比本地文件与服务器文件
- 对比历史记录中两个版本
- 签出、签入、新增、删除、撤销文件
- 通过 UI 或 curl 调用本地 API 执行操作

### 1.2 用户范围

第一版面向个人本机使用，优先满足单用户、单机器、日常 TFS 操作效率。

第一版不面向多人共享部署，不作为局域网服务，不做复杂账号体系。

### 1.3 核心原则

- API 优先：UI 和 CLI 都调用本地 API。
- 复用 Java TFS SDK：不重写 TFS 协议。
- 本地常驻服务：支持 UI 长会话和本地状态管理。
- 工作台围绕固定 Collection / Workspace 上下文展开。
- 文件操作遵守 TFS Workspace / Pending Change 模型。
- 第一版优先可用和清晰，不做过度自动化。

## 二、整体架构

### 2.1 架构图

```text
Electron UI
curl / scripts
mactfs CLI
      |
      | HTTP JSON + Bearer Token
      v
mactfs-server (Java 8 + SparkJava)
      |
      | Session / Config / Workspace / Log
      v
mactfs-core
      |
      | TFS SDK
      v
tfsIntegration/lib + native libs
```

### 2.2 模块拆分

```text
mactfs-core
  TFS 核心能力封装，不关心 UI 和 HTTP。

mactfs-server
  本地常驻 API 服务，负责路由、认证、会话、配置、日志。

mactfs-cli
  命令行入口，调用本地 API，保留调试能力。

mactfsui
  Electron + React 桌面 UI，调用本地 API。
```

## 三、阶段规划

### 阶段一：Core

目标：从当前 CLI MVP 中抽离可复用 TFS 能力。

P0：

- 连接 TFS 服务器
- 显式 NTLM 账号密码认证
- 查询 Collection
- 查询服务端目录
- 查询 / 创建 / 复用 Workspace
- 保存 / 查询 Mapping
- Get Latest
- 查询 Pending Changes
- Checkout
- Add
- Delete
- Undo
- Checkin with comment
- 文件历史查询
- 目录历史查询
- 单文件版本内容获取
- 文件 Diff 基础能力
- 目录对比状态计算

P1：

- 更完整的异常分类
- 二进制文件识别
- 大目录对比性能优化

P2：

- Work Item 绑定
- Check-in Policy UI
- 更复杂的冲突处理

### 阶段二：Server API

目标：实现本地常驻 Java API 服务。

技术选型：

- Java 8
- SparkJava 2.9.4
- Jackson
- 监听地址：`127.0.0.1`
- 默认端口：`38765`

P0：

- 本地 API 服务启动 / 停止
- 本地 token auth
- 单配置文件读写
- SessionManager
- WorkspaceManager
- MappingManager
- OperationLog
- REST API
- 同步接口返回最终结果
- 接口耗时统计
- 超时失败提示

P1：

- API 请求日志文件
- 端口冲突处理
- 服务健康检查

P2：

- SSE / WebSocket 实时日志
- 异步 Job 模型

### 阶段三：CLI

目标：实现本地 API 调试入口。

P0：

- `mactfs token --show`
- `mactfs health`
- `mactfs api`
- 兼容旧 `--action` 验证入口

### 阶段四：Frontend Workspace UI

目标：实现固定 Collection / Workspace 上下文的桌面工作台。

P0：

- Electron 启动服务、preload、API client
- 登录页、Collection 选择、默认 Workspace 上下文
- 顶部上下文栏、三栏工作台、底部操作台
- 左侧目录树与中间列表同步导航
- 对象右键菜单
- Mapping、History、目录对比弹窗
- 文件查看、Diff、冲突处理弹窗
- Pending Changes 与 Checkin
- 操作日志与刷新反馈

P1：

- 折叠面板交互打磨
- 列表职责收口与动作编排整理

P2：

- 用户自定义布局
- 快捷键

### 阶段五：Feature

目标：按真实业务链路做端到端验收。

P0：

- 服务端目录浏览
- Mapping 管理
- Get Latest
- 目录对比
- Pending Changes 管理
- Checkin
- History / Diff

### 阶段六：Release

目标：完成个人可用的 macOS 桌面分发。

P0：

- 打包 Electron UI
- 内置或定位 x86_64 JDK 8
- 配置 TFS native lib 路径
- 本地配置目录初始化
- README 和运行说明

P1：

- 自动检测 Rosetta / JDK 环境
- 日志导出

P2：

- macOS Keychain 凭据存储
- 自动更新

## 四、服务端设计

### 4.1 本地服务

服务只监听本机：

```text
http://127.0.0.1:38765
```

不监听 `0.0.0.0`，不允许局域网访问。

### 4.2 本地 Token Auth

所有 API 请求必须携带：

```text
Authorization: Bearer <token>
```

Token 文件：

```text
~/.mactfs/server-token
```

文件权限：

```text
600
```

调试方式：

```bash
mactfs token --show
curl -H "Authorization: Bearer $(mactfs token --show)" http://127.0.0.1:38765/api/health
```

服务启动日志显示 token 文件位置，但默认不直接打印 token 值。

### 4.3 配置文件

第一版只支持一套默认配置。

配置文件：

```text
~/.mactfs/config.json
```

第一版允许明文保存密码，定位为个人开发模式。

### 4.4 Workspace 策略

第一版规则：

- 同一个 Collection 下，同一台电脑只创建一个默认 Workspace。
- 一个 Workspace 不跨 Collection。
- 一个 Workspace 支持多条 Mapping。
- 工作台进入后固定 Collection，上下文变化通过重新连接完成。

Workspace 命名规则：

```text
mactfs-{collection}-{username}-{computer}
```

### 4.5 同步调用与超时

第一版 API 使用同步调用，接口等待 TFS 操作完成后返回。

UI 必须在等待期间显示明确状态：

- 正在连接 TFS
- 正在查询目录
- 正在执行目录对比
- 正在获取最新
- 正在签入
- TFS 网络响应可能较慢

### 4.6 操作日志

服务端和 UI 记录每次操作：

- 操作名称
- 开始时间
- 结束时间
- 耗时
- 路径摘要
- 成功 / 失败
- 错误信息

## 五、API 设计

### 5.1 基础接口

```text
GET  /api/health
POST /api/session/connect
GET  /api/config
PUT  /api/config
```

### 5.2 Collection 与目录

```text
GET /api/collections
GET /api/server-tree?path=$/Project
GET /api/server-folder/items?path=$/Project/src
```

### 5.3 Workspace 与 Mapping

```text
GET  /api/workspace
POST /api/workspace/ensure
GET  /api/workspace/context
GET  /api/mappings
POST /api/mappings/check-target
POST /api/mappings
DELETE /api/mappings
```

### 5.4 文件操作

```text
POST /api/files/get-latest
POST /api/files/checkout
POST /api/files/add
POST /api/files/delete
POST /api/files/undo
POST /api/checkin
GET  /api/pending-changes
GET  /api/files/content
POST /api/conflicts/apply
```

### 5.5 目录对比

```text
POST /api/compare/folder
```

目录对比返回状态：

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
upToDate
```

### 5.6 历史记录

```text
GET /api/history?path=...
GET /api/history/changeset?changeset=...
```

### 5.7 Diff

```text
POST /api/diff/local-latest
POST /api/diff/revisions
```

支持：

- 本地文件 vs 服务器 latest
- 历史记录中两个 changeset 对比

## 六、UI 设计

### 6.1 布局

工作台围绕固定 Collection / Workspace 展开：

```text
顶部：
  当前连接、Collection、Workspace、全局入口

左侧：
  固定 Collection 下的服务端目录树

中间：
  当前选中目录下一级文件 / 文件夹列表

右侧：
  Pending Changes、Included / Excluded、Checkin

底部：
  操作日志
```

### 6.2 左侧目录树

左侧展示固定 Collection 下完整服务端目录树。

无论服务端目录是否已映射到本地，都允许浏览。

目录树节点操作优先通过右键菜单触发。

### 6.3 中间文件列表

点击左侧目录后，中间展示该目录下一级内容。

字段：

- 名称
- 类型
- 服务端路径
- 本地路径
- 状态
- 最新版本
- 上次签入时间

中间区域只承载浏览，不再内嵌大块 Mapping、History、Diff、Compare 面板。

### 6.4 Mapping、History 与目录对比

- Mapping 通过弹窗创建
- History 通过弹窗展示
- 目录对比通过弹窗展示
- 目录对比默认隐藏 `upToDate`
- 对象操作通过右键菜单触发

### 6.5 文件查看与 Diff

支持：

- 已映射文件查看本地内容
- 未映射文件查看服务器 latest 内容
- 本地 vs latest Diff
- 两个历史版本 Diff

大文件、二进制文件、非 Mapping 路径需要明确提示。

### 6.6 Pending Changes 与 Checkin

- 右侧挂起更改面板展示当前 Workspace 的 pending changes
- 分为 Included / Excluded
- Checkin 只提交 Included Changes
- Checkin 保留在右侧面板，不使用单独弹窗

### 6.7 冲突处理

- Get Latest 和 Checkout 复用统一冲突弹窗
- 支持服务器版本 / 保留本地版本选择
- 冲突项可进入 Diff
- 第一版不做手动冲突块编辑

## 七、核心业务流程

### 7.1 首次连接

```text
输入 serverUri / domain / username / password
点击连接
服务端认证 TFS
查询 Collection
用户确认 Collection
自动确保默认 Workspace
进入工作台
```

### 7.2 创建 Mapping

```text
左侧或中间选择服务端目录
通过右键菜单打开映射弹窗
选择本地父目录
调用本地后端预校验最终目标路径
如果目标目录已存在，则提示“已存在，禁止映射”并禁止确认
保存 Mapping
用户选择是否立即 Get Latest
```

补充约束：

- Mapping 只允许目录创建，不允许文件创建
- 前端只上传 `serverPath` 与 `localParentPath`
- 最终本地目标路径由本地后端按“父目录 + 服务端目录最后一段”规则计算
- 当前版本由本地后端负责最终路径存在校验与目录创建
- 已映射目录不再展示“映射到本地”
- 取消映射只解除 Mapping，不删除本地文件
- 取消映射后页面保持当前浏览位置，只更新动作可用性

### 7.3 目录对比并处理差异

```text
选择已映射目录
打开目录对比弹窗
系统返回差异列表
用户通过右键菜单执行 checkout / add / delete / get latest / undo
如有冲突，进入统一冲突弹窗
```

补充约束：

- 未映射目录仍允许浏览、查看历史、打开目录对比
- 依赖本地工作区的动作在未映射目录下保留菜单项，但置灰不可点击

### 7.4 签入

```text
右侧查看 pending changes
调整 Included / Excluded
填写 comment
点击签入
后端提交 Included Changes
成功后显示 changeset
失败后显示 TFS 错误
```

### 7.5 查看历史和 Diff

```text
选择文件或目录
打开历史弹窗
展示最近 100 条
文件历史可选择两个版本对比
目录历史可点击 changeset 查看文件列表
```

## 八、不在第一版范围

- 多 Profile
- 多用户账号体系
- 局域网访问
- 实时文件 watcher
- 自动 checkout
- 自动修复全部差异
- 取消长任务
- Work Item 绑定
- 完整 Check-in Policy UI
- 三方 merge
- 手动冲突块编辑
- Label / Branch / Merge
- macOS Keychain 默认存储

## 九、风险与约束

### 9.1 TFS SDK 与 JDK

当前项目依赖旧 TFS Java SDK 和 native 库。

Apple Silicon 下需使用 x86_64 JDK 8 + Rosetta。

### 9.2 明文密码

第一版允许明文保存密码，只适合个人本机使用。

### 9.3 大目录性能

目录对比、目录历史、Get Latest 可能受 TFS 网络和目录规模影响。

第一版通过：

- 同步等待状态提示
- 超时失败
- 默认隐藏 `upToDate`
- 历史限制 100 条

控制复杂度。

### 9.4 TFS 状态模型

TFS 不等同 Git。

签入前必须通过 checkout / add / delete 把本地变化转换为 pending changes。

## 十、验收标准

P0 验收：

- 能启动本地 API 服务
- API 只监听 `127.0.0.1`
- API 需要 Bearer token
- 能输入账号密码连接 TFS
- 能选择 Collection 并固定上下文
- 能创建 / 复用当前 Collection 的默认 Workspace
- 能浏览固定 Collection 下目录树
- 能创建 Mapping
- 能选择是否立即 Get Latest
- 能对已映射目录执行目录对比
- 能对差异文件执行 checkout / add / delete / get latest / undo
- 能查看 pending changes
- 能区分 Included / Excluded
- 能填写 comment 并签入 Included Changes
- 能查看文件历史
- 能查看目录历史
- 能查看 changeset 影响文件列表
- 能查看文件内容
- 能做本地 vs latest Diff
- 能选择两个历史版本 Diff
- UI 有操作日志

## 十一、推荐实施顺序

1. 抽 `mactfs-core`，迁移当前 `TfsPhaseOneService` 能力。
2. 新增 `mactfs-server`，接入 SparkJava 和 token auth。
3. 改造 `mactfs-cli`，保留调试入口。
4. 完成前端基础设施：Electron、preload、API client。
5. 完成连接页、固定 Collection / Workspace 上下文。
6. 完成工作台布局、目录树、中间列表。
7. 完成右键菜单、Mapping / History / Compare 弹窗。
8. 完成文件查看、Diff、冲突流程。
9. 完成 Pending Changes、Checkin、操作日志。
10. 完成 Feature E2E 与 Release。
