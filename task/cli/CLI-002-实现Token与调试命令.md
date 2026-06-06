# CLI-002 实现 Token 与调试命令

## 状态

done

## 优先级

P1

## 所属阶段

cli

## 依赖任务

- CLI-001
- SERVER-002

## 需求来源

- PRD 四、4.2 本地 Token Auth

## 目标

实现 `mactfs token --show` 和常用 curl 调试辅助命令。

## 实现范围

- 读取 `~/.mactfs/server-token`
- 输出 token
- 提供 health 调试命令
- 文档中给出 curl 示例

## 不在范围

- 不自动暴露 token 到日志
- 不实现复杂认证

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs/MacTfsCli.java](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/MacTfsCli.java)

## 验收标准

- 可通过 CLI 查看 token
- curl 调试命令可复用 token
- token 文件不存在时提示清晰

## 测试方式

```bash
mactfs token --show
```

## 完成记录

完成时间：2026-06-06

实际修改文件：

- `mactfs/src/main/java/com/mydev/mactfs/MacTfsCli.java`

实际实现内容：

- 新增 `token --show` 子命令，读取 `~/.mactfs/server-token` 并输出 token。
- token 文件不存在或内容为空时返回明确错误提示。
- 新增 `curl health` 子命令，输出可复用的 health curl 示例：
  - `curl -H "Authorization: Bearer $(mactfs token --show)" "http://127.0.0.1:38765/api/health"`
- 新增 `health` 子命令，作为 token 和本地 API 的快速调试命令。

已执行测试：

- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew build`
- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew -q run --args='token --show' | awk '{print length($0)}'`
- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew -q run --args='curl health'`
- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew -q run --args='health --output json'`

测试结果：

- Gradle 构建通过。
- `token --show` 可读取本地 token；测试中只输出 token 长度，未在记录中暴露 token 明文。
- `curl health` 输出可复制的 curl 调试命令，并通过 `$(mactfs token --show)` 复用 token。
- 本地 API 服务启动后，`health --output json` 返回 `success=true`。

未执行测试及原因：

- 未保留或记录 token 明文，符合“不自动暴露 token 到日志”的范围约束。

是否满足验收标准：

- 可通过 CLI 查看 token：满足。
- curl 调试命令可复用 token：满足。
- token 文件不存在时提示清晰：代码已实现明确错误提示；当前本机已有 token 文件，因此未破坏真实 token 文件做缺失场景实测。

遗留问题：

- 无。
