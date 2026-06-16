# FE-009 实现 Get Latest 与 Checkout 冲突处理

## 状态

done

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-002
- FE-006
- FE-008
- SERVER-007

## 需求来源

- PRD 七、7.3 目录对比并处理差异
- [mactfsui/FRONTEND_SPEC.md](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/FRONTEND_SPEC.md)

## 目标

把 Get Latest 和 Checkout 的冲突流程收口成统一体验，支持目录递归、跳过项提示和逐文件选择。

## 实现范围

- Get Latest 递归执行入口
- Checkout 自动先执行 Get Latest
- 冲突弹窗
- 跳过 pending edit 子项提示
- 冲突文件逐项选择服务器版本或保留本地版本
- 冲突文件 Diff 入口
- 批量应用选择

## 不在范围

- 不实现手动冲突块编辑
- 不对二进制文件做自动合并编辑
- 不做后台异步任务模型
- 不实现复杂重试机制

## 涉及文件

- [mactfsui/app/components/explorer](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer)
- [mactfsui/app/routes/home.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/routes/home.tsx)
- [mactfsui/app/lib/api](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/api)
- [mactfs/src/main/java/com/mydev/mactfs/server](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/server)

## 验收标准

- 文件夹 Get Latest 可以递归执行
- Checkout 能复用统一冲突弹窗
- 冲突文件可以打开 Diff
- 跳过项和冲突项在 UI 上有明确反馈
- 应用服务器版本或保留本地版本后，前端能正确刷新状态

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
```

## 完成记录

### 实际修改文件

- `mactfsui/app/components/explorer/conflict-dialog.tsx`（新增）：统一冲突弹窗
- `mactfsui/app/components/app/workspace-shell.tsx`：实现 `runGetLatest` / `runCheckout` 执行编排；动作分发器接管 getLatest / checkout；新增顶部通知条（info / error）与忙碌指示；DialogState 增加 conflicts；冲突处理完成后刷新当前目录与挂起更改
- 服务端无改动（SERVER-007 / FE-002 已提供 get-latest、checkout、conflicts、conflicts/apply 接口）

### 实际实现内容

- 获取最新：目录右键「获取最新」按递归执行（文件不递归）；完成后顶部通知展示「更新 / 冲突 / 跳过失败」计数；冲突数 > 0 时自动打开冲突弹窗并刷新列表
- 签出：自动先执行 Get Latest，若有冲突则提示「先处理冲突再签出」并打开冲突弹窗、不执行签出；无冲突则执行 checkout，跳过项（如 pending edit 子项）在通知条中列出前 3 条
- 冲突弹窗：加载范围内未解决冲突；每行 Select 选择「暂不处理 / 采用服务器版本 / 保留本地版本」；「全部采用服务器 / 全部保留本地」批量设置；「应用选择（N）」逐项调用 `/api/conflicts/apply`，失败项标注可重试；全部解决后自动关闭并刷新；冲突行内置 Diff 按钮（本地 vs latest，叠加弹窗，不关闭冲突列表）
- 「稍后处理」可关闭弹窗；若期间已有成功应用，关闭时仍会触发刷新

### 已执行测试

- `pnpm typecheck`：通过
- 服务端无改动，未重跑 gradle build
- Playwright 浏览器验证（mock API，未改源码）：
  - 目录「获取最新」→ 自动弹出冲突弹窗（2 个冲突），`recursive=true` 调用 1 次
  - 冲突行 Diff → 在冲突弹窗之上叠加 Diff 弹窗，内容正确
  - 「全部采用服务器」→「应用选择（2）」→ 全部成功 → 弹窗关闭，顶部通知「冲突处理完成，已刷新状态」
  - 冲突解决后对目录「签出编辑」→ 自动先 Get Latest（无冲突）→ checkout → 通知「签出完成：2 项，跳过 1 项（$/Demo/b.txt 已签出，跳过）」

### 是否满足验收标准

- 文件夹 Get Latest 可以递归执行：满足
- Checkout 能复用统一冲突弹窗：满足
- 冲突文件可以打开 Diff：满足
- 跳过项和冲突项在 UI 上有明确反馈：满足（顶部通知 + 弹窗计数）
- 应用取舍后前端能正确刷新状态：满足（目录列表 + 挂起更改）

### 遗留问题

- 操作通知目前为顶部细条文本，FE-012 会把执行反馈与操作日志面板联动
- 真实 TFS 冲突场景验证留待 FEATURE-002 / FEATURE-003
