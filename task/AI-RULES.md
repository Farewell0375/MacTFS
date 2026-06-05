# AI 开发执行规则

## 一、任务前置读取

AI 执行任何任务前，必须读取：

- [docs/mactfs-api-product-prd.md](/Users/fenghp/Desktop/DEV/project/mydev/docs/mactfs-api-product-prd.md)
- [task/README.md](/Users/fenghp/Desktop/DEV/project/mydev/task/README.md)
- [task/AI-RULES.md](/Users/fenghp/Desktop/DEV/project/mydev/task/AI-RULES.md)
- 当前任务文件

如果任务涉及源码，还必须读取相关模块现有代码，优先复用项目已有写法。

## 二、任务状态更新

开始任务前：

- 将当前任务文件 `## 状态` 改为 `doing`
- 更新 [task/README.md](/Users/fenghp/Desktop/DEV/project/mydev/task/README.md) 中对应任务状态
- 不允许跳过依赖任务

完成任务后：

- 将当前任务文件 `## 状态` 改为 `done`
- 在当前任务 `## 完成记录` 写入实际修改内容、测试结果和遗留问题
- 更新 [task/README.md](/Users/fenghp/Desktop/DEV/project/mydev/task/README.md) 总进度
- 更新 [task/README.md](/Users/fenghp/Desktop/DEV/project/mydev/task/README.md) 下一步任务

阻塞任务：

- 将状态改为 `blocked`
- 写清阻塞原因
- 写清需要用户提供什么信息或外部条件

## 三、代码修改规则

代码修改必须遵守项目根目录的 AGENTS 规则：

- 编辑任何文件前必须先执行 `chmod u+w <文件路径>` 或 `chmod 644 <文件路径>`
- 最小改动
- 复用现有代码风格
- 不主动过度工程化
- 不主动加入复杂防御逻辑
- 新增函数必须有函数级注释
- 修改核心逻辑必须补充必要注释

## 四、任务边界

AI 只能实现当前任务文件中 `## 实现范围` 的内容。

如果发现需要新增任务：

- 不要直接扩大当前任务范围
- 在当前任务完成记录中写入建议
- 必要时新增 task 文件并更新 README

## 五、验证规则

每个任务必须按 `## 测试方式` 执行验证。

如果无法执行测试，必须写明：

- 未执行的测试命令
- 未执行原因
- 当前可验证的替代结果

## 六、测试规范

任务完成前必须执行与改动范围匹配的最小验证。

后端 / Core / CLI 任务默认验证：

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
```

前端任务默认验证：

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

文档 / task 任务默认验证：

```bash
find /Users/fenghp/Desktop/DEV/project/mydev/task -type f -name "*.md" | wc -l
git status --short
```

真实 TFS 操作类任务必须谨慎：

- 不要默认执行会修改 TFS 服务端状态的操作。
- `checkin`、`delete`、`undo`、`add`、`checkout` 等操作必须在任务文件明确要求或用户确认后执行。
- 如果只完成代码实现但未执行真实 TFS 验证，必须在完成记录中说明。

## 七、验收规范

每个任务完成时必须对照当前任务的 `## 验收标准` 逐条确认。

完成记录必须包含：

- 实际修改文件
- 实际实现内容
- 已执行测试
- 测试结果
- 未执行测试及原因
- 是否满足验收标准
- 遗留问题

端到端验收任务必须覆盖：

- UI 行为
- API 行为
- Core 调用结果
- 错误提示
- 操作日志

如果验收标准无法满足，不允许把任务标记为 `done`，必须标记为 `blocked` 或保留 `doing` 并写明原因。

## 八、Git 规范

当前项目使用根目录单 Git 仓库统一管理。

纳入 Git：

- `docs/`
- `task/`
- `mactfs/src/`
- `mactfs/build.gradle`
- `mactfs/settings.gradle`
- `mactfsui/app/`
- `mactfsui/electron/`
- `mactfsui/package.json`
- `mactfsui/pnpm-lock.yaml`
- `tfsIntegration/src/`
- `tfsIntegration/resources/`
- `tfsIntegration/lib/`
- `tfsIntegration/build.gradle`

禁止纳入 Git：

- `node_modules/`
- `build/`
- `.gradle/`
- `.mactfs/`
- `workspace/`
- `.env`
- `*.log`
- 本地 JDK 目录
- 本地真实 TFS 工作区下载内容

分支规则：

- `main` 保持稳定。
- AI 开发任务使用 `codex/` 前缀分支。
- 分支名建议格式：`codex/<task-id>-<short-title>`。
- 示例：`codex/core-001-extract-core-service`。

提交规则：

- 推荐一个 task 一个 commit。
- 不要把多个无关 task 混在一个 commit。
- commit message 使用模块前缀。
- 示例：`core: extract tfs core service layer`。
- 示例：`server: add local token auth`。
- 示例：`frontend: build source explorer layout`。
- 示例：`task: update progress after core 001`。

每次任务完成后，AI 必须先执行：

```bash
git status --short
```

然后在最终输出中说明：

- 当前分支
- 修改了哪些文件
- 是否已暂存
- 是否已提交

除非用户明确要求，AI 不主动执行 `git add` 或 `git commit`。

## 九、输出规则

每次完成代码或任务文件改动后，最终输出必须包含：

- 修改说明
- 需求 / Bug 原因
- 解决方案
- 具体改动内容
- 业务逻辑说明
- 风险与影响
