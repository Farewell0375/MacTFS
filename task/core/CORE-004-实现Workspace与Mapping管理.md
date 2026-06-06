# CORE-004 实现 Workspace 与 Mapping 管理

## 状态

done

## 优先级

P0

## 所属阶段

core

## 依赖任务

- CORE-002
- CORE-003

## 需求来源

- PRD 四、4.4 Workspace 策略
- PRD 五、5.3 Workspace 与 Mapping

## 目标

实现单 Collection 默认 Workspace 和多 Mapping 管理能力。

## 实现范围

- 按 `mactfs-{collection}-{username}-{computer}` 规则生成 Workspace 名称
- 查询或创建当前 Collection 的默认 Workspace
- 查询 Workspace 当前 Mapping
- 添加 Mapping
- 删除 Mapping
- 检查 serverPath / localPath 映射冲突

## 不在范围

- 不支持跨 Collection Workspace
- 不支持多 Profile
- 不做复杂 Mapping 编辑 UI

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 同一 Collection 可复用默认 Workspace
- 一个 Workspace 可保存多条 Mapping
- Mapping 保存后后续可用于 Get Latest 和目录对比

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

- 新增默认 Workspace 名称生成逻辑：`mactfs-{collection}-{username}-{computer}`。
- 新增 `ensureWorkspace` 查询或创建当前 Collection 下 Workspace。
- 新增 `listMappings`、`addMapping`、`deleteMapping`。
- 添加 serverPath/localPath 映射冲突检查。

已执行测试：

- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew build`

测试结果：

- 构建通过。

未执行测试及原因：

- 未执行真实 Workspace 创建和 Mapping 修改，避免默认修改真实 TFS 服务端状态。

验收标准：

- 同一 Collection 可复用默认 Workspace：代码实现满足。
- Workspace 可保存多条 Mapping：代码实现满足。
- Mapping 可用于 Get Latest 和目录对比：代码实现满足。

遗留问题：

- 无。
