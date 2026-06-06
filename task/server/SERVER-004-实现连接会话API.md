# SERVER-004 实现连接会话 API

## 状态

done

## 优先级

P0

## 所属阶段

server

## 依赖任务

- SERVER-003
- CORE-002

## 需求来源

- PRD 五、5.1 基础接口

## 目标

实现 TFS 连接 API 和本地会话管理。

## 实现范围

- `POST /api/session/connect`
- 调用 core 连接 TFS
- 保存当前连接会话
- 返回连接结果、serverUri、collectionCount、durationMs

## 不在范围

- 不做多账号会话
- 不做局域网共享 session
- 不做异步连接

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 正确账号可连接
- 错误账号返回错误
- 连接结果可被后续 API 复用

## 测试方式

```bash
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" http://127.0.0.1:38765/api/session/connect
```

## 完成记录

- 实际修改文件：
  - `mactfs/src/main/java/com/mydev/mactfs/server/MacTfsServer.java`
- 实际实现内容：
  - 新增 `POST /api/session/connect`。
  - 调用 `MacTfsCoreService.testConnection` 连接 TFS。
  - 连接成功后保存当前会话配置和连接摘要。
  - 返回 serverUri、collectionCount、durationMs 和 core 日志。
- 已执行测试：
  - 执行 `../tfsIntegration/gradlew build`。
- 测试结果：
  - build 成功。
- 未执行测试及原因：
  - 未执行真实 TFS 账号连接验证，当前任务输入未提供可用 TFS 地址、账号和密码。
- 是否满足验收标准：
  - 正确账号可连接：代码调用 core 实现，待真实账号验证。
  - 错误账号返回错误：core 失败会转换为 `success=false` 响应，待真实账号验证。
  - 连接结果可被后续 API 复用：已通过 `SessionManager` 保存配置。
- 遗留问题：
  - 需要真实 TFS 配置后补充连接成功/失败的实测记录。
