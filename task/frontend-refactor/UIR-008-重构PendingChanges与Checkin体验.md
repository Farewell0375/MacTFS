# UIR-008 重构 Pending Changes 与 Checkin 体验

## 状态

todo

## 优先级

P0

## 所属阶段

frontend-refactor

## 依赖任务

- UIR-004
- UIR-006
- FE-008
- FE-010

## 需求来源

- [UIR-000-前端重构与UI功能调整方案.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-000-前端重构与UI功能调整方案.md)

## 目标

保留右侧 Changes 面板作为 Checkin 主入口，并为 Pending Changes 项完善右键菜单和刷新策略。

## 实现范围

- Checkin 保留在右侧 Changes 面板。
- 不实现 Checkin 弹窗。
- 右侧面板直接展示 Included / Excluded、comment 和提交按钮。
- Pending Changes 项支持右键菜单。
- 文件项支持查看、比较本地与服务器 Latest、撤销、查看历史、移到 Included、移到 Excluded。
- 文件夹项不展示内容比较。
- pending add 文件只显示查看和撤销，不显示服务器比较。
- 撤销指定 pending change 后刷新 Pending Changes。
- Checkin 成功后刷新当前目录文件列表和 Pending Changes。
- 只有涉及新增或删除目录时，刷新左侧树对应节点。

## 不在范围

- 不实现 Checkin Dialog。
- 不做 Work Item。
- 不做 Check-in Policy UI。
- 不做右侧收起数量徽标。

## 涉及文件

- [mactfsui/app/components/inspector/pending-changes-panel.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/inspector/pending-changes-panel.tsx)
- [mactfsui/app/routes/home.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/routes/home.tsx)
- [mactfsui/app/lib/api](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/api)

## 验收标准

- Checkin 不使用弹窗。
- Included / Excluded 仍可维护。
- Pending Changes 项右键菜单可用。
- pending add 文件没有比较入口。
- Checkin 成功后 Pending Changes 清空或更新。
- 当前目录状态刷新。

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
