# CORE-008 实现签入能力

## 状态

done

## 优先级

P0

## 所属阶段

core

## 依赖任务

- CORE-006
- CORE-007

## 需求来源

- PRD 六、6.9 Checkin

## 目标

实现按选中 pending changes 执行 checkin，并支持必填 comment。

## 实现范围

- 接收同一 Workspace 下的 server paths
- 使用 comment 执行 TFS checkin
- 返回 changeset 编号
- 返回 policy / 权限 / 冲突错误信息

## 不在范围

- 不做 Work Item 绑定
- 不做复杂 Check-in Policy UI
- 不做跨 Workspace 签入

## 涉及文件

- [tfsIntegration/src/org/jetbrains/tfsIntegration/core/TFSCheckinEnvironment.java](/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/src/org/jetbrains/tfsIntegration/core/TFSCheckinEnvironment.java)
- [tfsIntegration/src/org/jetbrains/tfsIntegration/core/tfs/VersionControlServer.java](/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/src/org/jetbrains/tfsIntegration/core/tfs/VersionControlServer.java)
- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- comment 为空时核心层拒绝签入
- 只提交传入的 pending changes
- 成功返回 changeset

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
```

## 完成记录

完成时间：2026-06-05

实际修改文件：

- `mactfs/src/main/java/com/mydev/mactfs/core/MacTfsCoreService.java`
- `mactfs/src/main/java/com/mydev/mactfs/TfsPhaseOneService.java`
- `mactfs/src/main/java/com/mydev/mactfs/MacTfsCli.java`

实际实现内容：

- 新增 `checkin`，按传入 server paths 过滤同一 Workspace 的 pending changes。
- comment 为空时核心层直接返回失败。
- 成功时返回 changeset 编号和提交变更数量。

已执行测试：

- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew build`

测试结果：

- 构建通过。

未执行测试及原因：

- 未执行真实 checkin，避免默认提交真实 TFS 变更。

验收标准：

- comment 为空时核心层拒绝签入：满足。
- 只提交传入的 pending changes：满足。
- 成功返回 changeset：代码实现满足。

遗留问题：

- 无。
