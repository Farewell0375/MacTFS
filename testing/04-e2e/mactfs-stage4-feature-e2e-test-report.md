# macTFS 阶段四 Feature E2E 测试报告

## 一、测试依据

- AI 测试流程：`TFS-AI测试流程.md`
- 前端规范：`mactfsui/FRONTEND_SPEC.md`
- 前端 AI 规则：`mactfsui/AGENTS.md`
- Feature E2E 任务：`task/feature/FEATURE-001` 至 `task/feature/FEATURE-005`
- PRD：`docs/mactfs-api-product-prd.md`
- 执行时间：2026-06-08 12:37-12:48
- 执行入口：Electron UI、mactfs 本地 Java API、真实 TFS SDK

阶段四在当前任务体系中定义为 `Feature E2E`，测试目标是验证 UI、API、Core/TFS SDK 组成的日常 TFS 操作链路。

## 二、测试环境

- 服务地址：`http://127.0.0.1:38765`
- 前端地址：`http://localhost:5173/`
- Java：项目内 x86_64 JDK 8
- Electron：`mactfsui` 本地 Electron 应用
- 本地 API 服务启动命令：

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
  arch -x86_64 ../tfsIntegration/gradlew -q runServer
```

- 前端启动命令：

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm dev
NODE_ENV=development pnpm electron
```

## 三、测试边界

写操作严格限制在测试流程指定目录：

- Collection：`PKUSEHR`
- Workspace：`mactfs-ai-subapp-pm-mactfs`
- Server Path：`$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs`
- Local Path：`/Users/fenghp/Desktop/DEV/mactfs-ai-workspace`

本轮不测试：

- 删除 Workspace
- Work Item
- Check-in Policy UI
- 三方 merge / 冲突解决器
- 二进制可视化 diff
- UI 侧再次执行真实 checkin 写操作

说明：

- API 层完成了真实 TFS 全流程写入验证。
- Electron UI 侧只做连接、服务状态、目录浏览、Pending、Console 和工作台可见性验证，避免通过手动 UI 再次产生额外 TFS 写操作。

## 四、构建与静态验证

| 验证项 | 命令 | 结果 |
|---|---|---|
| 后端 / Core 构建 | `env JAVA_HOME=... arch -x86_64 ../tfsIntegration/gradlew build` | 通过，`BUILD SUCCESSFUL` |
| 前端类型检查 | `pnpm typecheck` | 通过，`react-router typegen && tsc` 无错误 |

## 五、Feature E2E 测试结果

