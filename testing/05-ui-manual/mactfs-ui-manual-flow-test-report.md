# macTFS UI 手工全流程测试报告

## 一、测试范围

- 测试时间：2026-06-08 16:27-16:40
- 测试入口：Electron UI（Computer Use）
- 服务端：`http://127.0.0.1:38765`
- 前端：`http://localhost:5173`
- TFS 地址：`http://100.113.212.90:20094/tfs/`
- Collection：`PKUSEHR`
- Workspace：`mactfs-ai-subapp-pm-mactfs`
- Server Path：`$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs`
- Local Path：`/Users/fenghp/Desktop/DEV/mactfs-ai-workspace`

本次测试按 `TFS-AI测试流程.md` 约束执行，写操作只发生在指定测试目录内。

## 二、测试结论

UI 能完成连接、Collection 切换、服务端目录浏览、识别既有 Mapping、触发 Get Latest；但 UI 在 Pending、目录进入、状态刷新和顶部工具栏联动上存在明显问题，导致“签出文件、修改代码、签入”无法完全通过 UI 连续完成。

为验证后端链路，本次在 UI 阻断后使用本地 API 补完 checkout、修改、pending changes、checkin。后端链路成功，最终生成 changeset `678184`，最终 pending changes 为 0。

## 三、流程执行结果

| 步骤 | 结果 | 证据 |
| --- | --- | --- |
| 启动服务端 | 通过 | `GET /api/health` 返回 `success=true`，端口 `38765` 可用 |
| 启动前端/Electron | 通过 | Electron 显示 `macTFS 已连接` |
| 登录/连接 TFS | 通过 | UI 显示 TFS 地址，`/api/collections` 返回 `PE`、`PKUSEHR` |
| 切换到 PKUSEHR | 通过 | 左侧 Source List 显示 `PKUSEHR` 根目录 |
| 定位目标路径 | 部分通过 | 可通过左侧树进入 `北京排水集团人力系统/5SRC/MicroFront/subapp_pm` |
| 映射指定目录 | 通过 | `mactfs` 行显示已映射到 `/Users/fenghp/Desktop/DEV/mactfs-ai-workspace` |
| Get Latest | 部分通过 | UI 显示 `Get Latest 完成，操作 4 项`，接口日志 `getLatest success=true` |
| 签出文件 | UI 阻断，接口通过 | UI 无法进入已映射目录选择文件；接口 checkout 成功，affected=1 |
| 修改文件 | 通过 | 本地文件追加 `ui manual edit 20260608164000` |
| Pending Changes | UI 异常，接口通过 | 接口返回 1 条 `pendingEdit`，UI 右侧仍残留旧错误/未显示变更 |
| Checkin | UI 阻断，接口通过 | 接口 checkin 成功，changeset=`678184` |
| 最终状态 | 通过 | `GET /api/pending-changes` 返回空列表 |

## 四、发现的问题

### P1：Pending 面板长期显示 `Missing required field: collection`

现象：

- UI 连接成功并已选中 `PKUSEHR` 后，右侧 Pending Changes 仍显示 `Missing required field: collection`。
- 后端 `/api/pending-changes` 在配置完整后可正常返回结果，但 UI 旧错误没有清除。

影响：

- 用户无法判断真实 pending 状态。
- checkin 区域无法根据真实 pending changes 启用。

### P1：中间文件列表不能进入目录

现象：

- 单击或双击 `subapp_pm`、`mactfs` 等目录行，只会选中行，不会进入目录。
- 只能依赖左侧 Source List 继续展开深层目录。

影响：

- 已映射目录 `mactfs` 下的具体文件无法通过中间列表选择。
- 后续 checkout/checkin 的 UI 文件级流程被阻断。

### P1：Get Latest 后目录状态没有刷新

现象：

- UI 显示 `Get Latest 完成，操作 4 项`。
- `mactfs` 行仍显示 `notDownloaded / 未下载`。
- 同一行已显示本地路径和已映射，状态与操作结果不一致。

影响：

- 用户无法确认当前目录是否已同步。
- 后续按钮启用状态和用户判断容易被误导。

### P2：顶部工具栏按钮状态不同步

现象：

- 选中已映射的 `mactfs` 行后，底部操作区出现可用 `Get Latest`、`Checkout`。
- 顶部工具栏 `Get Latest` 仍为禁用状态。

影响：

- 同一动作在不同位置状态不一致。
- 用户容易认为当前不能执行 Get Latest。

### P2：Source List 和主列表状态存在短暂串台/不同步

现象：

