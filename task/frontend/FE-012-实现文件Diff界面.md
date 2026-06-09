# FE-012 实现文件 Diff 界面

## 状态

done

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-011
- SERVER-009

## 需求来源

- PRD 六、6.11 Diff

## 目标

实现本地 vs latest 和两个历史版本之间的文本 diff 展示。

## 实现范围

- 打开文件 diff 页面或面板
- 展示本地文件 vs 服务器 latest
- 展示历史版本 A vs 历史版本 B
- 文本 diff 左右对比
- 二进制或不支持文件显示提示

## 不在范围

- 不做三方 merge
- 不做二进制可视化
- 不做冲突解决器

## 涉及文件

- [mactfsui/app](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app)

## 验收标准

- 可从目录对比结果打开 diff
- 可从历史记录选择两个版本打开 diff
- 大文件或不支持类型有明确提示

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

- 实际修改文件：
  - `/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/api/types.ts`
  - `/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/api/endpoints.ts`
  - `/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/diff-panel.tsx`
  - `/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/history-panel.tsx`
  - `/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/folder-items-panel.tsx`
  - `/Users/fenghp/Desktop/DEV/project/mydev/task/README.md`
  - `/Users/fenghp/Desktop/DEV/project/mydev/task/frontend/FE-012-实现文件Diff界面.md`
- 实际实现内容：
  - 新增 `DiffLocalLatestRequest`、`DiffRevisionsRequest`、`TfsTextDiff`、`TextDiffData` 类型。
  - 新增 `diffLocalLatest` 和 `diffRevisions` API 封装，对接 `POST /api/diff/local-latest` 与 `POST /api/diff/revisions`。
  - 新增 `DiffPanel`，支持本地文件 vs 服务器 latest、两个历史 changeset 之间的文本 diff 展示。
  - `DiffPanel` 将后端统一 diff lines 转成左右两栏文本展示，并在接口失败或无 diff 内容时提示大文件、二进制或不支持类型无法展示文本 diff。
  - `HistoryPanel` 支持选择两个文件历史版本后打开真实 Diff 面板。
  - `FolderItemsPanel` 新增 Diff 打开状态，目录对比结果中选择单个可对比文件后可打开本地 vs latest Diff。
  - 切换连接、Collection 或服务端目录时同步关闭已打开的 History 和 Diff 面板，避免旧路径内容残留。
- 已执行测试：
  - `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui && pnpm typecheck`：通过。
  - `git diff --check`：通过。
  - Browser 打开 `http://127.0.0.1:5173/`：工作台、连接页、Inspector、Console 基础结构可渲染；当前非 Electron 环境显示未检测到 preload。
- 未执行测试及原因：
  - 未执行真实本地 vs latest Diff；当前环境没有真实 TFS 凭据、连接会话和可对比的映射工作区。
  - 未执行真实历史版本 A/B Diff；当前环境没有可查询的 TFS 文件历史。
  - 未验证真实大文件或二进制文件响应；该提示由 Diff API 失败或空 diff 响应统一展示。
- 是否满足验收标准：
  - 目录对比结果已接入单文件 Diff 入口。
  - 文件历史已支持选择两个版本并打开 Diff 面板。
  - 大文件、二进制或不支持类型在 Diff 面板中有明确提示。
- 遗留问题：
  - 真实 TFS Diff 成功路径、权限失败、二进制文件和大文件路径需要在后续端到端验收中验证。
  - Browser 非 Electron 预览中控制台存在 lucide/react `Invalid hook call` 报错；当前页面 DOM 仍可渲染，且未连接状态不会挂载本次 FE-012 的 Diff 组件，建议后续作为前端整体问题单独排查。