| Feature | 测试项 | 入口 | 结果 | 关键结果 |
|---|---|---|---|---|
| FEATURE-001 | TFS 连接 | API / Electron UI | 通过 | `collectionCount=2`，UI 显示 `macTFS 已连接` |
| FEATURE-001 | Collection 查询 | API / Electron UI | 通过 | 返回 `PE`、`PKUSEHR`，UI Source List 可切换 Collection |
| FEATURE-001 | 服务端目录浏览 | API / Electron UI | 通过 | 指定测试目录可浏览；UI 可展示 `PKUSEHR` 根目录和中间文件列表 |
| FEATURE-002 | Workspace 复用 | API | 通过 | 复用 `mactfs-ai-subapp-pm-mactfs`，`created=false` |
| FEATURE-002 | Mapping 删除 / 创建 / 查询 | API | 通过 | 测试 Mapping 删除后恢复，最终 mapping 数量为 1 |
| FEATURE-002 | 不立即 Get Latest 的 Mapping | API | 通过 | `getLatest=false` 创建 Mapping 成功，后续单独执行 Get Latest |
| FEATURE-002 | Get Latest | API | 通过 | `updated=2`，`operations=3`，`conflicts=0`，`failures=0` |
| FEATURE-003 | 干净目录对比 | API | 通过 | Get Latest 后 `diffs=0` |
| FEATURE-003 | localOnly 差异识别 | API | 通过 | 本地新增文件识别为 `localOnly` |
| FEATURE-003 | localOnly 执行 add | API | 通过 | `affected=1`，pending 状态为 `pendingAdd` |
| FEATURE-003 | pending delete 执行 undo | API | 通过 | delete 后 `pendingDelete`，undo 后 pending 清空 |
| FEATURE-004 | Pending Changes 查询 | API / Electron UI | 通过 | API 最终 pending 为 0；UI Inspector 显示 Pending Changes、Included / Excluded 分组 |
| FEATURE-004 | comment 必填 | API / UI 状态 | 通过 | 空 comment API 返回 `Missing required field: comment`；UI Checkin 按钮在 Included 为 0 或 comment 空时禁用 |
| FEATURE-004 | Checkin 新增文件 | API | 通过 | changeset `678131`，提交 1 项 |
| FEATURE-004 | Checkin 修改文件 | API | 通过 | changeset `678132`，提交 1 项 |
| FEATURE-005 | 文件历史 | API | 通过 | 测试文件 history 数量 2，最新 changeset `678132` |
| FEATURE-005 | 目录历史 | API | 通过 | 测试目录 history 数量 6，最新 changeset `678132` |
| FEATURE-005 | changeset 文件列表 | API | 通过 | changeset `678132` 返回 1 个文件，包含本轮测试文件 |
| FEATURE-005 | 本地 vs latest diff | API | 通过 | diff 行数 4，包含 `stage4 e2e edit` |
| FEATURE-005 | 两个历史版本 diff | API | 通过 | `678131` vs `678132` diff 行数 4，包含修改行 |
| Frontend | Electron preload / token / service | Electron UI | 通过 | UI 显示服务可用、token 文件 `/Users/fenghp/.mactfs/server-token` |
| Frontend | 操作日志 Console | Electron UI | 通过 | Console 显示 50+ 条 API 操作日志，成功 / 执行中状态可见 |

## 六、关键执行结果

本轮 API 全流程关键输出：

```text
health                         success=true, connected=false
connect                        collectionCount=2
collections                    PE,PKUSEHR
server-folder                  items=2
ensure-workspace               workspace=mactfs-ai-subapp-pm-mactfs, created=false
create-mapping                 serverPath=$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs, localPath=/Users/fenghp/Desktop/DEV/mactfs-ai-workspace
get-latest                     updated=2, operations=3, conflicts=0, failures=0
pending-initial                count=0
compare-clean                  diffs=0
compare-local-only             status=localOnly, name=stage4-e2e-20260608124119.txt
add-file                       affected=1
pending-add                    status=pendingAdd, changeType=add, lock
checkin-empty-comment          success=false, message=Missing required field: comment
checkin-add                    changeset=678131, submitted=1
pending-after-add-checkin      count=0
checkout-file                  affected=1
pending-edit                   status=pendingEdit, changeType=lock, edit
diff-local-latest              lines=4, hasEdit=true
checkin-edit                   changeset=678132, submitted=1
history-file                   count=2, latest=678132
history-folder                 count=6, latest=678132
changeset-files                count=1, containsTest=true
diff-revisions                 lines=4, hasEdit=true
delete-file                    affected=1
pending-delete                 status=pendingDelete, changeType=delete, lock
undo-delete                    affected=1
pending-final                  count=0
operation-logs                 count=34
```

## 七、测试产生的数据

本轮新增并提交了 1 个测试文件，随后又提交了 1 次修改：

- Server Path：`$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs/stage4-e2e-20260608124119.txt`
- Local Path：`/Users/fenghp/Desktop/DEV/mactfs-ai-workspace/stage4-e2e-20260608124119.txt`
- 新增 changeset：`678131`
- 修改 changeset：`678132`

最终状态：

- 测试 Workspace 保留。
- 测试 Mapping 保留 1 条。
- 测试文件保留在服务端测试目录中。
- 删除操作仅验证到 `pendingDelete`，随后已 `undo`，未提交删除。
- 最终 pending changes 为 0。

## 八、UI 验证记录

Electron UI 实际可见状态：

