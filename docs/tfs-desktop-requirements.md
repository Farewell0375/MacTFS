# TFS 本地原生程序需求文档

## 一、项目背景

当前项目是 IntelliJ 下的 TFS 插件，核心能力包括：

- 连接 TFS 服务器
- 管理 Team Project Collection
- 管理 Workspace
- 建立 Server Path 与 Local Path 映射
- 下载文件到本地
- 本地文件与 TFS 文件联动
- 执行签出、签入、获取最新、历史查询等操作

现有项目的问题是：

- 插件形态依赖 IntelliJ 宿主环境
- 底层依赖旧版 TFS SDK 和 native 能力
- 在 macOS Apple Silicon 环境下兼容风险高

本次目标不是继续维护 IDEA 插件，而是基于现有项目中“对接 TFS 的能力”，做一个可在本机运行的原生程序，用于管理本地文件与 TFS 工作区联动。

## 二、目标定义

### 1. 产品目标

开发一个本地原生程序，运行在用户本机，提供以下能力：

- 登录并连接 TFS
- 管理本机 TFS Workspace
- 配置 Server Path 与 Local Path 映射
- 下载 TFS 文件到本地目录
- 扫描本地改动
- 执行签出、签入、获取最新

### 2. 本期范围目标

第一期目标不是完整替代现有插件全部能力，而是优先建立一个可用的最小闭环：

- 能登录
- 能创建或读取 Workspace
- 能配置映射
- 能执行一次真实的 Get Latest

### 3. 非目标

第一阶段不处理以下内容：

- 多人协同的服务端管理平台
- 浏览器版前端
- 复杂冲突解决 UI
- Branch / Merge / Label 全量操作界面
- Work Item 完整管理功能
- 自动监听全部本地文件变化并实时刷新

## 三、方案判断

### 1. 为什么不优先做前后端分离

TFS 的 Workspace 模型天然绑定：

- owner
- computer
- local path
- server path

涉及以下能力时，真实执行位置必须在本机：

- 本地目录映射
- 文件下载落盘
- 本地文件修改检测
- 签出 / 签入
- 获取最新

因此本项目不适合优先做纯 Web 方案。

### 2. 为什么优先做本地原生程序

本地原生程序可以直接访问：

- 本机目录
- 本机工作区配置
- 本机文件状态

相比“前端 + 后端 + Agent”的分布式方案，本地原生程序的优点是：

- 架构简单
- 更接近 TFS 原有工作区模型
- 第一版更容易跑通
- 更适合先做最小化技术验证

### 3. 技术路线建议

建议拆分为两层：

- `tfs-core`
  - 负责 TFS 通信、Workspace、映射、下载、签入签出等核心能力
- `desktop-ui`
  - 负责窗口、表单、目录树、操作入口、日志展示

第一阶段建议先完成 `tfs-core` 的技术验证，再补 UI。

## 四、技术选型建议

### 1. 苹果原生

优点：

- macOS 体验最好
- 系统集成自然

缺点：

- 现有 TFS 能力主要在 Java 代码中
- 原生 UI 与 Java 核心需要额外桥接
- 第一版开发成本高

结论：

- 不建议作为第一阶段验证方案
- 可作为后续成品化阶段评估方向

### 2. Tauri

优点：

- 包体较小
- 桌面能力足够

缺点：

- 若核心仍然在 Java，需要引入 sidecar 进程模式
- 第一版对进程通信和打包要求更高

结论：

- 不建议作为第一阶段验证方案

### 3. Electron

优点：

- 桌面壳成熟
- 与本地 Java 核心整合难度低
- 适合快速搭建 UI

缺点：

- 包体较大
- 资源占用偏高

结论：

- 如果需要尽快做桌面界面，优先选择 Electron

### 4. 第一阶段最终建议

第一阶段建议：

- 不先做完整桌面壳
- 先做本地 Java CLI 或本地 Java 小服务
- 完成核心链路验证后，再决定是否补 Electron UI

## 五、核心技术判断

### 1. 可复用能力

当前项目中，适合作为核心参考的模块主要包括：

- TFS 连接与认证
- 服务发现
- SOAP Stub 调用
- HTTP 上传下载
- Workspace 模型
- History / Checkin / Get / Query 等业务封装

### 2. 不建议直接复用的部分

以下部分与 IntelliJ 插件宿主强绑定，不作为新程序基础：

- 插件注册与扩展点
- IDEA Action
- IDEA Dialog / Form
- IDEA VCS 生命周期
- IDEA 文件监听

### 3. native 风险处理原则

新程序应尽量绕开旧版 native 依赖，优先保留纯 Java 路线。

建议：

- 优先使用 `NtlmExplicit`
- 视环境决定是否支持 `Alternate`
- 第一阶段不依赖 `NtlmNative`
- 不以适配旧版 macOS native 库为主线

## 六、分阶段需求

## 第一阶段：核心链路验证

### 1. 目标

验证以下链路在脱离 IntelliJ 后是否可独立运行：

- 登录
- 连接 TFS
- 查询 Workspace
- 创建或读取 Workspace
- 建立映射
- 执行 Get Latest

### 2. 功能范围

