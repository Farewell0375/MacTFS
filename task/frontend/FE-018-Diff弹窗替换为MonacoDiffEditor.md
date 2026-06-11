# FE-018 Diff 弹窗替换为 Monaco DiffEditor

## 状态

done

## 优先级

P1

## 所属阶段

frontend

## 依赖任务

- FE-016

## 需求来源

- 用户实测反馈：文本对比展示效果需要增强（字级高亮、语法着色、折叠未变动区域）

## 目标

把 Diff 弹窗的手写渲染替换为 Monaco DiffEditor（VS Code 同源组件），
后端接口零改动，直接获得字级高亮、语法着色、折叠未变动区域与内置搜索。

## 实现范围

- 引入 `monaco-editor` 依赖并配置 vite worker 加载
- Diff 弹窗内容区替换为 Monaco DiffEditor（只读）
- 从后端带前缀行列表无损还原左右两侧全文喂给 Monaco
- 保留：统一视图 / 左右分栏切换、上一处 / 下一处差异导航、仅看差异（折叠未变动区域）、搜索
- 按文件后缀自动匹配语法着色语言

## 不在范围

- 不改后端 diff 接口
- 不替换冲突查看与只读文件查看弹窗

## 涉及文件

- [mactfsui/app/lib/monaco.ts](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/monaco.ts)
- [mactfsui/app/components/explorer/diff-dialog.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/diff-dialog.tsx)
- [mactfsui/package.json](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/package.json)

## 验收标准

- 对比弹窗使用 Monaco 渲染，具备字级高亮与语法着色
- 统一 / 分栏切换、差异导航、仅看差异可用
- `pnpm typecheck` 与 `pnpm build` 通过

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
pnpm build
```

## 完成记录

### 实际修改文件

- `mactfsui/package.json`：新增依赖 `monaco-editor`
- `mactfsui/app/lib/monaco.ts`（新增）：Monaco 客户端引导，注册 editor/json/css/html/ts worker（vite `?worker` 方案），提供按后缀匹配语言的 `detectLanguage`
- `mactfsui/app/components/explorer/diff-dialog.tsx`：内容区替换为 Monaco DiffEditor（动态 import 按需加载）；统一视图=inline、左右分栏=side-by-side；上一处/下一处基于 `getLineChanges` 定位；仅看差异映射 `hideUnchangedRegions`；搜索按钮触发内置 Cmd+F；移除手写 UnifiedView/SplitView/DiffMinimap 渲染代码

### 实际实现内容

- 后端零改动：前端把带前缀行列表（" "/"-"/"+"）还原为左右两侧全文（空格+`-` = 旧版，空格+`+` = 新版）交给 Monaco 自行计算与渲染
- Monaco 主包与 worker 均为独立 chunk，仅在打开对比弹窗时加载

### 已执行测试

- `pnpm typecheck`：通过
- `pnpm build`：通过，产物含 monaco 主包与 5 个 worker 独立 chunk

### 未执行测试及原因

- 真实 TFS 环境下弹窗视觉验收待用户在桌面应用中确认（dev 模式热更新即可看到）

### 是否满足验收标准

- Monaco 渲染、字级高亮、语法着色：满足（Monaco 内置）
- 视图切换 / 差异导航 / 仅看差异：满足
- typecheck 与 build：通过

### 遗留问题

- 冲突查看、只读文件查看弹窗仍为原样式，后续如需统一可另立任务
