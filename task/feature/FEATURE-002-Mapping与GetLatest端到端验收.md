# FEATURE-002 Mapping 与 Get Latest 端到端验收

## 状态

todo

## 优先级

P0

## 所属阶段

feature

## 依赖任务

- FEATURE-001
- FE-007
- FE-009
- SERVER-006
- SERVER-007

## 需求来源

- PRD 七、7.2 创建 Mapping

## 目标

验证 Mapping 弹窗、目录选择、是否立即 Get Latest，以及后续独立执行 Get Latest 的完整链路。

## 实现范围

- 选择服务端目录
- 通过弹窗映射到本地目录
- 选择是否立即 Get Latest
- 对文件 / 目录 / Mapping 执行 Get Latest
- 展示下载结果、跳过项和冲突反馈

## 不在范围

- 不验证签入
- 不验证历史
- 不验证目录对比

## 涉及文件

- [mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs)
- [mactfsui](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui)

## 验收标准

- Mapping 能保存到 Workspace
- 不立即下载时状态为 `notDownloaded`
- 后续可单独下载下级文件或目录
- 有冲突或跳过项时前端反馈清晰

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
