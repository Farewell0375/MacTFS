# macTFS 前端重构与 UI 功能调整方案

## 一、背景与问题

当前 `mactfsui` 前端已经实现连接、Collection 目录树、文件列表、Mapping、目录对比、文件操作、Pending Changes、Checkin、History、Diff 和操作日志，但现有页面把过多功能压在一个工作台中，导致主操作区职责不清。

主要问题：

- Collection 在左侧树里可切换，但 TFS 的日常工作通常围绕一个已选 Collection 和 Workspace 展开，运行时频繁切换 Collection 会让目录树、Mapping、Pending Changes、History、Diff 的上下文变复杂。
- `FolderItemsPanel` 同时承载目录文件列表、Mapping 表单、目录对比结果、批量差异操作、History 面板、Diff 面板和选中项操作区，中间区域被多类临时功能挤占。
- `AppShell` 顶部有全局 `Get Latest`、`History` 入口，但这些操作实际应绑定到文件、文件夹或当前目录上下文，不适合作为全局按钮。
- 右侧 Inspector 同时展示 Pending Changes、Checkin 和本地服务信息，页面宽度不足时 Pending Changes 可用空间被压缩。
- 文件/目录相关操作目前主要依赖按钮，缺少符合桌面工具习惯的右键菜单。

## 二、重构目标

本次 UI 重构应围绕“连接后固定上下文，主区专注浏览，操作绑定对象，详情进入弹窗”来调整。

目标：

- 登录阶段完成 Collection 选择，进入工作台后不再提供 Collection 切换。
- 主工作台保持三栏结构，但左右区域可收缩，保证中间文件列表有足够空间。
- 中间区域只展示当前目录文件列表和必要的路径/状态信息，不再内嵌 History、Diff、目录对比详情。
- 文件、文件夹、目录树节点上的操作统一放入右键菜单。
- History、Diff、目录对比、Mapping 使用弹窗承载；Checkin 保留在右侧 Changes 面板。
- 底部操作日志保留为可收缩区域，不长期占用大量主工作区高度。

## 三、推荐信息架构

### 3.1 登录与连接页

推荐把登录页拆成连接信息和 Collection 选择两个步骤，但仍保留在 `routes/home.tsx` 的未连接视图内，避免现在就引入复杂路由。

流程：

1. 用户填写 TFS 地址、认证方式、域、用户名、密码。
2. 点击连接后调用 `/api/session/connect`。
3. 连接成功后加载 `/api/collections`。
4. 用户选择一个 Collection。
5. 系统自动使用本机已有 Workspace；如果没有，则创建默认 Workspace。
6. 将选中的 Collection 和当前 Workspace 保存到配置或当前会话状态。
7. 进入主工作台。

推荐规则：

- 登录页必须选择 Collection；如果只有一个 Collection，默认选中但仍展示名称。
- 如果配置中有上次使用的 Collection，登录页默认选中该 Collection。
- 工作台内不提供 Collection 切换按钮。
- 不允许用户手动选择 Workspace；本机已有 Workspace 就自动使用，没有就创建默认 Workspace。
- 默认 Workspace 命名规则由后端程序固定，不在前端暴露配置。
- 需要更换 Collection 时，走“断开/重新连接”或“连接设置”流程。

原因：

- Collection 是后续目录树、Mapping、Pending Changes、History、Diff 的共同上游上下文。
- 进入工作台后固定 Collection，可以减少跨面板状态重置和误操作。
- 当前 `ServerTreePanel` 内部维护 Collection 列表和切换逻辑，后续应下沉为只接收固定 `collection` 的目录树。

### 3.2 主工作台布局

推荐布局：

```text
┌──────────────────────────────────────────────────────────────┐
│ Top Bar: macTFS | Server | Collection | Workspace | Actions  │
├──────────────┬────────────────────────────────┬──────────────┤
│ Source Tree  │ Current Folder Items            │ Changes      │
│ collapsible  │ main workspace                  │ collapsible  │
├──────────────┴────────────────────────────────┴──────────────┤
│ Operation Console collapsible                                 │
└──────────────────────────────────────────────────────────────┘
```

