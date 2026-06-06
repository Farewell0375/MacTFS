# CORE-007 实现签出新增删除撤销

## 状态

done

## 优先级

P0

## 所属阶段

core

## 依赖任务

- CORE-006

## 需求来源

- PRD 六、6.5 Checkout
- PRD 六、6.6 Add
- PRD 六、6.7 Delete

## 目标

实现 TFS 文件操作：checkout、add、delete、undo。

## 实现范围

- 单文件 checkout
- 目录递归 checkout
- 本地新增文件 pend add
- 已版本控制文件 pend delete
- pending change undo
- 返回操作结果和失败列表

## 不在范围

- 不做自动 checkout
- 不做未下载服务端文件删除
- 不做物理删除已版本控制文件优先流程

## 涉及文件

- [tfsIntegration/src/org/jetbrains/tfsIntegration/core/TFSEditFileProvider.java](/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/src/org/jetbrains/tfsIntegration/core/TFSEditFileProvider.java)
- [tfsIntegration/src/org/jetbrains/tfsIntegration/core/tfs/operations](/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/src/org/jetbrains/tfsIntegration/core/tfs/operations)
- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 已下载文件可 checkout
- 目录 checkout 可递归执行
- localOnly 可 add
- 已版本控制文件可 pending delete
- pending changes 可 undo

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

- 新增 `checkout`，支持单文件和目录递归 pend edit。
- 新增 `add`，支持本地文件 pend add。
- 新增 `delete`，支持文件和目录 pending delete。
- 新增 `undo`，支持撤销传入路径 pending changes。

已执行测试：

- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew build`

测试结果：

- 构建通过。

未执行测试及原因：

- 未执行真实 checkout/add/delete/undo，避免默认修改真实 TFS 服务端 pending 状态。

验收标准：

- 已下载文件可 checkout：代码实现满足。
- 目录 checkout 可递归执行：代码实现满足。
- localOnly 可 add：代码实现满足。
- 已版本控制文件可 pending delete：代码实现满足。
- pending changes 可 undo：代码实现满足。

遗留问题：

- 无。
