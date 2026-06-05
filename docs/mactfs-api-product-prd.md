# macTFS 本地 API 桌面客户端 PRD

## 一、产品定位

### 1.1 产品目标

macTFS 是一个运行在 macOS 本机的 TFS 客户端，用于替代依赖 IntelliJ 宿主的旧 TFS 插件。

第一版目标不是完整复刻 Visual Studio 或 IntelliJ 插件，而是实现一个以本地 API 为核心、带桌面 UI 的 TFS 日常操作工具，支持：

- 输入 TFS 地址、账号、密码并连接服务器
- 浏览 Collection 下的服务端目录树
- 管理当前 Collection 下的默认 Workspace
- 管理服务端路径与本地目录 Mapping
- 获取最新文件
- 对已映射目录执行目录对比
- 查看文件 / 目录历史记录
- 查看 changeset 影响的文件列表
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
- 交互参考 Visual Studio Team Explorer / Source Control Explorer。
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
  命令行入口，后续调用本地 API，保留调试能力。

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
- 文件 diff 基础能力
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

### 阶段三：Frontend

目标：实现类 Visual Studio 的 TFS 桌面 UI。

P0：

- Electron 启动本地 Java 服务
- 登录 / 配置页面
- Collection 目录树
- 中间目录文件列表
- 右侧挂起更改面板
- 底部操作日志
- Mapping 创建
- Get Latest
- 目录对比
- 签出 / 新增 / 删除 / 撤销 / 签入
- 历史记录
- 文件 diff

P1：

- 更好的文件图标和状态色
- 历史 changeset 详情抽屉
- 操作结果 toast

P2：

- 用户自定义布局
- 快捷键

### 阶段四：Feature

目标：补齐核心 TFS 日常功能。

P0：

- 服务端目录浏览
- Mapping 管理
- 目录对比
- 勾选差异文件处理
- Pending Changes 管理
- Checkin comment 必填
- History / Diff

P1：

- 文件夹递归 Checkout 预估影响数量
- Get Latest 支持文件 / 目录 / Mapping 粒度
- 目录历史 changeset 文件列表

P2：

- 冲突解决器
- Label / Branch / Merge
- Work Item 查询与关联

### 阶段五：Release

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

示例：

```json
{
  "serverUri": "http://tfs.example.com:8080/tfs/",
  "authType": "ntlm-explicit",
  "domain": "bdsoft",
  "username": "fenghp",
  "password": "plain-password",
  "collection": "PKUSEHR",
  "workspace": "mactfs-PKUSEHR-fenghp-macbook",
  "mappings": [
    {
      "serverPath": "$/Project/Main",
      "localPath": "/Users/fenghp/project/main"
    }
  ]
}
```

风险说明：

- 明文密码只适合个人本机使用。
- 后续产品化阶段再切换 macOS Keychain。

### 4.4 Workspace 策略

第一版规则：

- 同一个 Collection 下，同一台电脑只创建一个默认 Workspace。
- 一个 Workspace 不跨 Collection。
- 一个 Workspace 支持多条 Mapping。

Workspace 命名规则：

```text
mactfs-{collection}-{username}-{computer}
```

命名规范：

- 只保留字母、数字、横线、下划线
- 空格、中文、点号替换为横线
- 过长时截断

### 4.5 同步调用与超时

第一版 API 使用同步调用，接口等待 TFS 操作完成后返回。

UI 必须在等待期间显示明确状态：

- 正在连接 TFS
- 正在查询目录
- 正在执行目录对比
- 正在获取最新
- 正在签入
- TFS 网络响应可能较慢

超时建议：

```text
连接测试：30 秒
目录浏览：120 秒
历史查询：120 秒
目录对比：120 秒
单文件 diff：60 秒
Get Latest：300 秒
Checkin：300 秒
```

第一版不做取消。超时或 TFS 异常时，后端停止当前操作并返回错误。

### 4.6 操作日志

服务端和 UI 记录每次操作：

- 操作名称
- 开始时间
- 结束时间
- 耗时
- 路径摘要
- 成功 / 失败
- 错误信息

示例：

