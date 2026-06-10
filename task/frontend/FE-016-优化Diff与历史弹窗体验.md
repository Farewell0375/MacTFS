# FE-016 优化 Diff 与历史弹窗体验

## 状态

todo

## 优先级

P1

## 所属阶段

frontend

## 依赖任务

- FE-008
- FE-015

## 需求来源

- [docs/mactfs-ui-enhancement-requirements.md](/Users/fenghp/Desktop/DEV/project/mydev/docs/mactfs-ui-enhancement-requirements.md) R3

## 目标

把对比与历史相关弹窗从“能用”提升到“好用”：更大的可视面积、左右分栏对照、
差异概览定位与差异间快速跳转。

## 实现范围

- 历史 / Diff / 目录对比 / 文件查看弹窗尺寸提升（接近满屏）
- Diff 弹窗支持「统一视图 / 左右分栏」切换，左侧旧版、右侧新版、行级对齐
- Diff 差异概览条：按差异块标记位置，点击跳转
- 「上一处 / 下一处差异」按钮与差异计数定位
- 视图状态（统一 / 分栏）在同一会话内记忆

## 不在范围

- 不引入 Monaco / CodeMirror
- 不做语法高亮
- 不做行内字符级 diff

## 涉及文件

- [mactfsui/app/components/explorer/diff-dialog.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/diff-dialog.tsx)
- [mactfsui/app/components/explorer/history-dialog.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/history-dialog.tsx)
- [mactfsui/app/components/explorer/compare-dialog.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/compare-dialog.tsx)
- [mactfsui/app/components/explorer/file-view-dialog.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/file-view-dialog.tsx)

## 验收标准

- Diff 可在统一视图与左右分栏间切换，分栏视图新旧版本行级对齐
- 概览条能反映差异分布并支持点击跳转
- 上一处 / 下一处差异可循环跳转并滚动到目标行
- 弹窗在 1280×840 窗口下利用率明显提升
- `pnpm typecheck` 通过

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
