# SERVER-010 实现操作日志与超时

## 状态

done

## 优先级

P1

## 所属阶段

server

## 依赖任务

- SERVER-004
- SERVER-007
- SERVER-008
- SERVER-009
- CORE-012

## 需求来源

- PRD 四、4.5 同步调用与超时
- PRD 四、4.6 操作日志

## 目标

实现 API 操作日志、耗时统计和同步请求超时处理。

## 实现范围

- 每个 API 返回 durationMs
- 记录操作开始、结束、失败
- 对连接、目录、历史、diff、Get Latest、Checkin 设置超时
- UI 可读取最近操作日志

## 不在范围

- 不做取消
- 不做异步 Job
- 不做 WebSocket / SSE

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- API 等待期间可明确展示操作中
- 超时返回明确错误
- 操作日志可供 UI 展示

## 测试方式

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:38765/api/health
```

## 完成记录

- 实际修改文件：
  - `mactfs/src/main/java/com/mydev/mactfs/server/MacTfsServer.java`
- 实际实现内容：
  - 所有 API 统一返回 durationMs、startedAt、endedAt。
  - 新增内存操作日志，记录 operation、summary、startedAt、endedAt、durationMs、success、errorMessage。
  - 新增 `GET /api/logs` 供 UI 读取最近操作日志。
  - 对连接、目录、历史、目录对比、diff、Get Latest、Checkin 等请求设置同步超时。
- 已执行测试：
  - 带 token 调用 `GET /api/health`。
  - 执行 `../tfsIntegration/gradlew build`。
- 测试结果：
  - health 返回 durationMs。
  - build 成功。
- 未执行测试及原因：
  - 未通过真实长耗时 TFS 请求触发超时，当前未提供可用慢请求场景。
- 是否满足验收标准：
  - API 等待期间可明确展示操作中：同步 API 返回前由前端展示等待状态，服务端提供 durationMs。
  - 超时返回明确错误：超时返回 `Operation timed out` 和 HTTP 504。
  - 操作日志可供 UI 展示：已提供 `GET /api/logs`。
- 遗留问题：
  - 需要真实慢 TFS 请求后补充超时路径验收。
