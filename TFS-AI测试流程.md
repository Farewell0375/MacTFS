# TFS 通用测试大纲

## 1. 文档目的

这份文档不是 CLI 的逐步操作手册，也不是 server 接口的逐条调用清单，而是一份面向当前项目整体能力的通用测试大纲。

适用范围：

- CLI 联调
- 后续 server API 联调
- 后续 UI 端到端联调

测试目标：

- 验证 TFS 连接链路是否可用
- 验证 Collection、Workspace、Mapping、文件操作、历史记录、Diff 等核心能力是否可用
- 明确当前版本已经具备的能力
- 明确当前版本还未落地或暂不支持的能力

## 2. 当前可用环境信息

以下内容来自项目文档、源码和本机现有配置。

### 2.1 TFS 连接信息

- TFS 地址：`http://100.113.212.90:20094/tfs/`
- 认证方式：`ntlm-explicit`
- 域：`bdsoft`
- 账号：`fenghp`
- 密码：`Fhp@111111`

### 2.2 当前可见 Collection

根据项目现有验证记录，当前已验证可见：

- `PKUSEHR`
- `PE`

默认建议优先使用：

- `PKUSEHR`

如果后续某条链路在 `PKUSEHR` 下无法成立，再切换 `PE` 做补充验证。

### 2.3 当前已有 Workspace / Mapping 记录

当前本机配置中已有旧记录：

- Workspace：`mactfs-PKUSEHR-fenghaopengdeMacBook-Pro.local`
- Server Path：`$/01HRAP4GQ/03DEV分支/V8_6_0/02数据库脚本`
- Local Path：`/Users/fenghp/Desktop/个人/test`

这条记录不是本次推荐测试链路，原则上不要直接拿它做写操作验证。

项目文档和测试报告中还记录过另一条已验证 Mapping：

- Workspace：`mactfs-mydev-01HRAP4GQ`
- Server Path：`$/WJBRS/5SRC4PRM/MicroFront`
- Local Path：`/Users/fenghp/Desktop/DEV/project/mydev`

这条 Mapping 会覆盖整个项目根目录。TFS 不允许不同 Workspace 的本地映射路径互相包含，所以测试本地目录不能放在 `/Users/fenghp/Desktop/DEV/project/mydev` 及其子目录下。

### 2.4 推荐测试 Workspace

为了隔离测试影响，建议使用单独的测试 Workspace：

- `mactfs-ai-subapp-pm-mactfs`

如果后续要验证“复用已有 Workspace”的场景，也建议优先复用这个测试 Workspace，而不是复用旧业务 Workspace。

### 2.5 指定测试目录

所有和文件、目录、映射、签入签出相关的测试，都必须严格限制在以下服务端目录：

- `$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs`

建议本地测试目录固定为：

- `/Users/fenghp/Desktop/DEV/mactfs-ai-workspace`

这个目录位于项目根目录之外，用于避免和已有 Workspace `mactfs-mydev-01HRAP4GQ` 的本地映射冲突。

只读验证记录：

- 2026-06-06 已验证可连接 TFS，Collection 返回 `PE`、`PKUSEHR`
- 2026-06-06 已验证 `PKUSEHR` 下的测试目录可浏览
- 当前测试目录中已有历史测试文件，后续新增测试文件应继续限制在该目录下

## 3. 测试边界

### 3.1 允许测试的内容

- 连接 TFS
- 查询 Collection
- 浏览服务端目录
- 复用 Workspace
- 新增 Workspace
- 查询 Mapping
- 新增 Mapping
- 删除 Mapping
- Get Latest
- 查询 Pending Changes
- checkout
- add
- delete
- undo
- checkin
- 查看历史记录
- 查看 changeset 文件列表
- 本地对比 latest
- 两个历史版本 diff
- 目录对比

### 3.2 不允许越界的内容

- 不允许对指定测试目录之外的服务端路径做写操作
- 不允许把旧 Mapping 当成默认测试目录
- 不允许把其他 Workspace 下的业务目录拿来做新增、删除、签入测试
- 不允许把本地测试目录放在 `/Users/fenghp/Desktop/DEV/project/mydev` 及其子目录下

### 3.3 当前要特别注意的点

- 当前项目里最完整、最明确落地的是 core/cli 能力
- server API 在需求和任务文档中已经定义，但源码里暂未看到完整服务端实现
- 因此这份文档适合作为统一测试大纲，但在不同阶段会落到不同执行入口：
  - 现在更多是 CLI / core 验证
  - 后续 server 落地后可复用同一套测试大纲
  - UI 完成后也可以按同一套测试项回归

