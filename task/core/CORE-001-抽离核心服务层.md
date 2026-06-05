# CORE-001 抽离核心服务层

## 状态

todo

## 优先级

P0

## 所属阶段

core

## 依赖任务

无

## 需求来源

- PRD 二、整体架构
- PRD 三、阶段一：Core

## 目标

从当前 `mactfs` CLI 中抽离 TFS 核心能力入口，形成可被 server、CLI、UI 间接复用的核心服务层。

## 实现范围

- 梳理 [TfsPhaseOneService.java](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/TfsPhaseOneService.java) 当前职责
- 新建或调整 core 包结构
- 将动作分发和命令行输出从核心逻辑中剥离
- 保留当前 CLI 可运行能力

## 不在范围

- 不实现新的 TFS 功能
- 不改 Electron UI
- 不引入 Web Server

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)
- [mactfs/build.gradle](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/build.gradle)

## 验收标准

- 核心服务层不依赖 CLI 输出格式
- 现有 `test-connection`、`list-collections`、`sync` 等 CLI 动作仍可调用
- 构建通过

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
```

## 完成记录

待完成后填写。
