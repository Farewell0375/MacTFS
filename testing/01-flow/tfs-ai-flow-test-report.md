# TFS-AI 测试流程执行报告

## 一、测试依据

- 测试流程文件：`/Users/fenghp/Desktop/DEV/project/mydev/TFS-AI测试流程.md`
- 执行入口：`mactfs` CLI / core
- 执行时间：2026-06-06
- Java 运行方式：项目内 x86_64 JDK 8 + `arch -x86_64`

## 二、测试边界

服务端写操作严格限制在测试流程指定目录：

- Server Path：`$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs`

测试 Workspace：

- `mactfs-ai-subapp-pm-mactfs`

原流程建议本地目录：

- `/Users/fenghp/Desktop/DEV/project/mydev/workspace/ai-mactfs`

实际执行本地目录：

- `/Users/fenghp/Desktop/DEV/mactfs-ai-workspace`

调整原因：

- 推荐目录及其同级目录已被现有 Workspace `mactfs-mydev-01HRAP4GQ` 的本地映射覆盖。
- TFS 不允许不同 Workspace 使用互相包含的本地路径。
- 为继续完成测试流程，服务端测试目录保持不变，仅将本地目录切换到项目目录外的隔离路径。

## 三、构建验证

执行命令：

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
env JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
  arch -x86_64 ../tfsIntegration/gradlew clean build installDist
