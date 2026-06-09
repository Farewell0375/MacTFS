# UIR-002 重构登录 Collection 与 Workspace 上下文

## 状态

todo

## 优先级

P0

## 所属阶段

frontend-refactor

## 依赖任务

- UIR-001
- FE-002
- FE-004

## 需求来源

- [UIR-000-前端重构与UI功能调整方案.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-000-前端重构与UI功能调整方案.md)

## 目标

将 Collection 选择前置到登录页，进入工作台后固定 Collection；Workspace 由后端自动选择或创建，前端不提供 Workspace 选择。

## 实现范围

- 登录成功后加载 Collection 列表。
- 如果配置中有上次使用的 Collection，登录页默认选中。
- 只有一个 Collection 时默认选中但仍展示名称。
- 用户必须在登录页确认 Collection 后进入工作台。
- 工作台内移除 Collection 切换入口。
- 工作台顶部展示固定 Collection 和当前 Workspace。
- Workspace 不允许用户手动选择。
- 本机已有 Workspace 时自动使用，没有则由后端创建默认 Workspace。
- `ServerTreePanel` 改为只接收固定 Collection。
- 移除 `ServerTreePanel` 内部 Collection 列表和 `onCollectionSelect`。

## 不在范围

- 不做多 Profile。
- 不支持工作台内切换 Collection。
- 不允许用户选择 Workspace。
- 不实现 Mapping 弹窗重构。

## 涉及文件

- [mactfsui/app/routes/home.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/routes/home.tsx)
- [mactfsui/app/components/explorer/server-tree-panel.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/server-tree-panel.tsx)
- [mactfsui/app/components/app/app-shell.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/app/app-shell.tsx)
- [mactfsui/app/lib/api](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/api)

## 验收标准

- 登录页可以选择 Collection。
- 登录页默认选中上次使用的 Collection。
- 进入工作台后不能切换 Collection。
- 左侧树只展示当前固定 Collection 的目录。
- 顶部展示服务器、Collection、Workspace。
- 前端没有 Workspace 选择控件。

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
