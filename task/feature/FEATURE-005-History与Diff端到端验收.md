# FEATURE-005 History 与 Diff 端到端验收

## 状态

todo

## 优先级

P0

## 所属阶段

feature

## 依赖任务

- FEATURE-002
- FE-011
- FE-012
- SERVER-009

## 需求来源

- PRD 七、7.5 查看历史和 Diff

## 目标

验证文件历史、目录历史、changeset 文件列表和版本对比完整链路。

## 实现范围

- 文件历史最近 100 条
- 目录历史最近 100 条
- 点击 changeset 查看影响文件列表
- 本地 vs latest diff
- 两个历史版本 diff

## 不在范围

- 不做筛选
- 不做三方 merge
- 不做二进制可视化 diff

## 涉及文件

- [mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs)
- [mactfsui](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui)

## 验收标准

- 文件历史可展示
- 目录历史可展示
- changeset 文件列表可展示
- 历史中两个版本可对比

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