- 输入 TFS 地址、认证方式、用户名、密码
- 连接并验证身份
- 查询当前用户可见的 Workspace
- 创建新的 Workspace 或选择已有 Workspace
- 配置一条 Server Path 与 Local Path 映射
- 将映射保存到本地配置
- 执行一次真实的 Get Latest

### 3. 输入条件

- TFS Server URI
- 用户名 / 域 / 密码
- Workspace 名称
- Server Path
- 本地目录路径

### 4. 输出结果

- 登录成功或失败
- Workspace 列表
- 映射保存结果
- 本地目录下载结果

### 5. 验收标准

- 能成功连接到 TFS
- 能看到 Workspace 列表
- 能创建或读取目标 Workspace
- 能保存一条合法映射
- 能把指定 TFS 路径下载到本地目录

### 6. 交付形态

- Java CLI 或本地 Java 服务
- 命令行日志可观察

## 第二阶段：最小可用桌面程序

### 1. 目标

在第一阶段核心能力已验证的基础上，提供最小可操作 UI。

### 2. 功能范围

- 登录页
- Collection 选择
- 固定 Collection / Workspace 工作台
- 映射配置弹窗
- 执行 Get Latest 的操作入口
- 日志输出区域

### 3. 页面范围

#### 登录页

- Server URI
- Auth Type
- Username
- Domain
- Password
- 连接测试按钮

#### 上下文确认

- 登录成功后加载 Collection
- 用户确认 Collection
- 系统自动查找或创建默认 Workspace
- 工作台内不提供 Workspace 手动选择

#### 映射页

- 输入 Server Path
- 选择 Local Path
- 保存映射

#### 同步页

- 显示当前映射
- 执行 Get Latest
- 展示执行日志

### 4. 验收标准

- 用户可通过界面完成登录
- 用户可通过界面确认 Collection
- 用户进入工作台后可自动使用或创建默认 Workspace
- 用户可通过界面完成映射配置
- 用户可通过界面执行 Get Latest

### 5. 交付形态

- Electron 桌面程序

## 第三阶段：本地变更与签出签入闭环

### 1. 目标

建立本地文件与 TFS 的基本联动闭环。

### 2. 功能范围

- 扫描本地目录变化
- 显示待处理文件列表
- 执行 Checkout / Pend Edit
- 执行 Checkin
- 查看提交结果

### 3. 输入条件

- 已存在 Workspace
- 已存在映射
- 本地目录已有文件

### 4. 输出结果

- 本地变更列表
- 签出执行结果
- 签入执行结果
- Changeset 信息

### 5. 验收标准

- 修改本地文件后可识别出变更
- 可对变更文件执行签出
- 可完成一次成功签入
- TFS 可看到新的 Changeset

## 第四阶段：增强能力

### 1. 目标

在基本闭环稳定后，逐步补充高频辅助能力。

### 2. 功能范围

- 历史查询
- 文件版本查询
- Work Item 只读关联展示
- Label 查询
- 分支与合并能力预研
- 冲突处理能力预研

### 3. 验收标准

- 常用查询能力可在本地程序内完成
- 复杂操作具备明确扩展入口

## 七、最小化技术验证路线

### Step 1：连接验证

验证项：

- `connect`
- `queryWorkspaces`

成功标准：

- 能拿到当前用户工作区列表

### Step 2：Workspace 与映射验证

验证项：

- `createWorkspace` 或读取既有 Workspace
- 保存一条 `server path -> local path` 映射

成功标准：

- 重启程序后仍可读取配置

### Step 3：下载验证

验证项：

- `get latest`

成功标准：

- 本地生成真实文件
- 文件内容正确

### Step 4：签入闭环验证

验证项：

- 本地改文件
- 签出
- 签入

成功标准：

- TFS 中出现新的 Changeset

## 八、建议的数据持久化内容

本地程序至少需要保存以下信息：

- 最近使用的 TFS 地址
- 认证方式
- 用户名 / 域
- Workspace 名称
- Workspace 所属服务器
- Server Path 与 Local Path 映射
- 最近访问目录

第一阶段建议使用：

- JSON 或 SQLite

## 九、风险与影响

### 1. 兼容风险

- 旧版 TFS SDK 与现代 JDK 的兼容性
- 认证方式差异导致连接失败
- 部分 native 逻辑不可直接沿用

### 2. 业务风险

- Workspace 语义必须保持一致
- 本地目录操作需要谨慎，避免误覆盖文件
- 获取最新和签入过程中需要明确日志与错误反馈

### 3. 研发风险

- 如果过早进入完整 UI 开发，会掩盖核心通信链路问题
- 如果过早引入服务端，会增加不必要复杂度

## 十、最终建议

建议按以下顺序执行：

1. 先做 `tfs-core` 的本地 Java 技术验证
2. 第一版只验证登录、Workspace、映射、Get Latest
3. 验证成功后再补最小桌面 UI
4. UI 优先采用 Electron
5. 本地变更、签出签入放到第三阶段

该路线的目标不是一次性替代原插件全部功能，而是先构建一个可运行、可扩展、可在本机真实管理 TFS Workspace 的新程序基础。
