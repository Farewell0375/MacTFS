# mactfs 第一阶段进度记录

## 一、需求背景

当前目标来自 `tfs-desktop-requirements.md` 第一阶段：

- 脱离 IntelliJ 插件宿主
- 在 `mactfs` 下实现最小可运行 CLI
- 验证以下核心链路
  - 登录
  - 连接 TFS
  - 查询 Workspace
  - 创建或读取 Workspace
  - 保存 Server Path / Local Path 映射
  - 执行一次真实的 Get Latest

当前阶段重点不是 UI，而是先在真实 TFS 环境下把核心链路跑通。

## 二、当前代码完成情况

已在 `mactfs` 下新增独立 Java CLI 工程：

- [build.gradle](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/build.gradle)
- [settings.gradle](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/settings.gradle)
- [README.md](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/README.md)
- [src/main/java/com/mydev/mactfs/MacTfsCli.java](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/MacTfsCli.java)
- [src/main/java/com/mydev/mactfs/CliArguments.java](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/CliArguments.java)
- [src/main/java/com/mydev/mactfs/TfsPhaseOneService.java](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/TfsPhaseOneService.java)
- [src/main/java/com/mydev/mactfs/LocalConfigStore.java](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/LocalConfigStore.java)

当前 CLI 已支持：

- 连接 TFS
- 显式 NTLM 账号密码认证
- 查询 Team Project Collection 列表
- 查询指定 Workspace
- 不存在时创建 Workspace
- 保存单条 Server Path / Local Path 映射
- 执行 `Get Latest`
- 保存最近一次成功配置到本地文件

本地配置文件位置：

- `~/.mactfs/phase-one.properties`

## 三、已完成验证结果

### 1. 构建验证

已完成 `mactfs` 本地构建验证。

验证结论：

- CLI 工程可以正常编译
- `build` 已通过

### 2. 真实 TFS 认证验证

已使用真实环境参数验证：

- Server URI: `http://100.113.212.90:20094/tfs/`
- Account: `bdsoft\\fenghp`

验证结论：

- 账号密码可用
- TFS 地址可达
- 能成功完成登录

### 3. Collection 查询验证

已通过真实运行结果确认可见集合：

- `PE`
- `PKUSEHR`

已通过截图再次确认：

- `PE`
- `PKUSEHR`

### 4. PKUSEHR 项目列表验证

已通过服务端接口确认 `PKUSEHR` 下有 9 个项目：

- `01HRAP4GQ`
- `PE00 综合绩效考核系统`
- `江汽干部系统`
- `东风集团干部系统`
- `中国航空器材集团有限公司人力资源管理系统`
- `兵器集团204所人力系统`
- `首发干部系统`
- `包头市城市投资建设集团人力资源系统`
- `银河金控人力资源系统`

### 5. 真实 Workspace / Mapping / Get Latest 验证

已使用真实目标参数完成第一阶段完整链路验证：

- Collection: `PKUSEHR`
- Workspace: `mactfs-mydev-01HRAP4GQ`
- Server Path: `$/WJBRS/5SRC4PRM/MicroFront`
- Local Path: `/Users/fenghp/Desktop/DEV/project/mydev`

验证结论：

- 成功创建 Workspace
- 成功保存服务端路径与本地目录映射
- 成功执行一次真实 `Get Latest`
- 成功将代码下载到当前目录

本次真实下载结果：

- Updated files: `3484`
- Operations: `3484`
- Conflicts: `0`
- Failures: `0`

下载后在当前目录已落地的代码目录包括：

- `common`
- `subapp_ca`
- `subapp_pia`

## 四、关键运行结论

### 1. Apple Silicon 直接运行失败

在本机默认 `arm64 JDK 8` 下运行 `mactfs` 时，真实失败点已确认：

- 旧版 TFS SDK JNI 加载失败
- 报错为 `UnsatisfiedLinkError`
- 根因是：
  - 当前 JVM 为 `arm64`
  - TFS SDK 自带 macOS native 库仅为 `x86_64`

