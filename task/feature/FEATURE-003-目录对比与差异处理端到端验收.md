# FEATURE-003 目录对比与差异处理端到端验收

## 状态

todo

## 优先级

P0

## 所属阶段

feature

## 依赖任务

- FEATURE-002
- FE-007
- FE-009
- SERVER-008

## 需求来源

- PRD 七、7.3 目录对比并处理差异

## 目标

验证目录对比和勾选差异文件处理完整链路。

## 实现范围

- 对已映射目录执行对比
- 展示差异文件
- 勾选 localModified 执行 checkout
- 勾选 localOnly 执行 add
- 勾选 notDownloaded 执行 Get Latest
- 勾选 pending change 执行 undo

## 不在范围

- 不做自动修复全部
- 不做冲突解决
- 不做实时刷新

## 涉及文件

- [mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs)
- [mactfsui](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui)

## 验收标准

- 目录对比不显示 upToDate
- 差异状态准确
- 用户可勾选文件执行对应操作

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
