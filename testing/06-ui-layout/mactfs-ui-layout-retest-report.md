# macTFS 前端 UI 布局专项复测报告

## 一、测试范围

本轮复测只覆盖前端 UI 布局与可用性问题，不重新执行 TFS 签出、修改、签入的完整业务闭环。

重点检查项：

- 长列表场景下，表头、底部操作栏、面板标题是否保持可见。
- Source Workspace 目录列表中“双击进入”提示是否影响可读性。
- Source List、Source Workspace、Inspector、Console 四个区域的视觉层级和滚动边界。
- Electron 桌面端实际运行状态与本地 API 服务状态。

## 二、测试环境

- 测试时间：2026-06-08
- 前端地址：`http://localhost:5173/`
- Electron：`mactfsui/node_modules/.pnpm/electron@42.2.0/.../Electron.app`
- 本地 API：`http://127.0.0.1:38765`
- Collection：`PKUSEHR`
- 测试路径：`$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/src/views`

## 三、测试方法

- 使用 Computer Use 读取 Electron 窗口状态和可访问性树。
- 通过 Electron 当前界面进入 `subapp_pm/src/views` 长目录场景。
- 通过本地 API 复核列表规模：
  - `/api/server-folder/items` 返回 `views` 目录下 36 项。
  - `/api/logs` 返回 116 条操作日志。
  - `/api/pending-changes?collection=PKUSEHR` 当前返回 0 项。
- 结合前端源码核对滚动容器边界：
  - `app-shell.tsx`
  - `folder-items-panel.tsx`
  - `operation-log-panel.tsx`
  - `pending-changes-panel.tsx`

限制说明：

- Computer Use 本轮可以读取 Electron 截图和可访问性树。
- Computer Use 的点击/滚动动作间歇返回 `noWindowsAvailable`，因此滚动动作以读屏结果、接口数据规模和源码结构联合判断。
- 普通 Chrome 打开 `localhost:5173` 会进入“未检测到 Electron preload”的降级态，不能代表真实桌面端操作状态。

## 四、测试结果

### 1. Source Workspace 主目录列表

结论：主要结构通过，但存在可读性问题。

- `views` 目录下 36 项，已覆盖长列表场景。
- 源码中主列表表头位于列表滚动容器外，底部“已选中”操作栏也位于滚动容器外，理论上滚动列表时不会随内容滚走。
- 目录行每一行都展示“双击进入”，在 36 项目录列表中重复出现，压缩了名称列宽。
- 部分长目录名如 `assessmentContactPerson`、`importAppraisalResults`、`performanceProgress` 等在名称列中容易被截断；再叠加“双击进入”徽标后，可读性变差。

建议：

- 删除目录行内的“双击进入”徽标，保留双击行为即可。
- 如需提示，可放到表格空状态、工具提示或首次使用引导，不应在每个目录行重复展示。

### 2. Console 操作日志面板

结论：发现需要修复的问题。

- 当前服务端日志 116 条，Console 是明确的长列表场景。
- `operation-log-panel.tsx` 中日志表头位于 `overflow-auto` 容器内部。
- 当日志列表纵向滚动时，列头“操作 / 状态 / 开始 / 结束 / 耗时 / 路径摘要 / 错误信息”会跟随日志内容滚动，不会固定在 Console 可视区域顶部。

建议：

- 将 Console 列头移出日志滚动容器，或为列头增加 `sticky top-0` 和背景色。
- 保持 Console 顶部标题栏“Console / 条数 / 刷新”固定。

### 3. Source List 左侧树

结论：结构基本通过，仍有轻微体验问题。

- Source List 标题栏在滚动容器外，树内容在独立 `overflow-auto` 容器内。
- 当前左侧树可显示 `subapp_pm` 下的多级项目，标题“Source List”不会随树内容滚动。
- 长路径层级下列表密度较高，目录与文件混排时视觉区分主要依赖小图标，仍可用但扫描成本偏高。

建议：

- 保持标题固定。
- 后续可考虑为当前选中路径增加更明显的路径面包屑或层级聚焦，但本轮不作为阻塞问题。

### 4. Inspector / Pending Changes

结论：当前数据下通过，长 pending 场景未完全覆盖。

- 当前 pending changes 为 0 项。
- Inspector 标题栏在外层滚动容器外，面板内内容独立滚动。
- `PendingChangeGroup` 在有数据时使用 `max-h-56 overflow-auto`，分组标题在分组滚动容器外，因此分组标题不会随组内变更列表滚走。
- 因当前没有大量 pending changes，未覆盖“多条 Included / Excluded 同时存在”时 Checkin 区域是否需要固定的问题。

建议：

- 后续制造 10 条以上 pending changes 后，再专项验证 Included / Excluded 分组滚动和 Checkin 按钮可达性。

## 五、问题清单

| 编号 | 严重级别 | 位置 | 问题 | 建议 |
| --- | --- | --- | --- | --- |
| UI-001 | 中 | Console | 日志列头在滚动容器内部，长日志滚动时会跟随内容滚走 | 固定列头或移出滚动容器 |
| UI-002 | 中 | Source Workspace | 每个目录行重复展示“双击进入”，长目录列表下占用名称列宽 | 删除行内徽标，保留双击交互 |
| UI-003 | 低 | Source Workspace | 长目录名与长服务端路径同时截断，信息定位成本较高 | 保留截断但增加 title/tooltip 或更清晰的路径查看入口 |
| UI-004 | 低 | Inspector | 当前 pending 为 0，未验证多 pending 下 Checkin 区域是否始终可达 | 后续构造多 pending 数据再复测 |

## 六、复测结论

本轮 UI 复测发现 2 个需要优先处理的问题：

- Console 日志列表列头需要固定。
- Source Workspace 目录行内“双击进入”提示建议移除。

Source Workspace 主表头、底部“已选中”栏、Source List 标题栏从当前布局结构看已在滚动容器外，未发现会随列表内容滚走的明确问题。

本轮未执行代码修复，只记录 UI 走查结果并整理测试文档目录。

## 七、修复记录

修复时间：2026-06-08

修复内容：

- `OperationLogPanel` 将日志列头设置为 `sticky top-0`，长日志滚动时保留列头可见。
- `FolderItemsPanel` 删除目录行内重复的“双击进入”徽标，保留双击进入目录交互。
- `FolderItemsPanel` 为名称、服务端路径和本地路径补充 `title`，长文本截断时仍可查看完整内容。
- `AppShell` 将 Source Workspace 内容区外层从 `overflow-auto` 改为 `overflow-hidden`，避免整个中间面板随列表滚动。
- `FolderItemsPanel` 外层改为 `h-full min-h-0 flex-col`，保持目录列表表头和底部“已选中”操作栏在滚动容器外，只让中间列表数据滚动。

修复后验证：

- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui && pnpm typecheck`：通过。
- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui && pnpm build`：通过。
- 构建产物静态服务打开后，工作台主结构可渲染，页面文本中不再出现行内“双击进入”徽标。
- 构建产物静态服务打开后，Source Workspace 主内容容器为 `min-h-0 flex-1 overflow-hidden`，中间列表数据滚动不会带动表头和底部“已选中”操作栏。
- `pnpm dev` / `vite preview` 本轮因本机 watcher 数量限制报 `EMFILE: too many open files, watch`，已改用生产构建和静态服务验证。
