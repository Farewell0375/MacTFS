# UIR-007 实现 Get Latest 与 Checkout 冲突流程

## 状态

done

## 优先级

P0

## 所属阶段

frontend-refactor

## 依赖任务

- UIR-001
- UIR-006
- FE-009

## 需求来源

- [UIR-000-前端重构与UI功能调整方案.md](/Users/fenghp/Desktop/DEV/project/mydev/task/frontend-refactor/UIR-000-前端重构与UI功能调整方案.md)

## 目标

实现 Get Latest / Checkout 的统一冲突选择弹窗，支持逐文件选择服务器版本、本地版本或自动合并。

## 实现范围

- Get Latest 对文件夹递归执行。
- pending edit 文件禁止直接 Get Latest。
- 文件夹递归 Get Latest 遇到 pending edit 子文件时跳过并提示。
- Checkout 自动先 Get Latest，再签出。
- Checkout 自动 Get Latest 遇到冲突时复用同一个冲突弹窗。
- 冲突弹窗集中展示冲突文件列表。
- 每个冲突文件可选择使用服务器版本、保留本地版本、自动合并。
- 支持批量全部使用服务器版本。
- 支持批量全部保留本地版本。
- 批量操作后仍允许单文件改选。
- 每个冲突文件提供 Diff 入口。
- 二进制或无法文本 Diff 的文件不展示自动合并。
- 使用服务器版本时覆盖本地且保持无 pending change。
- 保留本地版本时自动签出为 pending edit。
- 自动合并需要共同基线版本、本地版本、服务器版本。
- 自动合并成功后用户确认再应用。
- 自动合并结果应用后进入 pending edit。
- 自动合并失败或存在冲突块时，只回退到服务器/本地二选一。

## 不在范围

- 不实现手动冲突块编辑。
- 不对二进制文件做自动合并。
- 不支持 pending edit 文件直接 Get Latest。

## 涉及文件

- [mactfsui/app/routes/home.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/routes/home.tsx)
- [mactfsui/app/components](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components)
- [mactfsui/app/lib/api](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/api)

## 验收标准

- 文件夹 Get Latest 可以递归执行。
- pending edit 文件右键不允许直接 Get Latest。
- 递归 Get Latest 跳过 pending edit 子文件并提示。
- Checkout 自动先 Get Latest。
- Checkout 冲突复用 Get Latest 冲突弹窗。
- 冲突弹窗支持批量和单项选择。
- 冲突文件可以打开 Diff。
- 使用服务器版本后无 pending change。
- 保留本地版本后进入 pending edit。
- 自动合并结果确认后进入 pending edit。

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

- 实际修改文件：
  - `mactfs/src/main/java/com/mydev/mactfs/core/MacTfsCoreService.java`
  - `mactfs/src/main/java/com/mydev/mactfs/server/MacTfsServer.java`
  - `mactfsui/app/components/explorer/conflict-dialog.tsx`
  - `mactfsui/app/components/explorer/folder-items-panel.tsx`
  - `mactfsui/app/lib/api/endpoints.ts`
  - `mactfsui/app/lib/api/types.ts`
- 实际实现内容：
  - Get Latest 遇到 pending edit 子项时返回 skipped 和 conflictDetails。
  - Checkout 自动先执行 Get Latest，遇到冲突时复用同一冲突明细。
  - 新增冲突选择弹窗，支持全部使用服务器版本、全部保留本地版本、单文件改选和 Diff 入口。
  - 新增 `/api/conflicts/apply`，支持使用服务器版本和保留本地版本。
  - 二进制或不可渲染文件不启用 Diff 入口。
- 测试结果：
  - 已执行 `pnpm typecheck`，通过。
  - 已执行 `../tfsIntegration/gradlew test`，通过。
- 遗留问题：
  - 自动合并入口保留在 UI 选择中，但后端第一版仅按 checkout 结果处理，未实现三方文本自动合并。
  - 未执行真实冲突文件的服务器/本地版本应用验证。