### 2. x86_64 JDK 8 + Rosetta 方案已验证可行

已确认以下方案可以正常绕过当前 JNI 问题：

- 使用 `x86_64 JDK 8`
- 通过 Rosetta 运行
- 指定 TFS SDK native 目录

当前已验证可用的 JDK 路径：

- `/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home/bin/java`

## 五、当前推荐运行方式

后续在本机验证 `mactfs`，统一使用以下方式运行，不使用系统默认 `arm64 Java`。

### 1. list-only 验证命令

```bash
arch -x86_64 /Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home/bin/java \
-cp /Users/fenghp/Desktop/DEV/project/mydev/mactfs/build/classes/java/main:$(find /Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib -maxdepth 1 -name '*.jar' | tr '\n' ':') \
-Dcom.microsoft.tfs.jni.native.base-directory=/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib/native \
com.mydev.mactfs.MacTfsCli \
--server-uri http://100.113.212.90:20094/tfs/ \
--auth-type ntlm-explicit \
--username fenghp \
--domain bdsoft \
--password '***' \
--collection PE \
--list-only true
```

### 2. 当前已验证成功输出

```text
Login success
Server URI: http://100.113.212.90:20094/tfs/
Collections:
 - PE
 - PKUSEHR
```

## 六、补充问题与修复

在真实下载过程中，发现并修复了一个阻塞性代码问题：

- 文件：`src/main/java/com/mydev/mactfs/TfsPhaseOneService.java`
- 位置：`createWorkspace(...)`
- 问题：`VersionControlClient.createWorkspace(...)` 参数顺序传错，导致 workspace 注释被当作 owner identity 传给 TFS
- 现象：服务端返回 `TF14045: 标识 mactfs phase one workspace 是不可识别的标识`
- 处理：按 SDK 方法签名调整参数顺序后，Workspace 创建恢复正常

## 七、当前风险

### 1. 运行环境风险

当前 CLI 对 Apple Silicon 机器的默认 `arm64 Java` 不兼容。

现阶段规避方式：

- 统一使用 `x86_64 JDK 8 + Rosetta`

### 2. 目录使用风险

本次验证按要求将 `$/WJBRS/5SRC4PRM/MicroFront` 直接映射到了当前目录：

- `/Users/fenghp/Desktop/DEV/project/mydev`

这意味着：

- 当前目录已不再只是原始验证工程目录
- 服务端代码已直接落到该目录根下
- 后续再次执行相同映射时，需要注意避免误覆盖本地文件
### 3. 旧版 SDK 风险

当前 `mactfs` 第一阶段仍依赖旧版 TFS SDK。

现阶段结论：

- 可以先用于第一阶段链路验证
- 后续如果继续产品化，仍建议评估逐步绕开旧 JNI 依赖

## 八、当前阶段结论

当前 `mactfs` 第一阶段进度可以确认到以下状态：

- CLI 工程已完成
- 构建已通过
- 真实 TFS 登录已通过
- Collection 查询已通过
- `PKUSEHR` 项目列表已获取
- Apple Silicon 运行问题已定位
- `x86_64 JDK 8 + Rosetta` 验证路径已跑通
- 真实 Workspace 创建已通过
- 真实 Mapping 保存已通过
- 真实 `Get Latest` 已通过
- 目标代码已下载到本地目录

当前可以认为：

- `mactfs` 第一阶段已完成验收所需的最小闭环验证

## 九、下一阶段开发建议

根据 `tfs-desktop-requirements.md`，下一阶段应进入：

- 第二阶段：最小可用桌面程序

第二阶段目标不是继续扩展 CLI 功能，而是在第一阶段核心链路已验证通过的基础上，补一层最小可操作 UI，让用户可以不依赖命令行完成登录、Workspace 选择、映射配置和 `Get Latest`。

### 1. 下一阶段目标

第二阶段需要完成的最小能力：

- 登录页
- Workspace 管理页
- 映射配置页
- 执行 `Get Latest` 的操作页
- 日志输出区域