区域职责：

- Top Bar：展示连接状态、服务器、Collection、Workspace、刷新服务、打开设置；不放文件操作主按钮。
- Source Tree：只展示固定 Collection 下的服务端目录树，支持右键目录操作。
- Current Folder Items：展示当前目录下文件/文件夹列表，是主工作区。
- Changes：展示 Pending Changes 摘要、Included/Excluded、Checkin 入口，可收缩。
- Operation Console：展示操作日志，可收缩，默认高度更低。

左右收缩建议：

- 左侧 Source Tree 默认宽度 280px，支持收起到 40px。
- 右侧 Changes 默认宽度 340px，支持收起到 40px。
- 中间使用 `minmax(480px, 1fr)`，优先保证文件列表可读。
- 左右栏收起状态都只保留展开按钮，不显示路径、列表或 Pending Changes 数量徽标。

不建议第一版做任意拖拽宽度：

- 当前项目没有可复用的 resizable 组件。
- 第一版使用固定展开/收起宽度更符合最小改动原则。
- 后续如果确实需要拖拽，再基于 Radix/shadcn 增补 `ResizablePanel`。

### 3.3 中间文件列表

中间区域应只保留高频浏览信息：

- 当前路径面包屑或路径栏。
- 当前目录 Mapping 状态。
- 文件/文件夹表格。
- 选中项状态摘要。
- 必要的刷新入口。

表格列建议：

- 名称
- 状态
- 最新版本
- 本地路径
- 修改时间

应从中间区域移出的内容：

- History 面板。
- Diff 面板。
- 目录对比详情列表。
- 大块 Mapping 创建表单。
- 批量差异操作面板。
- 选中项底部操作区。

中间文件列表的目录进入操作必须和左侧目录树保持同步。用户在中间双击或通过右键菜单“打开”进入目录时，左侧树应自动展开到该目录并选中对应节点；用户在左侧树选择目录时，中间文件列表也应切换到同一路径。

中间文件列表的单击只负责选中行，不进入目录；进入目录只通过双击或右键菜单“打开”触发。

## 四、右键菜单设计

### 4.1 右键菜单使用原则

推荐将“绑定到文件或文件夹”的操作全部放到右键菜单中。

适用对象：

- 左侧目录树节点。
- 中间文件列表行。
- Pending Changes 列表项。
- 目录对比结果项。

不建议只依赖右键菜单：

- `Checkin` 仍应在右侧 Changes 面板有明确入口，因为它是跨文件集合操作。
- `刷新`、`连接设置`、`打开日志` 这类全局操作保留在顶部或面板标题区。

### 4.2 左侧目录树右键菜单

目录树节点菜单：

- 获取最新版本
- 映射到本地
- 查看历史
- 与服务器文件对比
- 刷新子目录

启用条件：

- 获取最新版本：目录已映射。
- 映射到本地：目录未映射。
- 查看历史：已连接且有服务端路径。
- 与服务器文件对比：目录已映射。
- 刷新子目录：目录节点可用。

左侧目录树必须支持右键菜单。目录树右键菜单和中间文件列表右键菜单应复用同一套文件操作判断，避免同一路径在两个区域出现不同可用操作。

### 4.3 中间文件列表右键菜单

文件夹菜单：

- 打开
- 获取最新版本
- 签出
- 新增本地文件到服务器
- 删除
- 撤销挂起更改
- 查看历史
- 与服务器目录对比
- 映射到本地

文件菜单：

- 查看
- 获取最新版本
- 签出
- 删除
- 撤销挂起更改
- 查看历史
- 比较本地与服务器 Latest

启用条件：