- 顶部显示 `macTFS 已连接`。
- 顶部显示 TFS 地址 `http://100.113.212.90:20094/tfs/`。
- Source List 显示 `PE`、`PKUSEHR`。
- 切换 `PKUSEHR` 后，根目录可加载并展示大量服务端目录。
- 中间 `Source Workspace` 文件列表可展示名称、类型、服务端路径、本地路径、映射、状态列。
- Inspector 显示 Pending Changes、Included Changes、Excluded Changes、Checkin 输入区。
- 空 pending 状态下 Checkin 按钮禁用。
- 本地服务显示 `服务可用`，服务地址为 `http://127.0.0.1:38765`。
- Console 显示 API 操作日志，包括 `serverTree`、`serverFolderItems`、`listMappings` 等成功记录。

普通浏览器访问 `http://localhost:5173/` 时，因没有 Electron preload，页面显示：

```text
未检测到 Electron preload，请通过 Electron 启动 macTFS。
```

该行为符合前端规范：React 组件不直接读取本机 token，必须通过 Electron preload 获取本机能力。

## 九、发现问题与风险

### P2-1：顶部工具栏全局 Get Latest / History / Compare / Mapping 按钮仍为禁用展示

现象：

- Electron UI 顶部工具栏中的 `Get Latest`、`History` 按钮为 disabled。
- 主内容标题栏中的全局 `Compare`、`Mapping` 按钮也为 disabled。
- 当前可操作入口主要在中间目录面板内：目录区域的 `History`、映射提示、已映射目录下的 `Compare`、选中文件后的 `Get Latest / Checkout`。

影响：

- 不影响 API / Core 能力。
- 不影响当前已实现的面板内操作链路。
- 可能影响用户对顶部工具栏的预期，后续可以决定是接入当前选中目录，还是隐藏未完成的全局按钮。

建议：

- 后续前端任务中补齐顶部工具栏与当前选中路径、Mapping 状态、History/Diff 面板的联动。
- 或在未接入前移除禁用按钮，避免误导。

### P2-2：深层目录 UI 手动验证效率较低

现象：

- `PKUSEHR` 根目录目录项较多，手动通过 Source List 展开到 `$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs` 较慢。
- 通过 Computer Use 手动点击时，长列表滚动和元素编号变化容易误点。

影响：

- 不影响真实 API 能力。
- 会影响人工验收指定深层路径时的效率。

建议：

- 前端后续可增加服务端路径输入 / 快速跳转。
- E2E 自动化可在 Electron 启动调试端口后使用稳定的 DOM 自动化工具继续补充深层 UI 点击脚本。

## 十、未覆盖项

- 未通过 UI 再次执行真实 add/checkin/delete 写操作，原因是 API 层已完成真实写入验证，本轮 UI 只做可见性和只读链路确认，避免重复污染 TFS 测试目录。
- 未验证 Excluded 不参与签入的真实 UI 行为；当前 API checkin 支持 `serverPaths` 精确提交，UI 代码按 Included Changes 传入路径，本轮未制造多个 pending 文件做 UI 分组签入。
- 未验证目录对比面板中每个差异操作按钮的 UI 点击路径；API 已覆盖 `localOnly -> add`、`pendingDelete -> undo`，UI 面板结构已存在。
- 未验证二进制文件 diff、三方 merge 和冲突解决，这些不属于第一版范围。

## 十一、结论

阶段四 Feature E2E 的核心链路通过：

- 真实 TFS 连接、Collection、目录浏览可用。
- Workspace / Mapping / Get Latest 可用。
- 目录对比可识别干净目录和本地新增差异。
- Pending Changes、comment 必填、add、checkout、delete、undo、checkin 可用。
- 文件历史、目录历史、changeset 文件列表、本地 vs latest diff、历史版本 diff 可用。
- Electron UI 能通过 preload 读取 token 和服务状态，进入已连接工作台，并展示 Source List、文件列表、Inspector、Console。

当前主要遗留是前端顶部全局工具栏按钮仍为禁用展示，以及深层目录人工导航效率较低。除这些前端体验项外，本轮阶段四 Feature E2E 主链路验收通过。
