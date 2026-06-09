# UIR-005 实现 Mapping、History、目录对比弹窗

## 状态

todo

## 优先级

P0

## 所属阶段

frontend-refactor

## 依赖任务

- UIR-004
- FE-006
- FE-007
- FE-011

## 需求来源

- [UIR-000-前端重构与UI功能调整方案.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-000-前端重构与UI功能调整方案.md)

## 目标

将 Mapping、History、目录对比从中间文件列表内嵌区域迁移到弹窗，释放主工作区空间。

## 实现范围

- Mapping 创建改为弹窗。
- Mapping 弹窗展示服务端路径、本地目录、是否立即 Get Latest、创建按钮。
- Mapping 本地目录由用户选择或输入。
- 是否立即 Get Latest 由用户选择，不强制。
- History 改为大尺寸弹窗。
- History 弹窗展示目标路径、changeset 列表、目录 changeset 文件列表。
- History 文件版本支持进入 Diff。
- 目录对比改为弹窗。
- 目录对比弹窗展示服务端路径、本地路径、重新对比、隐藏已同步。
- 目录对比弹窗支持按状态筛选，例如本地修改、服务器更新、本地新增、待删除。
- 目录对比结果项操作使用右键菜单。
- 新增本地文件到服务器只处理 `localOnly` 项，用户选中后加入 pending add。

## 不在范围

- 不实现文件查看弹窗。
- 不实现 Diff 编辑器升级。
- 不实现 Get Latest 冲突弹窗。
- 不做新路由。

## 涉及文件

- [mactfsui/app/components/explorer/folder-items-panel.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/folder-items-panel.tsx)
- [mactfsui/app/components/explorer/history-panel.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/history-panel.tsx)
- [mactfsui/app/routes/home.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/routes/home.tsx)
- [mactfsui/app/components](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components)

## 验收标准

- 中间文件列表不再内嵌 Mapping 表单、History 面板、目录对比结果。
- 未映射目录可以通过弹窗创建 Mapping。
- History 弹窗可以展示文件或目录历史。
- 目录对比弹窗可以筛选差异状态。
- 目录对比结果项通过右键菜单执行对象操作。

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写：

- 实际修改文件：
- 实际实现内容：
- 测试结果：
- 遗留问题：
