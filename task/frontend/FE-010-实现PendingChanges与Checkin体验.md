# FE-010 实现 Pending Changes 与 Checkin 体验

## 状态

todo

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-006
- FE-008
- SERVER-007

## 需求来源

- PRD 六、6.8 Pending Changes
- PRD 六、6.9 Checkin
- [mactfsui/FRONTEND_SPEC.md](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/FRONTEND_SPEC.md)

## 目标

保留右侧 Changes 面板作为签入主入口，并把 Pending Changes 的查看、比较、撤销和 Included / Excluded 体验补齐。

## 实现范围

- Pending Changes 列表
- Included / Excluded 分组
- comment 输入与必填校验
- 签入按钮、签入中状态、成功后的 changeset 反馈
- Pending Changes 项右键菜单
- 成功签入后的目录、树节点、Pending 刷新策略

## 不在范围

- 不实现 Checkin 弹窗
- 不做 Work Item
- 不做 Check-in Policy UI
- 不做 Excluded 持久化

## 涉及文件

- [mactfsui/app/components/inspector](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/inspector)
- [mactfsui/app/routes/home.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/routes/home.tsx)
- [mactfsui/app/lib/api](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/api)

## 验收标准

- Checkin 保留在右侧 Changes 面板
- comment 为空时不能签入
- Included / Excluded 可以维护
- pending add 文件没有服务器比较入口
- Checkin 成功后能刷新 Pending Changes 和当前目录状态

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