```text
[10:21:03] 开始目录对比：$/Project/src
[10:21:18] 目录对比完成：发现 12 个差异，耗时 15.2s
[10:22:01] 开始签入：3 个文件
[10:22:06] 签入失败：TFxxxx 权限不足
```

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
GET  /api/mappings
POST /api/mappings
DELETE /api/mappings
```

Mapping 创建流程：

```text
选中服务端目录
选择本地目录
保存 WorkingFolder mapping
用户选择是否立即 Get Latest
```

创建 Mapping 后，如果不立即 Get Latest，后续仍可对 Mapping 下的子目录或单个文件单独 Get Latest。

### 5.4 文件操作

```text
POST /api/files/get-latest
POST /api/files/checkout
POST /api/files/add
POST /api/files/delete
POST /api/files/undo
POST /api/checkin
GET  /api/pending-changes
```

Get Latest 支持：

- 单文件
- 目录递归
- 整个 Mapping

### 5.5 目录对比

```text
POST /api/compare/folder
```

请求示例：

```json
{
  "serverPath": "$/Project/src",
  "localPath": "/Users/fenghp/project/src",
  "recursive": true
}
```

返回状态：

```text
localModified   本地修改
remoteChanged   服务端有更新
bothChanged     本地和服务端都变更
localOnly       本地新增
remoteOnly      服务端新增
notDownloaded   已映射但本地未下载
localDeleted    本地删除
pendingEdit     已签出编辑
pendingAdd      待新增
pendingDelete   待删除
upToDate        本地与服务端一致，默认不展示
```

目录对比不逐文件下载内容。第一步只做元数据和状态对比。用户打开单个文件 diff 时才获取对应服务端内容。

### 5.6 历史记录

```text
GET /api/history?path=...
GET /api/history/changeset?changeset=...
```

规则：

- 文件历史：返回该文件最近 100 条历史。
- 目录历史：返回影响该目录的最近 100 条 changeset。
- 点击 changeset 后展示本次 changeset 影响的文件列表。
- 第一版不做作者、时间、changeset 范围筛选。

changeset 文件列表字段：

```text
path
serverPath
changeType
itemType
changeset
author
date
comment
```

### 5.7 Diff

```text
POST /api/diff/local-latest
POST /api/diff/revisions
```

支持：

- 本地文件 vs 服务器 latest
- 历史记录中两个 changeset 对比

第一版优先支持文本文件。

暂不支持：

- 三方 merge
- 二进制可视化 diff
- 目录级完整内容 diff

## 六、UI 设计

### 6.1 布局

参考 Visual Studio Source Control Explorer。

```text
顶部：
  当前连接、Collection、Workspace、常用操作

左侧：
  Collection 下的 TFS 服务端目录树

中间：
  当前选中目录下一级文件 / 文件夹列表

右侧：
  挂起的更改、签入 comment、签入 / 撤销等操作

底部：
  操作日志
