# macTFS 阶段二 Server API 测试报告

## 一、测试依据

- 任务路线图：`task/00-roadmap.md`
- 阶段二任务：`task/server/SERVER-001` 至 `task/server/SERVER-010`
- AI 测试流程：`TFS-AI测试流程.md`
- PRD：`docs/mactfs-api-product-prd.md`
- 执行时间：2026-06-06 15:13-15:20
- 执行入口：`mactfs` 本地 Java API 服务

阶段二在当前任务体系中定义为 `Server API`，测试对象是本地常驻 Java HTTP 服务，不包含阶段三 CLI 改造和阶段四 Frontend UI。

## 二、测试环境

- 服务地址：`http://127.0.0.1:38765`
- Java：项目内 x86_64 JDK 8
- 启动命令：

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
  arch -x86_64 ../tfsIntegration/gradlew runServer
```

- 构建命令：

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
  arch -x86_64 ../tfsIntegration/gradlew clean build installDist
```

构建结果：

- `BUILD SUCCESSFUL`
- `:test NO-SOURCE`
- `installDist` 成功生成发行脚本

## 三、测试边界

写操作严格限制在测试流程指定目录：

- Collection：`PKUSEHR`
- Workspace：`mactfs-ai-subapp-pm-mactfs`
- Server Path：`$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs`
- Local Path：`/Users/fenghp/Desktop/DEV/mactfs-ai-workspace`

本轮不测试：

- Frontend UI
- 阶段三 CLI API 客户端改造
- 删除 Workspace
- WebSocket / SSE 实时日志
- 异步 Job / 取消任务
- 真实慢请求触发超时

测试前 `~/.mactfs/config.json` 不存在。测试过程中写入过配置接口，测试结束后已删除该测试配置。

## 四、阶段二 API 测试结果

| 能力域 | API / 测试项 | 结果 | 关键结果 |
|---|---|---|---|
| 构建 | `clean build installDist` | 通过 | Gradle `BUILD SUCCESSFUL` |
| 服务启动 | `runServer` | 通过 | 监听 `127.0.0.1:38765` |
| Token | 无 token 调用 `/api/health` | 通过 | HTTP 401 |
| Token | 正确 Bearer token 调用 `/api/health` | 通过 | `success=true`，`host=127.0.0.1`，`port=38765` |
| Token | token 文件权限 | 通过 | `~/.mactfs/server-token` 权限为 `600` |
| 配置 | `GET /api/config` 空配置 | 通过 | 默认 `authType=ntlm-explicit`，`mappings=[]` |
| 配置 | `PUT /api/config` 后 `GET /api/config` | 通过 | serverUri、collection、workspace、mappings 可回读 |
| 连接 | `POST /api/session/connect` 正确账号 | 通过 | `collectionCount=2`，durationMs `2442` |
| 连接 | `POST /api/session/connect` 错误密码 | 通过 | `success=false`，返回 Access denied，未暴露密码明文 |
| Collection | `GET /api/collections` | 通过 | 返回 `PE`、`PKUSEHR` |
| 目录浏览 | `GET /api/server-tree` | 通过 | 指定测试目录可浏览，返回 `name/path/serverPath/type/folder/latestVersion/checkinDate` |
| 目录浏览 | `GET /api/server-folder/items` | 通过 | 指定测试目录返回 1 个条目 |
| Workspace | `POST /api/workspace/ensure` | 通过 | 复用 `mactfs-ai-subapp-pm-mactfs`，`created=false` |
| Workspace | `GET /api/workspace` | 通过 | 返回当前 workspace 和 1 条 mapping |
| Mapping | `GET /api/mappings` | 通过 | 返回 1 条测试 mapping |
| Mapping | `DELETE /api/mappings` | 通过 | 删除后 mapping 数量为 0 |
| Mapping | `POST /api/mappings`，`getLatest=true` | 通过 | 恢复 mapping，联动 Get Latest：`updated=1`、`operations=2`、`conflicts=0`、`failures=0` |
| Get Latest | `POST /api/files/get-latest` | 通过 | `updated=1`、`operations=2`、`conflicts=0`、`failures=0` |
| Pending | 初始 `GET /api/pending-changes` | 通过 | pending 数量为 0 |
| 目录对比 | `POST /api/compare/folder` | 有问题 | API 成功返回，但同步后误报 `localModified`，详见问题 P1-1 |
| 历史 | 目录 `GET /api/history?folder=true` | 通过 | 返回 3 条历史，最近 changeset 包含 `678012`、`678011`、`678008` |
| 历史 | 文件 `GET /api/history` | 通过 | 已有测试文件返回 2 条历史 |
| Changeset | `GET /api/history/changeset?changeset=678012` | 通过 | 返回 1 个文件 |
| Diff | `POST /api/diff/revisions` | 通过 | `678011` vs `678012` 返回 5 行 diff，包含 revision 2 |
| Diff | `POST /api/diff/local-latest` 无本地改动 | 通过 | 返回 4 行文本，无差异标记 |
| Add | `POST /api/files/add` | 通过 | 新增测试文件 `affected=1` |
| Pending | 新增后 `GET /api/pending-changes` | 通过 | 状态为 `pendingAdd` |
| Checkin | 缺少 comment 调用 `/api/checkin` | 通过 | `success=false`，`Missing required field: comment` |
| Checkin | 有 comment 调用 `/api/checkin` | 通过 | 生成 changeset `678021` |
| Pending | checkin 后查询 | 通过 | pending 数量为 0 |
| Checkout | `POST /api/files/checkout` | 通过 | `affected=1` |
| Pending | checkout 后查询 | 通过 | 状态为 `pendingEdit` |
| Diff | 本地修改后 `POST /api/diff/local-latest` | 通过 | 返回 5 行 diff，包含本地新增行 |
| Undo | `POST /api/files/undo` 撤销编辑 | 通过 | `affected=1`，pending 清空，本地内容恢复 |
| Delete | `POST /api/files/delete` | 通过 | `affected=1`，状态为 `pendingDelete` |
| Undo | `POST /api/files/undo` 撤销删除 | 通过 | `affected=1`，pending 清空，本地文件恢复 |
| 日志 | `GET /api/logs` | 通过 | 返回 42 条操作日志，包含成功和失败操作 |