- 获取最新版本：已映射且没有 pending edit；文件夹递归执行；发现本地与服务器不一致时，必须让用户选择使用服务器版本或保留本地版本。
- 签出：已映射且为版本控制项；执行时自动先获取最新版本再签出；文件夹允许递归签出，但执行前必须确认。
- 新增本地文件到服务器：仅文件夹或当前目录已映射时展示，先对比本地映射目录和服务器目录，再把选中的本地独有项加入 pending add。
- 删除：仅服务器已有的版本控制项可用，执行 pending delete；不删除本地未入库的 `localOnly` 文件。
- 撤销挂起更改：该项存在 pending change。
- 查看历史：服务端路径存在。
- 查看：文件可用；已映射且存在本地路径时查看本地文件，未映射时查看服务器文件。
- 与服务器目录对比：文件夹、已映射，用于找出本地和服务器不同的文件，方便后续签出、新增、获取最新等操作。
- 比较本地与服务器 Latest：文件、已映射、有本地路径，用于查看本地修改和服务器代码的异同。
- 映射到本地：仅未映射目录展示。

### 4.4 Pending Changes 右键菜单

Pending Change 菜单：

- 移到 Included
- 移到 Excluded
- 查看
- 撤销
- 查看历史
- 比较本地与服务器 Latest

Checkin 不放到单个 pending item 的右键菜单中，避免用户误以为只签入单项。签入仍通过右侧 Changes 面板提交 Included Changes。

Pending Changes 中的查看入口用于打开本地文件只读内容；比较入口用于查看待签入文件的本地内容与服务器 latest 的差异；撤销用于取消该文件的 pending change；历史记录用于查看该文件或目录的提交历史。

Pending Changes 的查看和比较入口只对文件显示；文件夹保留撤销、查看历史、移到 Included 和移到 Excluded。
pending add 文件没有服务器版本，只显示查看和撤销，不显示比较本地与服务器 Latest。

## 五、弹窗与独立视图设计

### 5.1 History 弹窗

History 应改为弹窗或大尺寸 Dialog，不再嵌入中间文件列表。

触发入口：

- 文件/文件夹右键菜单“查看历史”。
- 目录树节点右键菜单“查看历史”。

弹窗内容：

- 顶部展示目标路径。
- 左侧或主表格展示 changeset 列表。
- 右侧展示选中 changeset 的文件列表。
- 文件历史支持选择两个版本后打开 Diff。

推荐尺寸：

- 桌面端宽度使用 `min(1100px, calc(100vw - 48px))`。
- 高度使用 `min(760px, calc(100vh - 48px))`。

### 5.2 Diff 弹窗

Diff 应改为独立 Dialog 或专用工作视图，不再占用文件列表高度。

触发入口：

- 文件右键菜单“Diff 本地与服务器 Latest”。
- History 弹窗选择两个版本后打开。
- 目录对比弹窗中对单个文件打开。

推荐方式：

- 第一版使用 Dialog。
- Diff 视觉效果需要重做，不沿用当前紧凑表格视觉。
- 使用更清晰的左右分栏：左侧本地或源版本，右侧服务器 latest 或目标版本。
- 必须支持代码高亮、搜索、行号、差异高亮、文件路径、版本标签和刷新入口。
- 长文本区域使用独立滚动，不让内容撑开弹窗。
- 单个文件超过 5MB 时不直接渲染 Diff，只提示文件过大。
- 第一版需要引入代码查看/Diff 编辑器能力，优先评估 Monaco Editor：只读查看使用 Monaco Editor，Diff 使用 Monaco Diff Editor。
- 如果 Monaco 包体或集成成本不可接受，再评估 CodeMirror 6 + MergeView。

### 5.3 文件查看弹窗

文件右键菜单需要提供“查看”入口。已映射且存在本地路径时查看本地文件；未映射时查看服务器文件。

触发入口：

- 文件列表文件右键菜单“查看”。
- Pending Changes 文件右键菜单“查看”。

