# UIR-006 实现文件查看与 Diff 编辑器

## 状态

todo

## 优先级

P0

## 所属阶段

frontend-refactor

## 依赖任务

- UIR-001
- UIR-004
- FE-012

## 需求来源

- [UIR-000-前端重构与UI功能调整方案.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-000-前端重构与UI功能调整方案.md)

## 目标

实现文件只读查看弹窗和视觉升级后的 Diff 弹窗，支持代码高亮、搜索、行号和清晰的左右分栏对比。

## 实现范围

- 文件右键“查看”打开只读文件查看弹窗。
- Pending Changes 文件项右键“查看”打开只读文件查看弹窗。
- 已映射文件查看本地文件。
- 未映射文件查看服务器 latest 文件。
- 文件查看弹窗标识当前查看来源：本地文件或服务器文件。
- 文件查看支持代码高亮、搜索、行号和滚动区域。
- 单个文件超过 5MB 时不直接渲染，只提示文件过大。
- 本地文件查看必须限制在 Mapping 目录内。
- 二进制文件或无法读取文件展示明确提示。
- Diff 弹窗改为清晰左右分栏。
- Diff 支持代码高亮、搜索、行号、差异高亮、文件路径、版本标签、刷新入口。
- 优先评估 Monaco Editor；如果 Monaco 不适合，再评估 CodeMirror 6。

## 不在范围

- 不提供文件编辑能力。
- 不做手动冲突块编辑。
- 不做多文件 Diff 标签页。
- 不做大于 5MB 文件渲染。

## 涉及文件

- [mactfsui/package.json](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/package.json)
- [mactfsui/app/components/explorer/diff-panel.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/diff-panel.tsx)
- [mactfsui/app/components](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components)
- [mactfsui/app/lib/api](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/api)

## 验收标准

- 文件查看弹窗可以查看本地映射文件。
- 未映射文件可以查看服务器内容。
- 查看弹窗有代码高亮、搜索和行号。
- Diff 弹窗有左右分栏、代码高亮、搜索、行号和差异高亮。
- 大于 5MB 文件不渲染内容。
- 本地非 Mapping 路径不能被查看。

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
