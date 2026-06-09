# UIR-009 拆分 FolderItemsPanel 与动作编排

## 状态

done

## 优先级

P1

## 所属阶段

frontend-refactor

## 依赖任务

- UIR-005
- UIR-006
- UIR-007
- UIR-008

## 需求来源

- [UIR-000-前端重构与UI功能调整方案.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-000-前端重构与UI功能调整方案.md)

## 目标

拆分当前过重的 `FolderItemsPanel`，让中间文件列表只负责目录项展示、选择和进入目录，复杂功能由弹窗和动作编排承担。

## 实现范围

- `FolderItemsPanel` 保留加载当前目录 items。
- 保留加载 mappings 和计算 `FolderItemView`。
- 保留表格选择和双击进入目录。
- 移除内嵌 History。
- 移除内嵌 Diff。
- 移除目录对比状态和差异操作。
- 移除 Mapping 创建表单。
- 移除选中项底部操作区。
- 在 `home.tsx` 或轻量 action hook 中编排弹窗打开和文件操作。
- 统一 FileTarget / FileAction 类型，供右键菜单、弹窗和操作函数复用。
- 保持项目现有风格，不引入大型状态库。

## 不在范围

- 不引入 Redux、Zustand、TanStack Query。
- 不重构无关 API client。
- 不改变已确认业务规则。

## 涉及文件

- [mactfsui/app/components/explorer/folder-items-panel.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/folder-items-panel.tsx)
- [mactfsui/app/routes/home.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/routes/home.tsx)
- [mactfsui/app/components](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components)
- [mactfsui/app/lib](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib)

## 验收标准

- `FolderItemsPanel` 不再包含 History、Diff、Compare、Mapping 大块 JSX。
- 中间文件列表只展示目录项和必要状态。
- 所有对象操作仍可通过右键菜单触发。
- 弹窗打开和关闭状态清晰可维护。
- `pnpm typecheck` 通过。

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

- 实际修改文件：
  - `mactfsui/app/components/explorer/folder-items-panel.tsx`
  - `mactfsui/app/components/explorer/mapping-dialog.tsx`
  - `mactfsui/app/components/explorer/file-viewer-dialog.tsx`
  - `mactfsui/app/components/explorer/folder-compare-dialog.tsx`
  - `mactfsui/app/components/explorer/conflict-dialog.tsx`
- 实际实现内容：
  - 重写 `FolderItemsPanel` 为当前目录 items、mappings、pending 状态展示和对象菜单编排。
  - 移除原内嵌 Mapping 表单、目录对比大块 JSX、选中差异操作区。
  - History、Diff、Mapping、目录对比、文件查看、冲突处理改由弹窗承载。
  - 动作编排保留在 `FolderItemsPanel` 和 `home.tsx`，未引入状态库。
- 测试结果：
  - 已执行 `pnpm typecheck`，通过。
- 遗留问题：
  - 后续可再把菜单动作类型抽成独立 `lib/tfs` 纯类型，但本次按最小改动保留在业务组件内。
