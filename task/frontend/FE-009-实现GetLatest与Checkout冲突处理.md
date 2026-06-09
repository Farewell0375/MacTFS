# FE-009 实现 Get Latest 与 Checkout 冲突处理

## 状态

todo

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-002
- FE-006
- FE-008
- SERVER-007

## 需求来源

- PRD 七、7.3 目录对比并处理差异
- [mactfsui/FRONTEND_SPEC.md](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/FRONTEND_SPEC.md)

## 目标

把 Get Latest 和 Checkout 的冲突流程收口成统一体验，支持目录递归、跳过项提示和逐文件选择。

## 实现范围

- Get Latest 递归执行入口
- Checkout 自动先执行 Get Latest
- 冲突弹窗
- 跳过 pending edit 子项提示
- 冲突文件逐项选择服务器版本或保留本地版本
- 冲突文件 Diff 入口
- 批量应用选择

## 不在范围

- 不实现手动冲突块编辑
- 不对二进制文件做自动合并编辑
- 不做后台异步任务模型
- 不实现复杂重试机制

## 涉及文件

- [mactfsui/app/components/explorer](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer)
- [mactfsui/app/routes/home.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/routes/home.tsx)
- [mactfsui/app/lib/api](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/api)
- [mactfs/src/main/java/com/mydev/mactfs/server](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/server)

## 验收标准

- 文件夹 Get Latest 可以递归执行
- Checkout 能复用统一冲突弹窗
- 冲突文件可以打开 Diff
- 跳过项和冲突项在 UI 上有明确反馈
- 应用服务器版本或保留本地版本后，前端能正确刷新状态

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
```

## 完成记录

待完成后填写。
