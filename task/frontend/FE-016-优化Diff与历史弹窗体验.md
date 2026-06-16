# FE-016 优化 Diff 与历史弹窗体验

## 状态

done

## 优先级

P1

## 所属阶段

frontend

## 依赖任务

- FE-008
- FE-015

## 需求来源

- [docs/mactfs-ui-enhancement-requirements.md](/Users/fenghp/Desktop/DEV/project/mydev/docs/mactfs-ui-enhancement-requirements.md) R3

## 目标

把对比与历史相关弹窗从“能用”提升到“好用”：更大的可视面积、左右分栏对照、
差异概览定位与差异间快速跳转。

## 实现范围

- 历史 / Diff / 目录对比 / 文件查看弹窗尺寸提升（接近满屏）
- Diff 弹窗支持「统一视图 / 左右分栏」切换，左侧旧版、右侧新版、行级对齐
- Diff 差异概览条：按差异块标记位置，点击跳转
- 「上一处 / 下一处差异」按钮与差异计数定位
- 视图状态（统一 / 分栏）在同一会话内记忆

## 不在范围

- 不引入 Monaco / CodeMirror
- 不做语法高亮
- 不做行内字符级 diff

## 涉及文件

- [mactfsui/app/components/explorer/diff-dialog.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/diff-dialog.tsx)
- [mactfsui/app/components/explorer/history-dialog.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/history-dialog.tsx)
- [mactfsui/app/components/explorer/compare-dialog.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/compare-dialog.tsx)
- [mactfsui/app/components/explorer/file-view-dialog.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/file-view-dialog.tsx)

## 验收标准

- Diff 可在统一视图与左右分栏间切换，分栏视图新旧版本行级对齐
- 概览条能反映差异分布并支持点击跳转
- 上一处 / 下一处差异可循环跳转并滚动到目标行
- 弹窗在 1280×840 窗口下利用率明显提升
- `pnpm typecheck` 通过

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

### 实际修改文件

- `mactfsui/app/components/explorer/diff-dialog.tsx`（重写）：统一 / 左右分栏双视图、差异块模型、概览条、差异导航
- `mactfsui/app/components/explorer/history-dialog.tsx` / `compare-dialog.tsx` / `file-view-dialog.tsx`：弹窗尺寸提升至约 88~92svh / 88~94vw

### 实际实现内容

- Diff 弹窗尺寸 94vw × 92svh（1280×840 窗口实测 1203×773，利用率 ~94%）
- 「统一视图 / 左右分栏」切换：分栏视图把连续删除块与新增块按顺序两两对齐（changed 行左右同行），左旧右新、行号独立、缺行侧灰底；视图选择记忆在 sessionStorage（同一会话内有效）
- 差异概览条：按差异块在全文中的位置 / 长度渲染标记（当前块高亮主色），点击标记直接滚动跳转
- 「上一处 / 下一处差异」按钮：循环跳转并平滑滚动至目标行上 1/3 处，旁边显示「N / 总块数」
- 行高固定 20px，按索引精确换算滚动位置；统一视图长行不再折行（横向滚动），保证概览条与导航定位准确
- 搜索高亮与「仅看差异」在两种视图下均可用

### 已执行测试

- `pnpm typecheck`：通过
- Playwright 浏览器验证（200 行 / 3 个差异块的构造数据）：
  - 弹窗尺寸 1203×773（视口 1280×840）
  - 差异块计数「— / 3」→ 连点两次「下一处差异」→「2 / 3」
  - 概览条 3 个标记，点击第 1 处跳转（scrollTop 367，差异行 30 居于可视区上 1/3）
  - 分栏视图截图确认：old line 30 / 30b 在左红底，new line 30 在右绿底，行级对齐，缺行侧灰底
  - sessionStorage 记忆 split 模式

### 是否满足验收标准

- 统一 / 左右分栏切换且分栏行级对齐：满足
- 概览条反映差异分布并可点击跳转：满足
- 上一处 / 下一处差异循环跳转并滚动：满足
- 1280×840 下弹窗利用率明显提升：满足
- `pnpm typecheck` 通过：满足

### 遗留问题

- 行内字符级 diff、语法高亮按任务边界未做
