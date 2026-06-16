# FEATURE-003 目录对比与差异处理端到端验收

## 状态

todo

## 优先级

P0

## 所属阶段

feature

## 依赖任务

- FEATURE-002
- FE-006
- FE-007
- FE-009
- SERVER-008

## 需求来源

- PRD 七、7.3 目录对比并处理差异

## 目标

验证目录对比弹窗、差异筛选、右键动作和冲突反馈链路。

## 实现范围

- 对已映射目录执行对比
- 展示差异文件
- 通过右键菜单执行 checkout、add、get latest、undo
- 对冲突项进入统一冲突处理
- 验证目录对比结果刷新

## 不在范围

- 不做自动修复全部
- 不做手动冲突块编辑
- 不做实时 watcher

## 涉及文件

- [mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs)
- [mactfsui](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui)

## 验收标准

- 目录对比默认不显示 `upToDate`
- 差异状态准确
- 用户可通过右键菜单执行对应操作
- 有冲突时能进入统一冲突反馈流程

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
