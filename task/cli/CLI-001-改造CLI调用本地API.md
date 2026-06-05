# CLI-001 改造 CLI 调用本地 API

## 状态

todo

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

待完成后填写。