- 在目录切换过程中，标题显示 `$/北京排水集团人力系统/5SRC`，列表项曾短暂显示其他路径下的 `5SRC`。
- `MicroFront` 点击后，左侧树已展开，但中间列表一度仍显示上一层内容。

影响：

- 深层目录导航时容易误点其他项目路径。
- 对 TFS 写操作场景风险较高，需要确保路径展示严格一致。

### P2：Mapping/Pending 初始请求对配置状态依赖不稳定

现象：

- 早期 UI 日志中多次出现 `/api/mappings`、`/api/pending-changes` 因缺少 `collection` 失败。
- 后续 `/api/config` 已包含 `collection=PKUSEHR`、`workspace=mactfs-ai-subapp-pm-mactfs`，接口直连成功，但 UI 错误状态没有完整恢复。

影响：

- 首次进入工作台时容易出现错误状态残留。
- 用户需要刷新或重新选择目录才能看到部分恢复结果。

## 五、接口补充验证

UI 阻断后，为确认后端能力是否可用，执行了以下补充验证：

- `GET /api/mappings`：成功，返回 1 条目标 Mapping。
- `POST /api/files/get-latest`：成功，UI 触发，耗时约 1.4s。
- `POST /api/files/checkout`：成功，文件 `stage4-e2e-20260608124119.txt`，affected=1。
- 修改本地文件前执行：`chmod u+w /Users/fenghp/Desktop/DEV/mactfs-ai-workspace/stage4-e2e-20260608124119.txt`。
- `GET /api/pending-changes`：成功，返回 1 条 `pendingEdit`。
- `POST /api/checkin`：成功，changeset=`678184`，submittedChanges=1。
- 最终 `GET /api/pending-changes`：成功，返回空列表。

## 六、测试数据

本次修改文件：

- `/Users/fenghp/Desktop/DEV/mactfs-ai-workspace/stage4-e2e-20260608124119.txt`

追加内容：

```text
ui manual edit 20260608164000
```

签入信息：

- Comment：`AI UI manual flow test checkin 2026-06-08 16:40`
- Changeset：`678184`

## 七、建议修复优先级

1. 优先修复 Pending 面板请求和错误状态清理，确保配置完整后能显示真实 pending changes。
2. 修复中间文件列表目录进入能力，至少支持双击目录进入。
3. Get Latest 成功后刷新当前目录状态，避免继续显示 `notDownloaded / 未下载`。
4. 统一顶部工具栏和底部操作区的按钮启用逻辑。
5. 目录切换时清理旧列表数据或加 loading 遮罩，避免路径串台。

## 八、修复记录

修复时间：2026-06-08

修复内容：

- `PendingChangesPanel` 增加 Collection 输入，未选中 Collection 时不再请求 `/api/pending-changes`，避免初始缺 `collection` 错误残留。
- `GET /api/pending-changes` 支持从 query 中读取 `collection` / `workspace` 覆盖当前配置，UI 切换 Collection 后可使用当前选择发起查询。
- `GET /api/mappings` 支持从 query 中读取 `collection` / `workspace` 覆盖当前配置，中间列表加载 Mapping 时携带当前 Collection，降低初始配置状态依赖。
- `FolderItemsPanel` 在目录切换时清空旧列表和选中状态，接口返回前显示加载态，避免旧路径数据覆盖新路径。
- 中间文件列表目录行支持双击进入，并同步主工作区当前路径。
- 文件列表选中项映射状态上提到 `Home`，顶部工具栏 `Get Latest` 复用中间底部操作区的选中项状态，`History` 支持当前目录并优先使用选中项。
- `Get Latest` 成功后清空旧目录对比结果并刷新当前文件列表，避免继续展示过期 `notDownloaded` 状态。
- 未选中 Collection 时禁用 Pending Changes 手动刷新入口，并直接提示选择 Collection，避免再次触发缺 `collection` 请求。
- `Get Latest` 成功后在当前 UI 会话内记录已同步路径，列表刷新后显示 `upToDate / 已同步`，避免同一路径继续显示 `notDownloaded / 未下载`。

修复后验证：

- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui && pnpm typecheck`：通过。
- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew build`：通过。
- `git diff --check`：通过。
- Browser 打开 `http://127.0.0.1:5173/`：非 Electron 环境下工作台、Source List、Inspector、Console 可正常渲染；未连接状态下顶部 `Get Latest` / `History` 禁用。
- 未重新执行真实 Electron + TFS 手工全流程，原因是当前修复验证阶段未再次提供真实 UI 写操作确认窗口；相关真实 checkout/checkin 写入仍需后续 E2E 复测。
