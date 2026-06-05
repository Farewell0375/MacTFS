# CORE-012 实现异常超时与日志模型

## 状态

todo

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

待完成后填写。