## 4. 通用测试大纲

下面是按能力域整理的测试大纲，不要求固定顺序，也不是一条严格脚本。

### 4.1 连接与会话

重点验证：

- TFS 地址是否可达
- 账号、密码、域是否能成功认证
- 连接成功后是否能复用当前连接上下文
- 错误账号、错误密码、错误地址时能否返回明确错误

适用场景：

- CLI：验证 `test-connection`
- server：验证连接会话建立和后续复用
- UI：验证登录、重连、错误提示

关注结果：

- 成功 / 失败
- 错误信息是否清晰
- 是否返回可供后续操作复用的连接结果

### 4.2 Collection 与服务端目录浏览

重点验证：

- 是否能列出当前账号可见的 Collection
- 选定 Collection 后，是否能浏览服务端目录
- 未建立 Mapping 时，是否仍可浏览服务端目录
- 指定测试目录是否可见、可进入

建议关注：

- `PKUSEHR` 是否能正常使用
- `PE` 是否也可作为补充验证
- 测试目录 `$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs` 是否始终作为唯一写操作范围

### 4.3 Workspace 管理

这一部分不要写成单一固定动作，而是按场景验证：

- 复用已有测试 Workspace
- 新增测试 Workspace
- 查询当前 Workspace 状态
- 判断 Workspace 是否与当前连接 / Collection 匹配

建议覆盖的判断：

- 已存在时是否正确复用
- 不存在时是否能新建
- 名称、owner、comment、mapping 信息是否正确

当前版本分析：

- core/cli 已具备“确保 Workspace 存在 / 复用”的能力
- 当前 CLI 没有单独的“删除 Workspace”动作
- PRD 中把“删除 Workspace”放在更后的阶段，当前版本不应把它当成已落地能力

结论：

- “复用已有 Workspace”和“新增 Workspace”应纳入测试大纲
- “删除 Workspace”目前只能作为未来补充项，不建议作为当前版本必测项

### 4.4 Mapping 管理

重点验证：

- 是否能把指定测试目录映射到本地测试目录
- 是否能查看当前 Mapping
- 是否能删除 Mapping
- Mapping 建好后是否能被后续 Get Latest、文件操作、Pending Changes 正确识别

建议只测试这一条映射：

- Server Path：`$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs`
- Local Path：`/Users/fenghp/Desktop/DEV/mactfs-ai-workspace`

不建议在当前测试大纲里扩展出多目录、多业务路径 Mapping。

注意：

- 不要使用 `/Users/fenghp/Desktop/DEV/project/mydev/workspace/ai-mactfs`
- 该路径在项目根目录下，会和已有 Workspace `mactfs-mydev-01HRAP4GQ` 的本地映射冲突
- 如果后续更换本地目录，也要确保它不在任何已有 Workspace 的 Local Path 下面

### 4.5 Get Latest 与本地同步

重点验证：

- Mapping 建好后是否能执行 Get Latest
- 是否支持对整个 Mapping、目录、单文件做同步
- 首次下载后本地目录是否进入可操作状态
- 服务端无变化时重复执行是否稳定

需要关注的结果：

- 是否成功下载
- 是否出现路径不匹配
- 是否能识别未下载、已下载、已同步状态

### 4.6 文件操作与 Pending Changes

这是实际业务最关键的一组能力，建议按类型分场景验证，而不是写成一条固定脚本：

- 新增文件
- 修改已有文件
- 删除已有文件
- 撤销未提交变更
- 查询 Pending Changes

核心判断：

- 本地文件操作能否被转换成 TFS 可识别的 pending changes
- `pendingAdd`、`pendingEdit`、`pendingDelete` 是否正确
- `undo` 后状态是否恢复
- 所有操作都必须只发生在测试目录下

业务上要特别注意：

- 本地文件可写，不代表已经进入 TFS pending edit
- 必须通过 checkout / add / delete 等动作，把本地变化转换成 TFS 挂起更改

### 4.7 Checkin / Checkout

重点验证：

- checkout 后文件是否进入可编辑且受 TFS 跟踪状态
- checkin 时 comment 是否必填
- checkin 成功后是否返回 changeset
- checkin 后 pending changes 是否清空

建议覆盖：

- 单文件 checkout / checkin
- 新增文件 checkin
- 删除文件 checkin

当前版本分析：

- core/cli 已具备 checkout、checkin、add、delete、undo 能力
- server 任务文档里这些接口已设计，但源码里暂未见完整 server 落地

结论：

- 这部分可以作为当前通用测试大纲的重要项
- 但如果执行入口换成 server，就要先确认 server 实现是否真的已补齐