弹窗内容：

- 顶部展示文件名、本地路径和服务器路径。
- 主体展示只读文件内容。
- 明确标识当前查看来源：本地文件或服务器文件。
- 文本文件必须支持代码高亮、搜索、行号和滚动区域。
- 单个文件超过 5MB 时不直接渲染内容，只提示文件过大。
- 二进制文件或无法读取的文件展示明确提示，不尝试渲染内容。

实现建议：

- 第一版先实现只读查看，不提供编辑能力。
- 第一版需要选择编辑器组件承载查看能力，优先评估 Monaco Editor；如果 Monaco 不适合，再评估 CodeMirror 6。
- 本地文件读取必须限制在当前 Mapping 目录内，禁止通过 UI 查看任意本机路径。

### 5.4 目录对比弹窗

目录对比结果应从 `FolderItemsPanel` 移到单独弹窗。

触发入口：

- 目录树节点右键菜单“与服务器文件对比”。
- 文件列表目录行右键菜单“与服务器文件对比”。
- 当前目录路径栏上的对比图标按钮。

弹窗内容：

- 顶部展示服务端路径、本地路径、重新对比按钮、隐藏已同步开关。
- 支持按差异状态筛选，例如本地修改、服务器更新、本地新增、待删除。
- 主表格展示差异项。
- 差异项对象操作通过右键菜单触发，顶部或底部只保留刷新、筛选和已选数量等状态入口。

差异项操作：

- 获取最新版本
- 签出
- 新增本地文件到服务器
- 删除
- 撤销
- Diff

说明：

- 目录对比是一次独立任务，不应长期占据主文件列表区域。
- 获取最新版本遇到本地与服务器不一致时，必须展示冲突选择，用户明确选择使用服务器版本或保留本地版本后再继续。
- 新增本地文件到服务器只处理目录对比中的 `localOnly` 项，用户选中后加入 pending add。
- 操作完成后可以提示“重新对比以刷新结果”。

### 5.5 Mapping 弹窗

Mapping 创建应从中间内联表单改为 Dialog。

触发入口：

- 未映射目录右键菜单“映射到本地”。
- 当前目录未映射时路径栏显示一个小型“映射”按钮。

弹窗字段：

- 服务端路径，只读。
- 本地目录。
- 是否立即 Get Latest。
- 创建按钮。

Mapping 创建时，本地目录必须由用户选择或输入；Workspace 自动处理不代表 Mapping 本地路径自动决定。
是否立即 Get Latest 由用户选择，可以勾选也可以不勾选。

### 5.6 Checkin 面板

Checkin 保留在右侧 Changes 面板，不使用弹窗。

- 右侧面板展示 Included/Excluded 列表和 comment。
- 点击 Checkin 直接提交 Included。

### 5.7 Get Latest 冲突选择弹窗

Get Latest 遇到本地与服务器不一致时，使用集中弹窗处理，不逐个文件连续弹窗。

弹窗内容：

- 顶部展示当前操作路径、冲突数量、批量操作入口。
- 主表格展示冲突文件列表。
- 每个文件必须选择处理方式：使用服务器版本、保留本地版本、自动合并。
- 每个冲突文件提供 Diff 入口，用于对比本地版本和服务器版本。
- 支持批量选择“全部使用服务器版本”和“全部保留本地版本”。
- 批量操作只作为快速填充选择，用户仍可对单个文件改选处理方式。
- 自动合并只对文本文件开放，二进制文件不展示自动合并。
- 二进制文件或无法生成文本 Diff 的文件，只允许选择使用服务器版本或保留本地版本。
- 选择使用服务器版本时，覆盖本地文件并保持无 pending change。
- 选择保留本地版本时，该文件需要自动进入 pending edit。

自动合并约束：

