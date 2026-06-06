# CORE-012 实现异常超时与日志模型

## 状态

done

## 优先级

P1

## 所属阶段

core

## 依赖任务

- CORE-002
- CORE-005
- CORE-008
- CORE-009
- CORE-010
- CORE-011

## 需求来源

- PRD 四、4.5 同步调用与超时
- PRD 四、4.6 操作日志

## 目标

统一核心层操作结果、错误信息、耗时和日志模型。

## 实现范围

- 定义操作结果对象
- 记录开始时间、结束时间、耗时
- 统一 TFS 异常转义为用户可读错误
- 为 server API 提供日志摘要

## 不在范围

- 不做异步 Job
- 不做取消任务
- 不做 WebSocket / SSE

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 核心操作能返回成功 / 失败 / 耗时
- 错误信息可供 UI 展示
- 不影响已实现核心能力

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
```

## 完成记录

完成时间：2026-06-05

实际修改文件：

- `mactfs/src/main/java/com/mydev/mactfs/core/MacTfsCoreService.java`
- `mactfs/src/main/java/com/mydev/mactfs/TfsPhaseOneService.java`
- `mactfs/src/main/java/com/mydev/mactfs/CliActionResult.java`

实际实现内容：

- 新增 `CoreOperationResult`，统一返回 success、message、errorMessage、data、startedAt、endedAt、durationMillis、logs。
- 核心服务所有公开操作统一通过 `execute` 包装异常和日志。
- CLI JSON 成功和失败结果都透出 operation、开始/结束时间和耗时。

已执行测试：

- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew build`

测试结果：

- 构建通过。

未执行测试及原因：

- 未做真实超时测试；当前阶段未引入 Server API 超时执行器，只在 core 结果中提供耗时和错误模型。

验收标准：

- 核心操作能返回成功/失败/耗时：满足。
- 错误信息可供 UI 展示：满足。
- 不影响已实现核心能力：构建通过。

遗留问题：

- Server API 阶段需要在接口层补充实际超时控制。

追加修复时间：2026-06-06

测试反馈修复：

- 修复 TFS SDK native/JNI 架构错误未进入统一结果模型的问题，核心执行入口改为捕获 `Throwable`。
- 修复 CLI JSON 模式混入第三方 WARN / 堆栈输出的问题，JSON 模式下隔离 stdout/stderr 并写入 `capturedStdout` / `capturedStderr`。
- 发行包加入 `tfsIntegration/lib/native`，CLI 启动时自动设置 `com.microsoft.tfs.jni.native.base-directory`。

追加验证：

- `JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home arch -x86_64 ../tfsIntegration/gradlew clean build installDist`：通过。
- 默认 Apple Silicon 运行连接类 action：返回干净 JSON 失败结果。
- x86_64 JDK 运行连接类 action：返回干净 JSON 失败结果，第三方日志被收集到 data。