### 4.8 历史记录与 Changeset

重点验证：

- 能否查询单文件历史
- 能否查询目录历史
- 能否查看某个 changeset 影响的文件列表
- 历史记录中的作者、时间、comment、changeset 编号是否完整

当前版本分析：

- core/cli 代码层面已经有 history 能力
- PRD 和 server 任务里也已经定义了对应接口
- 从源码看，这部分属于当前项目已设计、core 已有实现基础的能力

结论：

- 历史记录应纳入当前测试大纲
- 但是否能以 server 方式直接测试，要看 server 是否已实现对应 API

### 4.9 Diff 与目录对比

这一块建议拆成三类能力看：

#### 4.9.1 本地 vs latest

重点验证：

- 本地文件和服务端 latest 是否能做文本 diff
- 修改后是否能看出具体差异

#### 4.9.2 两个历史版本 diff

重点验证：

- 是否能选择两个 changeset 做对比
- 是否能返回文本差异内容

#### 4.9.3 目录对比

重点验证：

- 是否能输出目录级差异列表
- 是否能区分 `localModified`、`remoteChanged`、`bothChanged`、`localOnly`、`remoteOnly`、`notDownloaded`、`pendingEdit`、`pendingAdd`、`pendingDelete`

当前版本分析：

- core/cli 代码层面已经有 `compare-folder`、`history`、`diff`
- PRD 明确支持：
  - 本地 vs latest diff
  - 两个历史版本 diff
  - 目录对比
- PRD 同时明确暂不支持：
  - 三方 merge
  - 二进制可视化 diff
  - 目录级完整内容 diff

结论：

- 历史记录对比这类能力，不是“做不到”，而是有明确范围
- 当前版本可测的是“文本级 diff / 元数据级目录对比”
- 当前版本不应把“二进制可视化 diff”或“完整目录内容 diff”当成必测项

## 5. 当前版本能力分析

### 5.1 已有明确实现基础的能力

根据 `mactfs/src/main/java/com/mydev/mactfs/MacTfsCli.java` 和 `TfsPhaseOneService.java`，当前 core/cli 已经覆盖：

- 连接测试
- Collection 查询
- 服务端目录浏览
- Workspace 确保存在 / 复用
- Mapping 查询 / 新增 / 删除
- Get Latest
- Pending Changes
- checkout / add / delete / undo / checkin
- 目录对比
- 历史记录
- 文件内容
- diff

这说明从“核心能力是否存在”的角度看，上述测试项都可以纳入统一测试大纲。

### 5.2 已定义但未确认完整落地的 server 能力

根据 `task/server` 和 PRD，server 已规划：

- 连接会话 API
- Collection 与目录 API
- Workspace 与 Mapping API
- 文件操作 API
- 历史与 Diff API

但从当前源码检索结果看，暂未看到完整 server 入口实现。

因此当前判断应是：

- server 测试大纲可以直接复用本文件
- 但 server 侧是否现在就能逐项执行，要先看实际代码是否已补齐

### 5.3 当前版本不应当强行纳入“已支持”的能力

以下内容不建议写成当前版本必测：

- 删除 Workspace
- 三方 merge
- 二进制可视化 diff
- 目录级完整内容 diff
- 多账号并行会话
- 复杂冲突解决器

## 6. 推荐的测试组织方式

如果后续要把这份大纲用于不同入口，建议统一按下面的方式组织，而不是每个入口各写一套完全不同的流程：

- 第一组：连接与 Collection
- 第二组：Workspace 与 Mapping
- 第三组：Get Latest 与本地同步
- 第四组：Pending Changes 与文件操作
- 第五组：Checkin / Checkout
- 第六组：历史记录与 Changeset
- 第七组：Diff 与目录对比

执行时再根据入口映射：

- CLI：对应具体 action
- server：对应具体 API
- UI：对应具体交互页面

这样后续不管是 CLI、server 还是 UI，测的都是同一套业务能力，只是执行入口不同。

## 7. 结论

这份文档现在应当被理解为：

- 一份通用测试大纲
- 一份当前项目 TFS 核心能力清单
- 一份当前版本“能测什么、暂时别测什么”的边界说明

核心结论：

- 连接、Collection、Workspace 复用 / 新增、Mapping、Get Latest、Pending Changes、checkout、add、delete、undo、checkin、历史记录、文本 diff、目录对比，都应纳入当前通用测试范围
- 删除 Workspace 目前不应作为当前版本必测项
- 历史记录对比不是做不到，而是当前更适合按“文本文件 diff、changeset 对比、目录元数据对比”这个范围来测
- 所有写操作必须严格限定在：`$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs`