- 自动合并必须基于三份内容：共同基线版本、本地版本、服务器版本。
- 如果后端只能提供本地和服务器两份内容，不能可靠自动合并，只能让用户选择服务器或本地。
- 自动合并成功后，结果仍应在弹窗中标记为“已自动合并”，用户确认后再写入本地文件。
- 自动合并结果确认应用后，作为本地修改进入 pending edit。
- 自动合并失败或存在冲突块时，回退为手动选择服务器或本地；第一版不提供手动编辑冲突块。

候选实现：

- 自动合并算法优先评估 `node-diff3`，它提供文本三方 diff 和 merge 能力，适合在有基线版本时做行级自动合并。
- 第一版不引入 Monaco 或 CodeMirror 作为冲突解决 UI，冲突弹窗先使用项目现有 React + Radix/shadcn 风格实现；后续如果需要代码编辑器级体验，再评估 CodeMirror MergeView 或 Monaco Diff Editor。

## 六、组件重构建议

### 6.1 路由层

`routes/home.tsx` 继续作为主入口，但职责应减少。

保留职责：

- 服务状态检查。
- 连接表单状态。
- 登录后固定 Collection。
- 当前选中路径。
- 左侧目录树展开路径。
- 打开/关闭 Dialog 的全局状态。

移出职责：

- 具体文件操作实现。
- History/Diff/Compare 详情 UI。
- Pending Changes 细节状态。

### 6.2 AppShell

`AppShell` 应调整为纯布局组件。

建议变更：

- 删除顶部全局 `Get Latest` 和 `History` 按钮。
- 新增左侧/右侧/底部收起按钮。
- 顶部只展示连接状态和上下文信息。
- `sourceList`、`inspector`、`console` 保持插槽式传入。

### 6.3 ServerTreePanel

`ServerTreePanel` 应改为固定 Collection 的目录树。

建议 props：

```ts
interface ServerTreePanelProps {
  connected: boolean
  collection: string
  selectedPath: string
  onPathSelect(path: string): void
  onOpenContextMenu(target: TfsServerItem): void
}
```

需要移除：

- 内部 `collections` 状态。
- Collection 列表渲染。
- `onCollectionSelect`。
- `preferredCollection`。
- 完全内部维护的当前选中路径和展开路径。

### 6.4 FolderItemsPanel

`FolderItemsPanel` 应拆分。

保留：

- 加载当前目录 items。
- 加载 mappings。
- 计算 `FolderItemView`。
- 表格选择和进入目录。

移出：

- `HistoryPanel`。
- `DiffPanel`。
- 目录对比状态和差异操作。
- Mapping 创建表单。
- 选中项底部大操作区。

新增回调：

```ts
interface FolderItemsPanelProps {
  connected: boolean
  collection: string
  serverPath: string
  onPathEnter(path: string): void
  onOpenHistory(target: FileTarget): void
  onOpenDiff(target: FileTarget): void
  onOpenCompare(target: FileTarget): void
  onOpenMapping(target: FileTarget): void
  onRunFileOperation(action: FileAction, target: FileTarget): void
}
```

### 6.5 新增组件

建议新增：

- `components/app/collapsible-sidebar.tsx`
- `components/app/connection-gate.tsx`
- `components/explorer/file-context-menu.tsx`
- `components/explorer/mapping-dialog.tsx`
- `components/compare/folder-compare-dialog.tsx`
- `components/history/history-dialog.tsx`
- `components/diff/diff-dialog.tsx`

说明：

- 如果项目后续继续使用 shadcn/Radix，右键菜单和 Dialog 优先基于 Radix primitives。
- 当前 `package.json` 已有 `radix-ui`，不需要为第一版右键菜单引入额外大型依赖。

## 七、推荐实施顺序

### 阶段一：固定 Collection 上下文

改动：

- 登录成功后加载 Collection。
- 登录页选择 Collection 后进入工作台。
- `ServerTreePanel` 不再渲染 Collection 列表。
- 工作台顶部展示固定 Collection。

