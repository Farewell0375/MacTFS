# macTFS UI 全流程复测报告

## 一、测试范围

- 测试时间：2026-06-08 17:25-17:43
- 测试入口：Electron UI + Playwright 辅助操作同一前端页面
- 服务端：`http://127.0.0.1:38765`
- 前端：`http://localhost:5173`
- TFS 地址：`http://100.113.212.90:20094/tfs/`
- Collection：`PKUSEHR`
- Workspace：`mactfs-ai-subapp-pm-mactfs`
- Server Path：`$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs`
- Local Path：`/Users/fenghp/Desktop/DEV/mactfs-ai-workspace`

本轮复测基于上一轮问题修复后的代码执行。写操作仍严格限制在指定测试目录内。

## 二、测试结论

本轮复测主流程通过：连接、切换 `PKUSEHR`、进入指定项目、识别 Mapping、文件级 Get Latest、Checkout、修改本地文件、Pending Changes 展示、UI Checkin 均成功。

本轮签入生成 changeset `678201`，最终 pending changes 为 0。

上一轮的关键问题中，以下已修复或明显改善：

- `Missing required field: collection` 未再出现在 `PKUSEHR` 流程中。
- `listMappings` / `pendingChanges` 切到 `PKUSEHR` 后均带 `collection=PKUSEHR` 并返回成功。
- 中间文件列表支持双击进入目录。
- 文件级 Get Latest 后状态可变为 `upToDate / 已同步`。
- Checkout 后右侧 Pending 能显示 `pendingEdit / 编辑`。
- Checkin 表单能提交 Included Changes 并展示成功 changeset。

## 三、流程执行结果

| 步骤 | 结果 | 证据 |
| --- | --- | --- |
| 启动服务端 | 通过 | `GET /api/health` 返回 `success=true` |
| 启动前端/Electron | 通过 | Electron 显示本地服务可用 |
| 连接 TFS | 通过 | `/api/session/connect` 返回 200，UI 进入已连接工作台 |
| 切换到 PKUSEHR | 通过 | `/api/server-tree?collection=PKUSEHR`、`/api/server-folder/items?collection=PKUSEHR` 返回 200 |
| 定位目标目录 | 通过 | 页面进入 `$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs` |
| 识别 Mapping | 通过 | 页面显示当前目录已映射到 `/Users/fenghp/Desktop/DEV/mactfs-ai-workspace` |
| 文件级 Get Latest | 通过 | UI 显示 `Get Latest 完成，操作 1 项。`，接口日志 `getLatest success=true` |
| Checkout | 通过 | UI 显示 `Checkout 完成，影响 1 项。`，接口日志 `checkout success=true` |
| 修改本地文件 | 通过 | 修改前执行 `chmod u+w`，追加 `ui retest edit 20260608174200` |
| Pending 展示 | 通过 | UI Included Changes 显示 `stage4-e2e-20260608124119.txt` 和 `pendingEdit / 编辑` |
| Checkin | 通过 | UI 显示 `Checkin 成功，changeset 678201，提交 1 项。` |
| 最终状态 | 通过 | `GET /api/pending-changes` 返回 0 项 |

## 四、仍需关注的问题

### P1：登录后默认进入 PE 会触发 Workspace 不匹配错误

现象：

- 登录后 UI 首次加载默认 Collection 为 `PE`。
- 当前 workspace 是 `mactfs-ai-subapp-pm-mactfs`，属于 `PKUSEHR` 测试链路。
- 因此 UI 初始请求出现：
  - `/api/pending-changes?collection=PE` 500
  - `/api/mappings?collection=PE` 500
  - 错误信息：`Workspace not found: mactfs-ai-subapp-pm-mactfs`

影响：

- 虽然切换到 `PKUSEHR` 后可以恢复，但用户会先看到失败日志。
- 当前工作区和默认 Collection 的匹配关系仍不稳定。

建议：

- 登录后优先选中配置中的 `collection=PKUSEHR`，不要默认选第一个 Collection。
- 或在切换 Collection 时同步校验 workspace 是否属于该 Collection，不匹配时不要请求 Pending / Mapping。

### P2：Electron Computer Use 插件本轮只能读窗口，点击动作被拒绝

现象：

- `get_app_state` 能读取 Electron 窗口。
- `click` 多次返回 `Computer Use is not active ... first must call get_app_state`。
- 已按同一 app name、bundle id、完整 app path 重试，仍无法点击。

影响：

- 本轮真实 UI 操作改由 Playwright 辅助执行同一前端页面，并注入等价 `window.mactfs` preload 桥接。
- Electron 可视状态仍已确认，但点击动作不是通过 Computer Use 完成。

建议：

- 后续如必须验证 macOS 原生 Electron 点击，可在 Computer Use 插件恢复后补跑一次。

## 五、修复项回归结果

| 上轮问题 | 本轮结果 |
| --- | --- |
| `Missing required field: collection` 残留 | PKUSEHR 流程未复现 |
| 中间文件列表不能进入目录 | 已支持双击进入，成功进入 `mactfs` |
| Get Latest 后状态未刷新 | 文件级 Get Latest 后可显示 `upToDate / 已同步` |
| Pending 面板不显示真实变更 | Checkout 后显示 `pendingEdit / 编辑` |
| Checkin 无法走 UI | UI Checkin 成功，changeset `678201` |
| 顶部/底部操作状态不一致 | 文件选中后底部操作可用；顶部按钮是否完全一致未单独覆盖 |

## 六、测试数据

本次修改文件：

- `/Users/fenghp/Desktop/DEV/mactfs-ai-workspace/stage4-e2e-20260608124119.txt`

追加内容：

```text
ui retest edit 20260608174200
```

签入信息：

- Comment：`AI UI retest checkin 2026-06-08 17:42`
- Changeset：`678201`
- 最终 pending changes：`0`

## 七、辅助产物

- `/Users/fenghp/Desktop/DEV/project/mydev/output/playwright/mactfs-retest/ui-retest-final.png`
- `/Users/fenghp/Desktop/DEV/project/mydev/output/playwright/mactfs-retest/file-flow-after-checkout.png`
- `/Users/fenghp/Desktop/DEV/project/mydev/output/playwright/mactfs-retest/checkin-flow-final.png`

## 八、修复记录

修复时间：2026-06-08

修复内容：

- `ServerTreePanel` 增加配置 Collection 优先选择逻辑，登录后优先展开 `~/.mactfs/config.json` 中保存的 Collection。
- `Home` 将后端配置中的 `collection` 传入 Source List，避免连接后先默认进入第一个 Collection。
- 保留无配置 Collection 时回退第一个 Collection 的行为，避免空配置首次使用无法自动浏览。

修复后验证：

- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui && pnpm typecheck`：通过。
- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui && pnpm build`：通过。
- 通过 `python3 -m http.server 4174 --bind 127.0.0.1` 打开构建产物：工作台主结构可渲染，Source List / Inspector / Console 均可见。
