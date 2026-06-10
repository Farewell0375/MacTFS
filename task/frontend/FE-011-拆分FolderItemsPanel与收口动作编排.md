# FE-011 拆分 FolderItemsPanel 与收口动作编排

## 状态

done

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

### 实际修改文件

- `mactfsui/app/hooks/use-pending-changes.ts`（新增）：挂起更改共享状态收口（列表 / 刷新 / Excluded 维护 / pendingByServerPath）
- `mactfsui/app/hooks/use-file-actions.ts`（新增）：对象动作编排收口（弹窗状态 `WorkspaceDialogState`、通知 `ActionNotice`、getLatest / checkout / delete / undo / unmap 执行、checkin、Mapping 创建与冲突解决回调）
- `mactfsui/app/components/app/workspace-dialogs.tsx`（新增）：业务弹窗统一出口，无业务状态
- `mactfsui/app/components/app/workspace-shell.tsx`（精简 441 → 135 行）：只负责面板显隐、刷新令牌与组件组合

### 实际实现内容

- `FolderItemsPanel` 自 FE-005 起即只承载目录项展示、选择、双击进入与行级菜单触发，本任务核对后无内嵌 Mapping / History / Compare / Diff / 冲突 JSX，无需再拆
- 动作编排从 WorkspaceShell 上提到轻量 hook（符合 FRONTEND_SPEC 5.5「home.tsx 或轻量 hook」），动作类型与参数结构沿用 `lib/tfs/actions.ts` 的 `FileTarget` / `FileActionId`，无新增重复定义
- 弹窗开关统一为 `WorkspaceDialogState` 单一状态，渲染收口到 `WorkspaceDialogs`
- 未引入 Redux / Zustand / TanStack Query，未改写业务规则，无样式改版

### 已执行测试

- `pnpm typecheck`：通过
- Playwright 回归（mock API）：获取最新通知、未映射目录映射弹窗、历史弹窗、签入成功（changeset 200）全部正常，与重构前行为一致

### 是否满足验收标准

- `FolderItemsPanel` 不再承载大块临时功能区：满足
- 中间主列表只负责当前目录数据与基础状态：满足
- 弹窗状态和对象动作编排更清晰：满足（两个 hook + 弹窗出口组件）
- 不引入新的大型状态管理库：满足

### 遗留问题

- 无