收益：

- 先解决后续所有面板共享上下文不稳定的问题。

### 阶段二：布局收缩

改动：

- `AppShell` 增加左侧、右侧、底部收起状态。
- 删除顶部文件操作按钮。
- 底部操作日志默认缩小或可收起。

收益：

- 立即改善中间空间不足问题。

### 阶段三：右键菜单

改动：

- 文件列表行接入右键菜单。
- 目录树节点接入右键菜单。
- Pending Changes 项接入右键菜单。
- 将现有选中项按钮迁移到菜单动作。

收益：

- 操作与对象绑定，减少全局按钮造成的上下文歧义。

### 阶段四：弹窗化详情功能

改动：

- History 改为 Dialog。
- Diff 改为 Dialog。
- 目录对比改为 Dialog。
- Mapping 创建改为 Dialog。

收益：

- 中间区域回归文件浏览。
- 复杂功能获得更大展示空间。

### 阶段五：拆分 FolderItemsPanel

改动：

- 将 `FolderItemsPanel` 中的 History、Diff、Compare、Mapping 逻辑拆出。
- 保留文件列表主职责。
- 文件操作统一由 `home.tsx` 或轻量 action hook 编排。

收益：

- 降低单组件复杂度，后续维护更清晰。

## 八、风险与影响

可能影响：

- `routes/home.tsx`：连接、Collection、弹窗状态和工作台编排会调整。
- `components/app/app-shell.tsx`：布局结构和顶部操作按钮会调整。
- `components/explorer/server-tree-panel.tsx`：Collection 切换逻辑会移除。
- `components/explorer/folder-items-panel.tsx`：会拆出大量功能。
- `components/inspector/pending-changes-panel.tsx`：右键菜单和 Checkin 入口可能调整。
- `components/explorer/history-panel.tsx`：会从内嵌面板改为 Dialog 内容组件。
- `components/explorer/diff-panel.tsx`：会从内嵌面板改为 Dialog 内容组件。

接口影响：

- 现有 API 可支持部分 UI 调整，但文件查看、服务器文件内容、冲突处理和默认 Workspace 等能力需要后端补充。
- 如果登录页要把 Collection 持久保存到后端配置，可能需要确认 `/api/session/connect` 或 `/api/config` 是否保存 `collection` 字段。
- 如果要精确控制右键菜单启用条件，可能需要 pending changes 和映射状态在文件列表中更稳定地合并。

业务影响：

- 进入工作台后不再直接切换 Collection。
- History、Diff、Compare 的打开方式从中间内嵌变为弹窗。
- 文件操作入口从显式按钮为主，调整为右键菜单为主。

## 九、后端接口能力清单

后续重构前需要确认或补充以下后端能力。

连接与 Workspace：

- 登录页选择 Collection 后保存上次 Collection。
- 根据 Collection 自动查找本机已有 Workspace。
- 没有 Workspace 时按程序固定规则创建默认 Workspace。
- 返回当前实际使用的 Workspace 名称和基础信息。

文件查看：

- 读取 Mapping 目录内本地文件内容，必须校验路径位于 Mapping 目录内。
- 读取未映射文件的服务器 latest 内容。
- 返回文件大小、是否二进制、可否文本渲染、文件编码和内容。
- 超过 5MB 时返回大小信息，前端不直接渲染内容。

Diff 与历史：

- 获取本地文件与服务器 latest 的文本 Diff。
- 获取两个历史 changeset 的文本 Diff。
- 支持 Diff 前返回文件大小和二进制判断。
- 支持文件历史和目录历史继续按弹窗使用。

目录对比：

- 返回目录差异状态，至少覆盖本地修改、服务器更新、本地新增、服务器新增、待删除、已同步。
- 返回每个差异项是否可执行获取最新、签出、新增本地文件到服务器、删除、撤销、比较。
- 返回 pending edit 子项，用于递归 Get Latest 时跳过并提示。

