# macTFS 阶段三 CLI API 客户端测试报告

## 一、测试依据

- 任务路线图：`task/00-roadmap.md`
- 阶段三任务：`task/cli/CLI-001`、`task/cli/CLI-002`
- AI 测试流程：`TFS-AI测试流程.md`
- 阶段二报告：`testing/mactfs-stage2-server-api-test-report.md`
- 执行时间：2026-06-06 16:52-16:58
- 执行入口：`mactfs` CLI，调用本地 Java API 服务

阶段三在当前任务体系中定义为 `CLI`，测试目标是验证 CLI 已从直接执行 SDK 动作扩展为本地 API 调试客户端，同时保留必要的旧版 `--action` 验证入口。

## 二、测试环境

- 服务地址：`http://127.0.0.1:38765`
- Java：项目内 x86_64 JDK 8
- CLI 运行方式：`build/install/mactfs/bin/mactfs`
- 本地 API 服务启动命令：

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
  arch -x86_64 ../tfsIntegration/gradlew -q runServer
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
- `installDist` 成功生成 CLI 发行脚本

## 三、测试边界

写操作严格限制在测试流程指定目录：

- Collection：`PKUSEHR`
- Workspace：`mactfs-ai-subapp-pm-mactfs`
- Server Path：`$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs`
- Local Path：`/Users/fenghp/Desktop/DEV/mactfs-ai-workspace`

本轮重点验证 CLI 调用本地 API 的能力。未新增、删除或签入 TFS 文件，仅执行了连接、读取、Get Latest、目录对比和预期失败类调试请求。

敏感信息处理：

- `token --show` 只记录输出长度，不记录 token 明文。
- `curl health` 输出使用 `$(mactfs token --show)`，不直接暴露 token。
- 连接请求使用 AI 流程既有测试账号信息，报告不重复记录密码明文。
- 测试前 `~/.mactfs/config.json` 不存在；测试过程中 API 写入过连接配置，测试结束后已删除并恢复为不存在状态。

## 四、阶段三 CLI 测试结果

| 能力域 | CLI / 测试项 | 结果 | 关键结果 |
|---|---|---|---|
| 构建 | `clean build installDist` | 通过 | Gradle `BUILD SUCCESSFUL` |
| 服务未启动 | `health --output json` | 通过 | 返回结构化失败 `Connection refused`，进程非 0 |
| Token | `token --show` | 通过 | 可读取本地 token，输出长度为 43，未记录明文 |
| Token | `~/.mactfs/server-token` 权限 | 通过 | 权限为 `600` |
| Curl 辅助 | `curl health` | 通过 | 输出 `curl -H "Authorization: Bearer $(mactfs token --show)" ...` |
| 服务启动 | `runServer` | 通过 | 监听 `127.0.0.1:38765` |
| Health | `health --output json` | 通过 | `success=true`，`operation=health`，`port=38765` |
| 通用 API | `api --method GET --path /api/health` | 通过 | 返回服务端 health JSON |
| 通用 API | `api --method GET --api-path /api/health` | 通过 | `--api-path` 兼容入口可用 |
| 配置读取 | `api --method GET --path /api/config` | 通过 | 空配置返回默认 `authType=ntlm-explicit` |
| 未配置失败 | `api --method GET --path /api/collections` | 通过 | 返回 `Missing required argument username`，进程非 0 |
| 会话连接 | `api --method POST --path /api/session/connect --body ...` | 通过 | `collectionCount=2` |
| Collection | `api --method GET --path /api/collections` | 通过 | 返回 `PE`、`PKUSEHR` |
| 服务端目录 | `api --method GET --path /api/server-folder/items?...` | 通过 | 指定测试目录返回 2 个历史测试文件 |
| Workspace | `api --method POST --path /api/workspace/ensure` | 通过 | 复用测试 Workspace，`created=false` |
| Mapping | `api --method GET --path /api/mappings` | 通过 | 返回 1 条测试 Mapping |
| Get Latest | `api --method POST --path /api/files/get-latest` | 通过 | `updated=2`、`operations=3`、`conflicts=0`、`failures=0` |
| Pending | `api --method GET --path /api/pending-changes` | 通过 | pending 数量为 0 |
| 目录对比 | `api --method POST --path /api/compare/folder` | 通过 | 严格顺序复测后 diff 数量为 0 |
| 历史 | `api --method GET --path /api/history?...` | 通过 | 指定测试目录返回 4 条历史 |
| Changeset | `api --method GET --path /api/history/changeset?changeset=678012` | 通过 | 返回 1 个文件 |
| Diff | `api --method POST --path /api/diff/revisions` | 通过 | `678011` vs `678012` 返回 5 行 diff |
| 错误透传 | `api --method POST --path /api/checkin --body {}` | 通过 | 返回 `Missing required field: comment`，进程非 0 |
| 旧 CLI 兼容 | `--action test-connection --reuse-config true --output json` | 通过 | 旧入口仍可连接，`collectionCount=2` |
| Token 缺失 | 隔离 `user.home` 后执行 `token --show` | 通过 | 返回 `Token file not found ... Start macTFS API server first.` |
| Token 缺失 JSON | 隔离 `user.home` 后执行 `health --output json` | 通过 | 返回结构化失败 JSON |
| 操作日志 | `api --method GET --path /api/logs` | 通过 | 日志包含成功和失败调试请求 |

## 五、关键输出摘要

服务未启动时：

```json
{"success":false,"message":"Connection refused (Connection refused)","logs":"","data":{}}
```

服务启动后 health：

```json
{"success":true,"message":"ok","operation":"health","data":{"status":"ok","host":"127.0.0.1","port":38765,"connected":false}}
```

