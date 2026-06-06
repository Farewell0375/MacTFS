# Core 测试与需求验证报告

## 2026-06-06 复测结论

### 复测范围

- 复查本报告中 `P0-1`、`P1-1` 修复状态。
- 重新执行 `mactfs` 构建和发行脚本生成。
- 使用本机 `/Users/fenghp/.mactfs/phase-one.properties` 中已保存的真实连接配置，执行连接、Collection、Workspace、Mapping、Pending Changes 和目录浏览验证。
- 未执行 `get-latest`、`checkout`、`add`、`delete`、`undo`、`checkin`，避免修改本地工作区或 TFS 服务端状态。

### 复测命令

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
  arch -x86_64 ../tfsIntegration/gradlew clean build installDist

./build/install/mactfs/bin/mactfs --action unknown --output json
./build/install/mactfs/bin/mactfs --action test-connection --output json
./build/install/mactfs/bin/mactfs --action checkin --output json --comment ''

env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
  arch -x86_64 ./build/install/mactfs/bin/mactfs --action test-connection --output json --server-uri '<配置文件中的 TFS 地址>' --auth-type '<配置值>' --domain '<配置值>' --username '<配置值>' --password '<配置值>'

env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
  arch -x86_64 ./build/install/mactfs/bin/mactfs --action list-collections --output json --server-uri '<配置文件中的 TFS 地址>' --auth-type '<配置值>' --domain '<配置值>' --username '<配置值>' --password '<配置值>'

env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
  arch -x86_64 ./build/install/mactfs/bin/mactfs --action list-workspaces --output json --reuse-config true

env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
  arch -x86_64 ./build/install/mactfs/bin/mactfs --action list-mappings --output json --reuse-config true

env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
  arch -x86_64 ./build/install/mactfs/bin/mactfs --action pending-changes --output json --reuse-config true

env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
  arch -x86_64 ./build/install/mactfs/bin/mactfs --action browse-server-path --output json --reuse-config true