Get Latest 与 Checkout 冲突处理：

- Get Latest 文件夹递归执行。
- pending edit 文件禁止直接 Get Latest；目录递归时跳过 pending edit 子文件并返回跳过列表。
- Checkout 自动先 Get Latest，再签出。
- Checkout 自动 Get Latest 遇到冲突时返回同一套冲突明细。
- 冲突明细需要包含服务端路径、本地路径、文件大小、是否二进制、是否可自动合并。
- 冲突文件需要支持读取本地版本、服务器 latest 版本；自动合并需要共同基线版本。
- 支持应用用户选择：使用服务器版本、保留本地版本、自动合并结果。
- 使用服务器版本时覆盖本地且不产生 pending change。
- 保留本地版本时自动进入 pending edit。
- 自动合并结果确认应用后写入本地并进入 pending edit。

Pending Changes：

- 返回 pending change 类型，用于区分 pending add、pending edit、pending delete。
- pending add 文件不提供服务器比较。
- 支持单项撤销、Included/Excluded 前端会话状态和 Checkin 提交 Included。

## 十、待确认问题

第一优先级问题：

- 更换 Collection 是否必须支持“不断开连接直接切换”？

推荐答案：

- 不支持。Collection 在登录页选定后固定，切换 Collection 需要回到连接设置重新选择。

原因：

- 这符合当前重构目标，也能最大限度减少 Mapping、Pending Changes、History、Diff 的上下文混乱。

第二优先级问题：

- Checkin 是否也要右键触发？

推荐答案：

- 不作为主要入口。右键可以提供“移到 Included/Excluded”和“撤销”，Checkin 仍放在 Changes 面板中。

原因：

- Checkin 是批量提交行为，依赖 comment 和 Included 集合，不是单文件即时动作。

第三优先级问题：

- 左右栏是否需要拖拽调整宽度？

推荐答案：

- 第一版只做展开/收起，不做拖拽。

原因：

- 当前问题的核心是空间分配和职责混杂，固定收缩已经能解决大部分问题，且改动更小。

## 十一、已确认决策