第二阶段验收标准：

- 用户可通过界面完成登录
- 用户可通过界面完成 Workspace 选择或创建
- 用户可通过界面完成映射配置
- 用户可通过界面执行 `Get Latest`

### 2. 下一阶段推荐实现顺序

建议按以下顺序推进：

1. 保留当前 `mactfs` CLI 作为可回归验证入口
2. 将当前已验证通过的核心能力继续作为 Java 本地核心
3. 在其外层补最小桌面壳
4. 优先打通 UI 到 Java 核心的调用链
5. 最后再补页面整理和交互细节

原因：

- 第一阶段已经证明核心问题不在 UI，而在本地 TFS 链路
- 当前最有价值的是复用已跑通的 Java 能力
- 如果此时重写核心链路，风险会明显变高

### 3. 下一阶段建议的实际拆分

建议拆成以下几块：

#### 3.1 核心层整理

目标：

- 保留 `TfsPhaseOneService`
- 保留 `LocalConfigStore`
- 保留现有 CLI 入口作为调试工具
- 视需要补一个更明确的结果对象，便于 UI 读取状态和日志

这一层重点不是重构，而是：

- 让现有核心能力能稳定被桌面端调用

#### 3.2 桌面壳接入

建议方向：

- 按需求文档建议，优先采用 Electron

这一层先只解决：

- 启动桌面程序
- 表单录入参数
- 触发本地 Java 执行
- 展示返回日志

现阶段不建议一开始就做复杂状态管理或页面美化。

#### 3.3 最小页面范围

建议先做以下 4 个页面或 4 个区域：

- 登录区域
- Workspace 区域
- 映射区域
- 同步与日志区域

其中字段建议直接对齐第一阶段 CLI 参数：

- `server-uri`
- `auth-type`
- `username`
- `domain`
- `password`
- `workspace`
- `server-path`
- `local-path`

这样可以减少 UI 和核心能力之间的转换成本。

### 4. 第二阶段最应该先做的一个点

如果只做一个最优先动作，建议先做：

- Electron 页面调用本地 Java，完成一次“界面触发 Get Latest”

原因：

- 这一步一旦打通，第二阶段的主链路就成立了
- 登录页、Workspace 页、映射页本质上都是为这个主操作提供输入
- 日志展示也可以直接复用当前 CLI 输出结果

### 5. 当前最合理的下一步

当前最合理的下一步不是继续扩展 TFS 能力，而是开始第二阶段骨架搭建：

1. 确定 Electron 作为桌面壳
2. 定义 UI 如何调用本地 Java
3. 先做一个最小窗口
4. 在窗口里完成一次真实登录和 `Get Latest`

等这条 UI 链路跑通后，再补：

- Workspace 列表展示
- Workspace 创建
- 映射编辑
- 配置回填

## 十、第二阶段当前进展

已在当前目录下新增独立桌面壳工程：

- `/Users/fenghp/Desktop/DEV/project/mydev/desktop-ui`

当前已完成内容：

- 基于 `Electron + Vue 3 + Vite` 搭建独立桌面工程
- 补充 Java CLI 动作式接口
  - `test-connection`
  - `list-collections`
  - `list-workspaces`
  - `sync`
- 补充 JSON 输出结构，供桌面端直接消费
- 桌面端已实现以下页面骨架
  - 连接配置
  - 工作区管理
  - 同步
  - 运行环境
  - 底部日志区
- 桌面端已实现本地 JSON 配置存储
- 桌面端已实现通过 Electron 主进程拉起 Java CLI

当前验证结果：

- `mactfs` Java 构建通过
- `desktop-ui` 构建通过
- `test-connection` JSON 模式验证通过
- `list-collections` JSON 模式验证通过
- `list-workspaces` JSON 模式验证通过

当前第二阶段仍待补充的主要是：

- Electron 实际启动联调
- 真实界面操作下的 `Get Latest` 回归
- 连接配置、工作区配置的细节打磨
