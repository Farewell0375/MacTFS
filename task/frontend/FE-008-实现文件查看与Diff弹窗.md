# FE-008 实现文件查看与 Diff 弹窗

## 状态

done

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-002
- FE-006
- FE-007
- SERVER-009

## 需求来源

- PRD 六、6.11 Diff
- [mactfsui/FRONTEND_SPEC.md](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/FRONTEND_SPEC.md)

## 目标

提供文件只读查看和文本 Diff 能力，支持从文件列表、History、Pending Changes、目录对比结果进入。

## 实现范围

- 文件查看弹窗
- 本地文件 vs 服务器 latest Diff 弹窗
- 两个历史版本 Diff 弹窗
- 来源标识、大小、编码、搜索、行号、差异高亮
- 大文件、二进制文件、非 Mapping 路径的提示

## 不在范围

- 不提供文件编辑能力
- 不实现 Monaco / CodeMirror 必选升级
- 不实现三方合并编辑
- 不做多标签页 Diff

## 涉及文件

- [mactfsui/app/components/explorer](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer)
- [mactfsui/app/lib/api](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/api)
- [mactfsui/package.json](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/package.json)

## 验收标准

- 已映射文件可查看本地内容
- 未映射文件可查看服务器 latest 内容
- 可从文件列表、History 或目录对比进入 Diff
- 大于 5MB 文件不直接渲染内容
- 非 Mapping 路径的本地内容读取被拒绝

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
```

## 完成记录

### 实际修改文件

- `mactfsui/app/components/explorer/file-view-dialog.tsx`（新增）：文件查看弹窗
- `mactfsui/app/components/explorer/diff-dialog.tsx`（新增）：文本 Diff 弹窗（本地 vs latest / 历史版本对比共用）
- `mactfsui/app/components/app/workspace-shell.tsx`：DialogState 扩展 viewFile / diff，分发器接管 `viewFile`、`diffLocalLatest`，History 弹窗注入 `onDiffRevisions` 进入历史版本 Diff

### 实际实现内容

- 文件查看：本地文件 / 服务器 latest 来源切换（未映射时本地禁用并提示），展示大小与版本号，行号 + 搜索高亮（命中行数 badge）；二进制、超大文件不渲染内容并给出明确提示；非 Mapping 路径由服务端拒绝并在弹窗内展示错误信息
- Diff：后端前缀行（` `/`-`/`+`）解析为双侧行号结构；删除红底、新增绿底、搜索命中琥珀高亮；展示 source/target 标签与差异行数；支持「仅看差异」；两个入口——文件右键「与最新版本比较」、History 弹窗勾选两个版本「对比所选版本」
- 未实现编辑能力，无 Monaco / CodeMirror 引入，无新依赖

### 已执行测试

- `pnpm typecheck`：通过
- 服务端无改动，未重跑 gradle build（FE-002 后接口契约未变）
- Playwright 浏览器验证（mock API，未改源码）：
  - 未映射文件 `readme.md` → 默认服务器 latest 内容，行号正常
  - 6MB 文件 → 「文件过大（6.0 MB），不直接渲染内容」
  - 已映射文件 `a.txt` → 默认本地内容，搜索 hello 命中 1 行
  - 「与最新版本比较」→ 双行号 + 红绿差异高亮 + 标签 + 2 行差异
  - 文件历史勾选 C88 / C102 → 「对比所选版本」→ 历史版本 Diff 正常

### 是否满足验收标准

- 已映射文件可查看本地内容：满足
- 未映射文件可查看服务器 latest 内容：满足
- 可从文件列表、History 或目录对比进入 Diff：满足（目录对比结果项与列表共用同一右键菜单）
- 大于 5MB 文件不直接渲染内容：满足（依据服务端 `tooLarge`）
- 非 Mapping 路径的本地内容读取被拒绝：满足（服务端校验，前端展示错误）

### 遗留问题

- 编码信息后端契约未提供，界面未展示编码字段
- Diff 为逐行朴素对比（与后端 `buildTextDiff` 算法一致），未做块级折叠
