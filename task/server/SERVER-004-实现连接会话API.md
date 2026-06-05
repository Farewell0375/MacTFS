# SERVER-004 实现连接会话 API

## 状态

todo

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

待完成后填写。