- 工作台内不支持切换 Collection。用户需要更换 Collection 时，必须回到连接设置重新选择并重新进入工作台。
- 登录页默认选中上次使用的 Collection，但进入工作台后仍不允许切换 Collection。
- Workspace 不允许用户手动选择；本机已有 Workspace 就自动使用，没有就创建默认 Workspace。
- 默认 Workspace 命名规则由后端程序固定，前端只展示最终使用的 Workspace。
- Mapping 创建时本地目录由用户选择或输入。
- Mapping 创建后是否立即 Get Latest 由用户选择，不强制。
- Checkin 保留在右侧 Changes 面板作为主入口，不放到单个文件或文件夹右键菜单中。
- Checkin 不使用弹窗，右侧 Changes 面板直接展示 Included/Excluded、comment 和提交按钮。
- 左右栏第一版只支持展开/收起，不做拖拽调整宽度。
- History、Diff、目录对比和 Mapping 第一版都使用弹窗，不做新路由，也不继续内嵌在中间文件列表中。
- 底部操作日志保留并支持收起，避免长期占用主工作区高度。
- 右侧 Changes 面板收起后不显示 Pending Changes 数量徽标。
- 左侧 Source Tree 收起后只显示展开按钮，不显示路径或图标列表。
- 顶部工具栏移除文件和目录操作，只保留连接状态、服务器、Collection、Workspace、刷新和设置等全局入口。
- 文件列表取消选中项底部操作区，文件和目录对象操作全部进入右键菜单。
- 左侧目录树必须支持右键菜单，且左侧树展开/选中状态必须与中间文件列表目录导航保持一致。
- 中间文件列表单击只选中，双击或右键“打开”才进入目录。
- 第一版不支持键盘快捷键。
- 当前路径和左侧目录树展开路径统一提升到 `home.tsx` 管理，再传给左侧树和中间文件列表。
- 目录对比结果项的文件操作也使用右键菜单，不在弹窗底部或右侧额外放操作按钮区。
- 目录对比弹窗需要支持按差异状态筛选，例如本地修改、服务器更新、本地新增、待删除。
- 新增本地文件到服务器是文件夹级操作，只在文件夹或当前目录上下文出现，通过本地映射目录和服务器目录对比找出本地独有项，用户选中后加入 pending add。
- 删除只对服务器已有的版本控制项执行 pending delete，不删除本地未加入服务器的 `localOnly` 文件。
- 文件夹“与服务器目录对比”用于找出本地与服务器不同的文件，方便后续签出、新增、获取最新等操作；文件“比较本地与服务器 Latest”用于查看本地修改和服务器代码异同。
- 右侧 Pending Changes 项必须支持右键菜单，至少包含比较本地与服务器 Latest、撤销、查看历史、移到 Included、移到 Excluded。
- 右侧 Pending Changes 的比较入口只对文件显示，文件夹不展示内容比较。
- pending add 文件没有服务器版本，Pending Changes 右键菜单只显示查看和撤销，不显示比较本地与服务器 Latest。
- 文件右键菜单需要提供“查看”入口，打开只读文件查看弹窗；Pending Changes 的文件项也需要提供查看入口。
- 文件“查看”已映射时查看本地文件，未映射时查看服务器文件。
- 文件查看和 Diff 单个文件超过 5MB 时不直接渲染，只提示文件过大。
- 本地文件查看必须限制在 Mapping 目录内，不能读取任意本机路径。
- Diff 视觉效果需要升级为更清晰的弹窗左右分栏，不沿用当前紧凑表格视觉。
- 文件查看和 Diff 第一版必须支持代码高亮、搜索和行号；优先评估 Monaco Editor，备选 CodeMirror 6。
- 文件夹允许递归签出，但执行前必须让用户确认影响范围。
- 获取最新版本对文件夹递归执行；如果发现本地与服务器不一致，必须由用户选择使用服务器版本或保留本地版本。
- Get Latest 冲突选择使用集中弹窗，用户在弹窗内逐文件选择使用服务器版本、保留本地版本或自动合并。
- Get Latest 冲突弹窗允许批量选择处理方式，但必须保留单个文件独立改选能力。
- Get Latest 冲突弹窗中的每个冲突文件都需要提供 Diff 入口，辅助判断使用服务器、本地或自动合并。
- Get Latest 冲突中选择使用服务器版本时，覆盖本地文件并保持无 pending change。
- Get Latest 冲突中选择保留本地版本时，该文件需要自动签出为 pending edit。
- 自动合并只有在后端能提供共同基线版本、本地版本和服务器版本三份内容时才启用；无基线或二进制文件不做自动合并。
- 二进制文件或无法生成文本 Diff 的文件不展示自动合并，只允许使用服务器版本或保留本地版本。
- 自动合并成功后不能直接写入本地，必须等用户在冲突弹窗中确认后再应用结果。
- 自动合并结果确认应用后，需要作为本地修改进入 pending edit。
- 自动合并失败或存在冲突块时，只回退到使用服务器版本或保留本地版本二选一；第一版不做手动冲突块编辑。
- 已经处于 pending edit 的文件禁止直接获取最新版本；checkout 流程应先更新到最新再签出。
- 文件夹递归获取最新版本时，如果子文件已处于 pending edit，则跳过该子文件并在结果中提示。
- Checkout 执行时自动先获取最新版本再签出，不要求用户额外手动执行 Get Latest。
- Checkout 自动获取最新版本时如果遇到本地与服务器不一致，复用 Get Latest 冲突选择弹窗处理。
- Checkin 成功后刷新当前目录文件列表和 Pending Changes；只有涉及新增或删除目录时，才刷新左侧树对应节点。