```

结果：

- 构建通过。
- 发行脚本生成通过。
- Gradle 输出 `BUILD SUCCESSFUL`。
- 当前 `mactfs` 模块仍无 test source，Gradle 输出 `:test NO-SOURCE`。

## 四、按 TFS-AI 流程执行结果

| 能力域 | 测试项 | 结果 | 关键结果 |
|---|---|---|---|
| 连接与会话 | `test-connection` | 通过 | 可连接 TFS，`collectionCount=2` |
| Collection | `list-collections` | 通过 | 返回 `PE`、`PKUSEHR` |
| 服务端目录 | `browse-server-path` | 通过 | 指定测试目录可浏览，当前目录项 `0` |
| Workspace | `ensure-workspace` | 通过 | 复用 `mactfs-ai-subapp-pm-mactfs`，`created=false` |
| Mapping | 初始 `list-mappings` | 通过 | 初始 mapping 数量 `0` |
| Mapping | `add-mapping` | 通过 | 测试服务端目录映射到隔离本地目录 |
| Mapping | 保存后 `list-mappings` | 通过 | mapping 数量 `1` |
| Get Latest | `get-latest` | 通过 | `updated=1`，`operations=1`，`conflicts=0`，`failures=0` |
| Pending Changes | 初始查询 | 通过 | pending 数量 `0` |
| 目录对比 | `compare-folder` | 通过 | diff 数量 `0` |
| 历史记录 | 目录历史 | 通过 | history 数量 `1` |
| 文件新增 | `add` | 通过 | `affected=1` |
| Pending Changes | `pendingAdd` 查询 | 通过 | pending 数量 `1`，状态 `pendingAdd` |
| Checkin | 新增文件 checkin | 通过 | changeset `678011`，提交 `1` 个变更 |
| Pending Changes | checkin 后查询 | 通过 | pending 数量 `0` |
| 文件内容 | `file-content` latest | 通过 | latest changeset `678011`，内容长度 `42` |
| Checkout | `checkout` | 通过 | `affected=1` |
| Pending Changes | `pendingEdit` 查询 | 通过 | pending 数量 `1`，状态 `pendingEdit` |
| Diff | 本地 vs latest | 通过 | diff 行数 `5`，包含新增行 |
| Checkin | 修改文件 checkin | 通过 | changeset `678012`，提交 `1` 个变更 |
| 历史记录 | 单文件历史 | 通过 | history 数量 `2` |
| Changeset | changeset 文件列表 | 通过 | changeset `678012` 返回 `1` 个文件 |
| Diff | 两个历史版本 diff | 通过 | `678011` vs `678012`，diff 行数 `5` |
| Delete | `delete` pend delete | 通过 | `affected=1` |
| Pending Changes | `pendingDelete` 查询 | 通过 | pending 数量 `1`，状态 `pendingDelete` |
| Undo | 撤销删除 | 通过 | `affected=1` |
| Pending Changes | undo 后查询 | 通过 | pending 数量 `0` |
| Mapping | `delete-mapping` | 通过 | 删除后 mapping 数量 `0` |
| Mapping | 恢复 `add-mapping` | 通过 | 恢复后 mapping 数量 `1` |

## 五、测试产生的数据

测试文件：

- Server Path：`$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs/ai-smoke-20260606051038.txt`
- Local Path：`/Users/fenghp/Desktop/DEV/mactfs-ai-workspace/ai-smoke-20260606051038.txt`

产生的 changeset：

- 新增文件：`678011`
- 修改文件：`678012`

最终状态：

- 测试 Workspace 保留。
- 测试 Mapping 已恢复并保留 1 条。
- 测试文件保留在服务端测试目录中。
- 最终 Pending Changes 为 `0`。
- 本机原 `~/.mactfs/phase-one.properties` 已恢复，未保留测试配置覆盖。

## 六、未执行或未覆盖项

- 未执行删除后的 checkin：本轮只验证了 `pendingDelete` 和 `undo`，未把测试文件从服务端删除。
- 未测试 server API：当前源码仍未看到完整 server 入口实现。
- 未测试 UI：当前 frontend 阶段尚未完成。
- 未测试删除 Workspace：当前 CLI/core 未提供删除 Workspace 动作，流程文档也明确不应作为当前版本必测项。
- 未测试二进制可视化 diff、三方 merge、目录级完整内容 diff：这些不属于当前版本支持范围。

## 七、发现问题

### P1-1：推荐本地测试目录与既有 Workspace 映射冲突

现象：

- 使用流程推荐本地目录 `/Users/fenghp/Desktop/DEV/project/mydev/workspace/ai-mactfs` 执行 `add-mapping` 失败。
- 同级目录 `/Users/fenghp/Desktop/DEV/project/mydev/workspace/ai-mactfs-cli` 也失败。

错误信息：

```text
The path ... is already mapped in workspace mactfs-mydev-01HRAP4GQ.
```

影响：

- 不影响服务端指定测试目录。
- 会影响按文档固定 local path 复现完整流程。

本轮处理：

- 改用 `/Users/fenghp/Desktop/DEV/mactfs-ai-workspace` 作为隔离本地目录。
- 完整测试流程在该目录下通过。

建议：

- 后续将 TFS-AI 流程中的本地目录调整为不与任何现有 Workspace 重叠的路径。
- 或在测试前增加“检查本地路径是否已被其他 Workspace 占用”的前置项。

### P2-1：连接类动作仍不支持 `--reuse-config true`

状态：已修复。

修复时间：2026-06-06

修复内容：

- `test-connection` 和 `list-collections` 已支持显式 `--reuse-config true`。
- 未显式 `--reuse-config true` 时仍保持连接参数必填校验。

修复后验证：

- `clean build installDist` 通过。
- `test-connection --reuse-config true` 成功，返回 `collectionCount=2`。
- `list-collections --reuse-config true` 成功，返回 `PE`、`PKUSEHR`。
- `test-connection --output json` 未传连接参数时仍返回 `Missing required argument --server-uri`。
- `list-mappings --reuse-config true` 回归通过，返回 1 条 Mapping。

影响：

- 已消除连接类动作无法复用本地配置的问题。
- 当前仍要求调用方显式传入 `--reuse-config true`，未传时保持缺参失败，符合本次修复后的行为。

## 八、结论

按 `TFS-AI测试流程.md` 当前 CLI/core 可执行范围，本轮已覆盖：

- 连接
- Collection 查询
- 服务端目录浏览
- Workspace 复用
- Mapping 新增 / 查询 / 删除 / 恢复
- Get Latest
- Pending Changes
- add / checkout / delete / undo
- checkin
- 文件内容
- 本地 vs latest diff
- 单文件历史
- changeset 文件列表
- 两个历史版本 diff
- 目录对比

除本地推荐目录冲突外，当前 core/cli 主链路验证通过。
