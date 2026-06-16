# FE-010 实现 Pending Changes 与 Checkin 体验

## 状态

done

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

### 实际修改文件

- `mactfsui/app/components/inspector/changes-panel.tsx`（重写）：Included / Excluded 分组列表、勾选切换、comment 输入与必填校验、签入按钮与签入中状态
- `mactfsui/app/components/app/workspace-shell.tsx`：新增 `excludedKeys` 共享状态（刷新时自动清理悬挂键）、`handleCheckin`（只提交 Included、成功展示 changeset、刷新挂起与目录）；分发器接管 `delete` / `undo` 实际执行
- `mactfsui/app/components/ui/textarea.tsx`（新增）：shadcn 基础组件

### 实际实现内容

- 右侧 Changes 面板保持签入唯一入口（不使用弹窗）；列表按 Included / Excluded 分组，勾选即切换归属，Excluded 项淡化显示
- comment 必填：注释为空或 Included 为空或签入中时按钮禁用，空注释时有「填写注释后才能签入」提示
- 签入：`POST /api/checkin` 只带 Included 路径；成功后顶部通知「签入成功：changeset N，提交 M 项」、清空注释、刷新挂起更改与当前目录列表（树节点为纯目录结构无需变更）
- Pending 项右键菜单沿用统一动作模型：pendingAdd 文件无「与最新版本比较 / 查看历史」入口；「撤销更改」「挂起删除」现已实际执行（`/api/files/undo`、`/api/files/delete`）并刷新
- Excluded 不持久化（按任务边界），刷新后自动剔除已不存在的项

### 已执行测试

- `pnpm typecheck`：通过
- Playwright 浏览器验证（mock API，未改源码）：
  - 3 项挂起默认全部 Included；无注释时签入按钮禁用
  - 勾掉 new.txt → 移入 Excluded 分组，「将签入 2 项」
  - 填注释签入 → 请求只含 2 个 Included 路径 → 通知「签入成功：changeset 103，提交 2 项」→ 列表只剩 Excluded 的 new.txt
  - pendingAdd 项右键菜单仅「查看文件 / 撤销更改」→ 点撤销 → 通知「已撤销 1 项更改」、列表清空

### 是否满足验收标准

- Checkin 保留在右侧 Changes 面板：满足
- comment 为空时不能签入：满足
- Included / Excluded 可以维护：满足
- pending add 文件没有服务器比较入口：满足
- Checkin 成功后能刷新 Pending Changes 和当前目录状态：满足

### 遗留问题

- 真实 TFS 签入验证留待 FEATURE-004
- 操作反馈与日志面板联动在 FE-012 统一处理