## 五、测试产生的数据

本轮新增并提交了 1 个测试文件：

- Server Path：`$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs/stage2-api-20260606151706.txt`
- Local Path：`/Users/fenghp/Desktop/DEV/mactfs-ai-workspace/stage2-api-20260606151706.txt`
- Checkin comment：`mactfs stage2 api smoke 20260606151706`
- Changeset：`678021`

本轮未提交删除操作。最终状态：

- 测试 Workspace 保留。
- 测试 Mapping 保留 1 条。
- 测试文件保留在服务端测试目录中。
- 最终 pending changes 为 0。
- `~/.mactfs/config.json` 已恢复为测试前状态：测试前不存在，测试后已删除。

## 六、发现问题

### P1-1：目录对比在已同步且无 pending changes 时误报 `localModified`

现象：

- 执行 `POST /api/files/get-latest` 成功，返回 `conflicts=0`、`failures=0`。
- 执行 `GET /api/pending-changes` 返回 0。
- 随后执行 `POST /api/compare/folder`，仍返回 `localModified`。

证据：

```text
$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs/ai-smoke-20260606051038.txt
status=localModified
localVersion=678012
latestVersion=678012

$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs/stage2-api-20260606151706.txt
status=localModified
localVersion=678021
latestVersion=678021
```

判断：

- `localVersion` 与 `latestVersion` 相同，且 pending changes 为 0，说明工作区实际是干净的。
- 当前 `compareFolder` 的 `localModified` 判断疑似依赖本地文件 mtime 与 TFS checkinDate 比较，导致刚同步或 undo 后的文件被误判为本地修改。

影响：

- 会影响阶段四 UI 的目录对比页面。
- 用户可能看到没有实际 pending changes 的文件被标为本地已修改。

建议：

- 后续修复 `MacTfsCoreService.compareFolder` 的本地修改判断。
- 优先以 TFS pending changes 和版本号差异作为状态依据；如果要基于 mtime 判断，需要结合 workspace 本地版本元数据，避免仅凭 `lastModified > checkinDate` 判定。

## 七、未覆盖项

- 未通过真实慢 TFS 请求触发 504 超时；当前仅确认所有 API 响应包含 `durationMs`，代码路径定义了超时返回 `Operation timed out`。
- 未测试端口冲突；本轮启动前 `38765` 未被占用。
- 未测试 PRD 中旧路径形式 `/api/workspaces/:name/mappings`，当前源码实现的阶段二实际路由是 `/api/workspace`、`/api/workspace/ensure`、`/api/mappings`。
- 未测试 Frontend UI；当前阶段二不包含 UI。

## 八、结论

阶段二 Server API 主链路已完成真实 TFS HTTP 验证：

- 服务启动、Token 鉴权、健康检查、配置读写通过。
- 连接、Collection、服务端目录浏览通过。
- Workspace 复用、Mapping 删除/恢复、Get Latest 通过。
- 文件 add、checkout、delete、undo、checkin、pending changes 通过。
- history、changeset、local-latest diff、revisions diff 通过。
- 操作日志可读取，失败操作也会进入日志。

除 `compareFolder` 在干净工作区误报 `localModified` 外，阶段二 Server API 可用。该问题不影响 pending changes 和 checkin 结果，但会影响后续 UI 目录对比展示，应在进入目录对比 UI 或 Feature E2E 前修复。

## 九、复测记录

复测时间：2026-06-06 15:34

复测原因：

- 针对 P1-1：目录对比在已同步且无 pending changes 时误报 `localModified`。

修复点：

- `MacTfsCoreService.resolveDiffStatus` 调整本地修改判断。
- `mtime` 仅在远端版本变化时作为辅助信号，避免 `Get Latest` 后本地文件时间晚于签入时间导致误报。

复测命令：

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
  arch -x86_64 ../tfsIntegration/gradlew clean build installDist
```

复测结果：

| 测试项 | 结果 | 关键结果 |
|---|---|---|
| 构建 | 通过 | `BUILD SUCCESSFUL` |
| 服务启动 | 通过 | 监听 `127.0.0.1:38765` |
| 连接 | 通过 | `collectionCount=2` |
| Mapping 查询 | 通过 | 测试目录 mapping 数量为 1 |
| 服务端目录浏览 | 通过 | 指定测试目录返回 2 个条目 |
| Get Latest | 通过 | `updated=2`、`operations=3`、`conflicts=0`、`failures=0` |
| Pending Changes | 通过 | pending 数量为 0 |
| 目录对比 | 通过 | diff 数量为 0，未再出现 `localModified` |

复测结论：

- P1-1 已修复。
- 严格顺序执行 `get-latest -> pending-changes -> compare-folder` 后，目录对比返回空差异列表。
- 阶段二 Server API 复测通过。
