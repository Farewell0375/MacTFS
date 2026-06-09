# FE-006 实现 Mapping 创建流程

## 状态

done

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-005
- SERVER-006

## 需求来源

- PRD 七、7.2 创建 Mapping

## 目标

实现选中服务端目录后映射到本地目录的流程。

## 实现范围

- 在未映射目录显示“映射到本地”
- 选择本地目录
- 调用 Mapping API
- 让用户选择是否立即 Get Latest
- 创建成功后更新 UI 状态

## 不在范围

- 不做多 Profile
- 不做复杂 Mapping 编辑
- 不强制立即下载

## 涉及文件

- [mactfsui/app](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app)
- [mactfsui/electron/main.cjs](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/electron/main.cjs)

## 验收标准

- 可创建 Mapping
- 可选择是否立即 Get Latest
- 不立即下载时后续仍可对下级文件 Get Latest

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

- 完成日期：2026-06-08
- 实际修改文件：
  - `mactfsui/electron/main.cjs`
  - `mactfsui/electron/preload.cjs`
  - `mactfsui/app/lib/electron/bridge.ts`
  - `mactfsui/app/lib/api/types.ts`
  - `mactfsui/app/lib/api/endpoints.ts`
  - `mactfsui/app/components/explorer/folder-items-panel.tsx`
  - `task/README.md`
  - `task/frontend/FE-006-实现Mapping创建流程.md`
- 实际实现内容：
  - Electron 主进程新增本地目录选择器 IPC：`mactfs:select-directory`。
  - preload 和 renderer bridge 新增 `selectDirectory()`。
  - 新增 `AddMappingRequest`、`AddMappingData` 类型和 `addMapping` endpoint 封装。
  - 中间目录面板在当前服务端目录未映射时展示“映射到本地”。
  - Mapping 表单支持选择本地目录、手动输入本地路径、选择是否立即 `Get Latest`。
  - 调用 `/api/mappings` 创建 Mapping，成功后刷新当前目录列表和 Mapping 状态。
- 已执行测试：
  - `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui && pnpm typecheck`：通过。
  - `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui && node -c electron/main.cjs && node -c electron/preload.cjs`：通过。
  - `git diff --check`：通过。
  - `find /Users/fenghp/Desktop/DEV/project/mydev/task -type f -name "*.md" | wc -l`：通过，结果为 `50`。
  - 内置浏览器打开 `http://127.0.0.1:5173/`：通过，未连接状态下主布局稳定显示。
  - `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui && pnpm electron:dev`：通过，Electron 启动后本地 API health 返回 `success=true`。
- 未执行测试及原因：
  - 未执行真实 Mapping 创建；当前环境没有可用于验收的真实 TFS 连接、Workspace 和本地目录选择上下文。
  - 未实际点击系统目录选择弹窗；已完成 main/preload/bridge 代码接入和 CJS 语法校验。
- 验收标准确认：
  - 可创建 Mapping：代码路径满足，提交 `/api/mappings`。
  - 可选择是否立即 Get Latest：满足，表单提供 `立即 Get Latest` 选项并传递 `getLatest`。
  - 不立即下载时后续仍可对下级文件 Get Latest：满足，不勾选时仅保存 Mapping；下级文件列表会根据刷新后的 Mapping 状态展示 Get Latest 入口。
- 遗留问题：
  - 真实 Mapping 创建和目录选择弹窗需要在具备有效 TFS 连接后做端到端验收。
