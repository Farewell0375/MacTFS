# CLI-001 改造 CLI 调用本地 API

## 状态

done

## 优先级

P1

## 所属阶段

cli

## 依赖任务

- SERVER-007
- SERVER-009

## 需求来源

- PRD 二、整体架构

## 目标

将 CLI 定位为本地 API 的调试入口，而不是最终主架构。

## 实现范围

- 保留原 MVP CLI 能力作为兼容入口
- 新增通过 HTTP 调用本地 API 的命令
- 支持输出 JSON
- 支持常用调试命令

## 不在范围

- 不用 CLI 承担长会话状态
- 不替代 Electron UI

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs/MacTfsCli.java](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/MacTfsCli.java)

## 验收标准

- CLI 可调用本地 API
- CLI 不破坏已有 MVP 验证能力
- CLI 输出可供调试

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
```

## 完成记录

完成时间：2026-06-06

实际修改文件：

- `mactfs/src/main/java/com/mydev/mactfs/MacTfsCli.java`

实际实现内容：

- 新增 `health` 子命令，自动读取本地 token 后调用 `GET /api/health`。
- 新增 `api` 子命令，支持通过 `--method`、`--path`、`--body` 调用本地 REST API。
- 新增 `--base-url` 参数，默认请求 `http://127.0.0.1:38765`。
- 保留原有 `--action ...` MVP CLI 入口，旧命令仍走 `TfsPhaseOneService`。
- API 调试命令支持 `--output json`，JSON 模式直接输出服务端响应体。

已执行测试：

- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew build`
- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew -q run --args='health --output json'`
- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew -q runServer`
- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew -q run --args='health --output json'`
- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew -q run --args='api --method GET --path /api/health --output json'`

测试结果：

- Gradle 构建通过。
- 本地 API 服务未启动时，`health --output json` 返回结构化失败信息 `Connection refused`。
- 启动本地 API 服务后，`health --output json` 返回 `success=true`、`operation=health`、`host=127.0.0.1`、`port=38765`。
- 启动本地 API 服务后，`api --method GET --path /api/health --output json` 返回 `success=true`。
- 测试完成后已停止临时启动的本地 API 服务。

未执行测试及原因：

- 未通过 CLI 调用会修改 TFS 状态的 API，例如 checkout、add、delete、undo、checkin，避免默认修改真实 TFS 服务端或本地工作区状态。

是否满足验收标准：

- CLI 可调用本地 API：满足，`health` 和通用 `api` 子命令已实现。
- CLI 不破坏已有 MVP 验证能力：满足，原有 `--action ...` 分支未改动。
- CLI 输出可供调试：满足，文本模式输出 HTTP 状态和响应体，JSON 模式输出服务端 JSON。

遗留问题：

- 无。
