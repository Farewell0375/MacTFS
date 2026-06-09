# FE-011 拆分 FolderItemsPanel 与收口动作编排

## 状态

todo

## 优先级

P1

## 所属阶段

frontend

## 依赖任务

- FE-007
- FE-008
- FE-009
- FE-010

## 需求来源

- [mactfsui/FRONTEND_SPEC.md](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/FRONTEND_SPEC.md)

## 目标

在主要交互落地后，把中间主列表的职责收口到目录项展示、选择和进入目录，避免继续膨胀成总控组件。

## 实现范围

- `FolderItemsPanel` 只保留目录项展示所需状态
- 移除内嵌 Mapping、History、Compare、Diff、冲突块 JSX
- 将弹窗开关和动作编排上提到 `home.tsx` 或轻量 hook
- 收口复用的动作类型和参数结构
- 保持不引入大型状态库

## 不在范围

- 不重构无关 API client
- 不引入 Redux、Zustand、TanStack Query
- 不改写已稳定的业务规则
- 不做样式大改版

## 涉及文件

- [mactfsui/app/components/explorer/folder-items-panel.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/folder-items-panel.tsx)
- [mactfsui/app/routes/home.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/routes/home.tsx)
- [mactfsui/app/hooks](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/hooks)
- [mactfsui/app/lib](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib)

## 验收标准

- `FolderItemsPanel` 不再承载大块临时功能区
- 中间主列表只负责当前目录数据与基础状态
- 弹窗状态和对象动作编排更清晰
- 不引入新的大型状态管理库

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