会话连接：

```json
{"success":true,"message":"success","operation":"connect","data":{"serverUri":"http://100.113.212.90:20094/tfs/","collectionCount":2}}
```

目录对比顺序复测：

```json
{"success":true,"message":"success","operation":"compareFolder","data":{"diffs":[]}}
```

错误透传：

```json
{"success":false,"message":"Missing required field: comment","errorMessage":"Missing required field: comment","operation":"checkin"}
```

## 六、测试产生的数据

本轮未新增 TFS 文件，未产生新的 changeset。

复用的既有测试文件：

- `$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs/ai-smoke-20260606051038.txt`
- `$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs/stage2-api-20260606151706.txt`

最终状态：

- 测试 Workspace 保留。
- 测试 Mapping 保留 1 条。
- 最终 pending changes 为 0。
- 本地测试目录未发现 `teamexplorer*.tmp` 残留。
- `~/.mactfs/config.json` 已恢复为测试前状态：测试前不存在，测试后已删除。
- `~/.mactfs/phase-one.properties` 未修改。

## 七、发现问题与风险

### P2-1：并发执行 Get Latest 与 Compare Folder 会产生瞬时目录对比噪声

现象：

- 并发执行 `get-latest`、`pending-changes`、`compare-folder` 时，`compare-folder` 曾返回 2 个 `teamexplorer*.tmp` 的 `localOnly` 差异。
- 随后检查本地目录时未发现这些临时文件残留。
- 改为严格顺序执行 `get-latest -> pending-changes -> compare-folder` 后，目录对比返回 0 个差异。

判断：

- 该现象更接近 TFS SDK 同步过程中的临时文件被目录对比并发扫描到，不是阶段三 CLI API 客户端的请求封装问题。
- 阶段二修复过的 `localModified` 误报未复现。

影响：

- 如果 UI 或脚本未来并发触发同步和目录对比，可能短暂看到本地临时文件差异。

建议：

- UI 和自动化流程中保持 `Get Latest` 完成后再触发目录对比。
- 如后续需要支持并发扫描，可在 core 目录对比中忽略 TFS SDK 临时文件命名模式。

修复状态：已修复。

修复时间：2026-06-06

修复内容：

- `MacTfsCoreService.collectLocalFiles` 扫描本地目录时跳过 `teamexplorer*.tmp`。
- 避免 Get Latest 同步期间 TFS SDK 临时文件被误报为 `localOnly`。

修复后验证：

- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew build`
- 验证结果：构建通过。

### P2-2：旧 `--action list-mappings --reuse-config true` 受本机旧配置影响失败

现象：

- 执行旧入口 `--action list-mappings --reuse-config true --output json` 时失败。
- 错误为 `Workspace not found: mactfs-PKUSEHR-fenghaopengdeMacBook-Pro.local`。

原因：

- 本机 `~/.mactfs/phase-one.properties` 指向旧 Workspace 和旧业务目录，不是本轮阶段三测试 Workspace。
- 旧 `--action` 入口使用第一阶段配置文件，不读取第二阶段 `~/.mactfs/config.json`。

影响：

- 不影响阶段三新增的 `token`、`health`、`api`、`curl` 命令。
- 会影响依赖旧 `--action` 且直接复用本机历史配置的调试命令。

本轮处理：

- 改用不依赖旧 Workspace 的 `--action test-connection --reuse-config true --output json` 验证旧入口兼容性，结果通过。
- 未修改 `~/.mactfs/phase-one.properties`。

修复状态：已修复。

修复时间：2026-06-08

修复内容：

- `LocalConfigStore.load()` 在读取旧 `phase-one.properties` 后，会优先合并本地 API 使用的 `~/.mactfs/config.json`。
- 旧 `--action ... --reuse-config true` 入口可复用第二阶段 API 配置中的 `serverUri`、认证字段、`collection`、`workspace` 和首条 Mapping，避免继续使用本机历史 Workspace。

修复后验证：

- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew build`：通过。
- 隔离 `user.home` 只放置 `~/.mactfs/config.json` 后，执行旧入口 `--action test-connection --reuse-config true --output json`，返回 `Connection refused`，说明 CLI 已读取 `config.json` 中的 `serverUri`，不再因缺少 `--server-uri` 或旧 Workspace 失败。

## 八、未覆盖项

- 未通过 CLI API 执行 `add`、`checkout`、`delete`、`undo`、`checkin` 的真实写入链路；这些已在阶段二 API 中覆盖，本轮避免重复写入 TFS。
- 未测试 UI 调用 CLI；阶段三验收对象是 CLI 调试入口，不包含 Electron UI。
- 未测试端口冲突；本轮启动前 `38765` 未被占用。
- 未测试复杂 body 文件输入；当前 CLI 只按 `--body <json>` 字符串传递。

## 九、结论

阶段三 CLI API 客户端主链路测试通过：

- `token --show`、`curl health`、`health`、通用 `api` 命令可用。
- CLI 可自动读取本地 token 并携带 Bearer auth 调用本地 API。
- CLI 能通过本地 API 完成连接、Collection、服务端目录、Workspace、Mapping、Get Latest、Pending、目录对比、History、Changeset、Diff 和日志读取。
- CLI 能透传服务端失败响应，并在 JSON 模式下输出结构化错误。
- 旧 `--action` 入口仍可执行 `test-connection` 验证，不影响原 MVP 核心连接能力。

除并发同步与目录对比的瞬时噪声、旧第一阶段配置指向历史 Workspace 这两个使用风险外，阶段三 CLI 作为本地 API 调试客户端可用。