```

### 6.2 左侧目录树

左侧展示 Collection 下完整服务端目录树。

无论服务端目录是否已映射到本地，都允许浏览。

未映射目录允许：

- 浏览子目录 / 文件
- 查看历史
- 查看 changeset 文件列表
- 创建 Mapping
- Get Latest 到新本地目录

未映射目录不允许：

- 本地目录对比
- 本地 vs 云端 diff
- checkout
- add
- delete
- checkin

### 6.3 中间文件列表

点击左侧目录后，中间展示该目录下一级内容。

字段：

- 名称
- 类型
- 服务端路径
- 本地路径
- 是否已映射
- 状态
- 最新版本
- 上次签入时间

已映射但本地未下载的文件显示：

```text
未下载 / notDownloaded
```

可执行：

- Get Latest
- 查看历史

### 6.4 目录对比

对已映射目录可执行目录对比。

目录对比结果默认隐藏 `upToDate`，只展示差异文件。

用户勾选差异文件后，右侧根据状态展示可用操作。

操作映射：

```text
localModified   -> checkout / diff
localOnly       -> add / delete local
localDeleted    -> delete / restore from server
remoteChanged   -> get latest / diff
notDownloaded   -> get latest
pendingEdit     -> checkin / undo / diff
pendingAdd      -> checkin / undo
pendingDelete   -> checkin / undo
bothChanged     -> diff / 手工处理
```

### 6.5 Checkout

已映射且本地存在的文件可直接 checkout。

已映射且本地存在的目录可递归 checkout。

目录级 checkout 必须二次确认：

```text
将递归签出 N 个已版本控制文件，是否继续？
```

执行后文件进入 `pendingEdit`。

不做实时自动 checkout。

### 6.6 Add

新增文件只从目录对比结果触发。

流程：

```text
目录对比发现 localOnly
用户勾选 localOnly 文件
点击添加文件
后端执行 pend add
状态变为 pendingAdd
```

### 6.7 Delete

删除模型：

- 已版本控制文件：执行 TFS pending delete，后续通过 checkin 提交。
- 本地未版本控制文件：可直接删除本地文件。
- 未下载服务端文件：第一版不允许删除。

### 6.8 Pending Changes

右侧挂起更改面板展示当前 Workspace 的 pending changes。

分为：

- Included Changes
- Excluded Changes

签入只提交 Included Changes。

用户可在 Included / Excluded 间移动文件。

Included / Excluded 状态只在当前 UI 会话内保存，不持久化。

不要求左侧或中间选中文件与右侧 pending changes 联动。

### 6.9 Checkin

签入规则：

- 只提交 Included Changes。
- 所有提交文件必须属于同一个 Workspace。
- 可跨目录、跨 Mapping。
- comment 必填。
- 第一版不做 Work Item 绑定。
- 第一版不做复杂 Check-in Policy UI。
- 如果服务端返回 policy / 权限 / 冲突错误，直接展示错误信息。

### 6.10 History

文件历史：

- 展示最近 100 条。
- 字段：changeset、作者、时间、comment。
- 支持选择两个历史记录做 diff。

目录历史：

- 展示影响该目录的最近 100 条 changeset。
- 点击 changeset 展示本次影响的文件列表。
- 可从文件列表进入文件 diff。

### 6.11 Diff

支持：

- 本地文件 vs 服务器 latest
- 历史中两个版本对比

展示方式：

- 文本文件左右对比
- 目录级只显示差异列表，不展开所有文件 diff

## 七、核心业务流程

### 7.1 首次连接

```text
输入 serverUri / domain / username / password
点击连接
服务端认证 TFS
查询 Collection
保存默认配置
进入主界面
```

### 7.2 创建 Mapping

```text
左侧选择服务端目录
点击映射到本地
选择本地目录
保存 Mapping
用户选择是否立即 Get Latest
```

### 7.3 目录对比并处理差异

```text
选择已映射目录
点击目录对比
系统返回差异列表
用户勾选文件
根据差异类型执行 checkout / add / delete / get latest / undo
重新对比或刷新 pending changes
```

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
点击历史
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
- 复杂冲突解决
- Label / Branch / Merge
- Git hook 模拟 TFS
- macOS Keychain 默认存储

## 九、风险与约束

### 9.1 TFS SDK 与 JDK

当前项目依赖旧 TFS Java SDK 和 native 库。

Apple Silicon 下需使用 x86_64 JDK 8 + Rosetta。

第一版需要固定运行方式：

```text
x86_64 JDK 8
com.microsoft.tfs.jni.native.base-directory 指向 tfsIntegration/lib/native
```

### 9.2 明文密码

第一版允许明文保存密码，只适合个人本机使用。

后续产品化必须改为 Keychain。

### 9.3 大目录性能

目录对比、目录历史、Get Latest 可能受 TFS 网络和目录规模影响。

第一版通过：

- 同步等待状态提示
- 超时失败
- 默认隐藏 upToDate
- 历史限制 100 条

控制复杂度。

### 9.4 TFS 状态模型

TFS 不等同 Git。

本地文件可写不代表 TFS pending edit。

签入前必须通过 checkout / add / delete 把本地变化转换为 pending changes。

## 十、验收标准

P0 验收：

- 能启动本地 API 服务。
- API 只监听 `127.0.0.1`。
- API 需要 Bearer token。
- 能输入账号密码连接 TFS。
- 能查询 Collection。
- 能浏览 Collection 下目录树。
- 能创建 / 复用当前 Collection 的默认 Workspace。
- 能创建 Mapping。
- 能选择是否立即 Get Latest。
- 能对已映射目录执行目录对比。
- 能对差异文件执行 checkout / add / delete / get latest / undo。
- 能查看 pending changes。
- 能区分 Included / Excluded。
- 能填写 comment 并签入 Included Changes。
- 能查看文件历史。
- 能查看目录历史。
- 能查看 changeset 影响文件列表。
- 能做本地 vs latest diff。
- 能选择两个历史版本 diff。
- UI 有操作日志。

## 十一、推荐实施顺序

1. 抽 `mactfs-core`，迁移当前 `TfsPhaseOneService` 能力。
2. 新增 `mactfs-server`，接入 SparkJava 和 token auth。
3. 实现配置、连接、Collection、目录浏览 API。
4. 实现 Workspace / Mapping / Get Latest API。
5. 实现 pending changes、checkout、add、delete、undo、checkin API。
6. 实现目录对比 API。
7. 实现 history 和 diff API。
8. 改造 `mactfsui`，实现 Visual Studio 风格主界面。
9. 接入操作日志。
10. 完成打包和运行说明。