```

### 复测结果

- `clean build installDist` 通过，Gradle 输出 `BUILD SUCCESSFUL`。
- `installDist` 产物包含 `build/install/mactfs/lib/native/macosx/*.jnilib`。
- `unknown` action 返回一行干净 JSON。
- 缺少 `--server-uri` 返回一行干净 JSON。
- 空 `comment` 返回一行干净 JSON。
- Apple Silicon 默认 Java 运行 `list-collections` 时，native/JNI 错误已返回一行干净 JSON，没有再输出非 JSON 堆栈；`P0-1` 验证通过。
- x86_64 JDK 运行真实 `test-connection` 成功，返回 `collectionCount: 2`。
- x86_64 JDK 运行真实 `list-collections` 成功，返回 `PE`、`PKUSEHR` 两个 Collection。
- `list-workspaces --reuse-config true` 成功复用 workspace，返回 `created:false`，workspace 名称为已保存配置中的 `mactfs-PKUSEHR-fenghaopengdeMacBook-Pro.local`。
- `list-mappings --reuse-config true` 成功，返回 1 条 Mapping。
- `pending-changes --reuse-config true` 成功，返回 0 条 Pending Changes。
- `browse-server-path --reuse-config true` 成功，浏览 `$/` 返回 69 个服务端目录项。
- JSON 输出可被 `JSON.parse` 直接解析；TFS SDK WARN 被收集在 `data.capturedStdout`，没有污染最终 JSON；`P1-1` 验证通过。

### 本轮新增问题

#### P2-1：`test-connection` 和 `list-collections` 不支持 `--reuse-config true`

状态：已修复。

修复时间：2026-06-06

修复内容：

- `TfsPhaseOneService.testConnection` 和 `listCollections` 在显式 `--reuse-config true` 时读取 `LocalConfigStore`。
- 未传 `--reuse-config true` 时仍保持原有必填参数校验，避免无意使用本地保存配置。

修复后验证：

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home arch -x86_64 ./build/install/mactfs/bin/mactfs --action test-connection --output json --reuse-config true
env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home arch -x86_64 ./build/install/mactfs/bin/mactfs --action list-collections --output json --reuse-config true
./build/install/mactfs/bin/mactfs --action test-connection --output json
```

验证结果：

- `test-connection --reuse-config true` 成功，返回 `collectionCount: 2`。
- `list-collections --reuse-config true` 成功，返回 `PE`、`PKUSEHR`。
- 未传 `--reuse-config true` 且缺少连接参数时，仍返回 `Missing required argument --server-uri`。

复现命令：

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
  arch -x86_64 ./build/install/mactfs/bin/mactfs --action test-connection --output json --reuse-config true
```

实际结果：

- 返回 `Missing required argument --server-uri`。

原因判断：

- `TfsPhaseOneService.testConnection` 和 `listCollections` 使用 `mergeArguments(arguments, new Properties())`，没有读取 `configStore.load()`。
- 其他动作如 `list-mappings`、`pending-changes`、`browse-server-path` 使用保存配置可正常执行。

影响：

- 不影响真实连接能力本身。
- 影响 CLI 日常调试体验：已有配置时仍需手动传入 `server-uri/auth-type/domain/username/password` 才能执行连接测试和 Collection 查询。

## 修复状态

已修复。

修复时间：2026-06-06

修复内容：

- `P0-1` 已修复：`MacTfsCoreService` 统一捕获 `Throwable`，TFS SDK native/JNI 架构错误会进入 `CoreOperationResult`，CLI JSON 输出包含 `operation`、`durationMillis` 和失败消息。
- `P1-1` 已修复：`MacTfsCli` 在 JSON 模式下隔离第三方 stdout/stderr，最终 stdout 只输出一行 JSON；第三方 WARN / 堆栈收集到 `data.capturedStdout` / `data.capturedStderr`。
- 默认发行包已包含 `tfsIntegration/lib/native`，CLI 启动时会自动设置 `com.microsoft.tfs.jni.native.base-directory`。

修复后验证：

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home arch -x86_64 ../tfsIntegration/gradlew clean build installDist
./build/install/mactfs/bin/mactfs --action unknown --output json
./build/install/mactfs/bin/mactfs --action list-collections --output json --server-uri 'http://127.0.0.1:1/tfs' --username user --password pass
env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home arch -x86_64 ./build/install/mactfs/bin/mactfs --action list-collections --output json --server-uri 'http://127.0.0.1:1/tfs' --username user --password pass
```

验证结果：

- `clean build installDist` 通过。
- `unknown` action 返回干净 JSON 失败结果。
- Apple Silicon 默认运行连接类 action 时，native/JNI 错误返回干净 JSON 失败结果，不再输出非 JSON 堆栈。
- x86_64 JDK 运行连接类 action 时，最终 stdout 是干净 JSON，TFS SDK WARN / 堆栈被收集到 `capturedStdout`，不再污染 JSON 输出。

备注：

- 本机 Gradle wrapper 当前会使用 JDK 17 daemon，而 Gradle 6.4 不兼容 JDK 17；验证命令显式使用项目内 x86_64 JDK 8 执行。
- 真实 TFS 写操作仍未执行，原因同原报告：避免默认修改真实服务端或工作区状态。

## 测试范围

- 阅读 `task/README.md`、`task/AI-RULES.md`、`docs/mactfs-api-product-prd.md` 与 `task/core/CORE-001` 到 `CORE-012`。
- 验证 `mactfs` core 已完成代码的构建、CLI 入口、结构化失败输出和关键需求覆盖。
- 未执行真实 TFS 写操作：`checkout`、`add`、`delete`、`undo`、`checkin`，原因是任务规则明确要求不要默认修改真实 TFS 服务端状态。

## 已执行验证

### 1. Java 构建

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
../tfsIntegration/gradlew clean build
```

结果：

- `build` 通过。
- `clean build` 通过。
- 当前模块没有 test source，Gradle 输出 `:test NO-SOURCE`。

### 2. CLI 发行脚本

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew installDist
```

结果：

- 通过。
- 生成 `/Users/fenghp/Desktop/DEV/project/mydev/mactfs/build/install/mactfs/bin/mactfs`。

### 3. CLI 无副作用负向用例

```bash
./build/install/mactfs/bin/mactfs --action unknown --output json
./build/install/mactfs/bin/mactfs --action test-connection --output json
./build/install/mactfs/bin/mactfs --action checkin --output json --comment ''
```

结果：

- 不支持的 action 能返回 JSON 失败结果。
- 缺少 `--server-uri` 能返回 JSON 失败结果。
- 空 `comment` 在 CLI 参数层被拒绝，能返回 JSON 失败结果。

## 发现问题

### P0-1：默认 CLI 运行环境下 TFS SDK native 错误不会被 core 统一结果捕获

复现命令：

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
./build/install/mactfs/bin/mactfs \
  --action list-collections \
  --output json \
  --server-uri 'http://127.0.0.1:1/tfs' \
  --username user \
  --password pass
```

实际结果：

- 进程输出 `UnsatisfiedLinkError` 堆栈。
- 未返回 `CliActionResult` JSON。
- `MacTfsCoreService.execute` 只捕获 `Exception`，`UnsatisfiedLinkError` 属于 `Error`，不会进入统一失败模型。

影响：

- 影响 `test-connection`、`list-collections`、`browse-server-path`、`ensure-workspace`、`get-latest`、`pending-changes`、`checkout`、`add`、`delete`、`undo`、`checkin`、`compare-folder`、`history`、`file-content`、`diff` 等所有需要 TFS SDK 连接的 core 能力。
- 不满足 `CORE-012` 的“核心操作能返回成功 / 失败 / 耗时”和“错误信息可供 UI 展示”。
- 后续 Server API / Electron UI 若直接调用当前默认产物，会收到非 JSON 堆栈或进程异常退出，无法稳定展示错误。

补充验证：

```bash
file /Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib/native/macosx/*.jnilib
```

结果显示 native 库包含 `x86_64`，但当前系统 `uname -m` 为 `arm64`。

使用项目内 x86_64 JDK、`arch -x86_64` 和 native base directory 后，JNI 错误消失，命令进入连接流程，并最终返回结构化 JSON：

```bash
env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
JAVA_OPTS='-Dcom.microsoft.tfs.jni.native.base-directory=/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib/native' \
arch -x86_64 ./build/install/mactfs/bin/mactfs \
  --action list-collections \
  --output json \
  --server-uri 'http://127.0.0.1:1/tfs' \
  --username user \
  --password pass
```

返回结果包含：

- `success:false`
- `message:"Connection refused (Connection refused)"`
- `data.operation:"listCollections"`
- `data.durationMillis`

判断：

- core 功能依赖明确的 x86_64 JDK + native base directory 启动条件。
- 当前 `mactfs` 默认启动脚本没有固化该条件；在 Apple Silicon 默认 Java 环境下连接类动作不可用。

### P1-1：JSON 模式会混入 TFS SDK WARN / 堆栈输出

复现命令同上，使用 x86_64 JDK 和 native base directory。

实际结果：

- JSON 结果前会先输出 TFS SDK WARN / 堆栈，例如 `WARN  [main] TFSConfigurationServer ...`。
- 最后一行是 JSON，但 stdout/stderr 混杂时，Server API 或 Electron 如果按完整 stdout 解析 JSON 会失败。

影响：

- 影响后续 CLI 作为调试/API 客户端入口时的机器可读输出。
- 若 Server API 直接复用 CLI 进程输出，错误场景下解析不稳定。

判断：

- core 本身返回了结构化失败结果。
- 但 CLI JSON 输出通道没有隔离第三方日志，仍存在集成风险。

## 需求验收结论

### 已通过

- `CORE-001` 到 `CORE-012` 对应源码能完成编译。
- core 层已提供连接、Collection、目录浏览、Workspace、Mapping、Get Latest、Pending Changes、文件操作、Checkin、目录对比、History、File Content、Diff、统一结果模型的公开入口。
- CLI 入口已分发到上述 core 能力。
- 缺少必填参数、未知 action、空 comment 这类无副作用错误能返回 JSON 失败结果。

### 未完全通过

- `CORE-012` 在 native/JVM 架构错误场景下未能统一捕获失败并返回耗时结果。
- 默认 `installDist` 产物未固化运行 TFS SDK 所需的 x86_64 JDK / native base directory，连接类能力不能在当前 Apple Silicon 默认环境下直接验收。
- JSON 输出在 TFS SDK 日志存在时不是干净 JSON 流。

## 未执行项

- 未连接真实 TFS 服务。
- 未创建/删除真实 Workspace Mapping。
- 未执行真实 Get Latest。
- 未执行 `checkout`、`add`、`delete`、`undo`、`checkin`。

原因：

- 这些操作依赖真实 TFS 账号和服务端状态。
- 其中写操作可能修改真实服务端 pending changes 或提交 changeset，任务规则禁止默认执行。
