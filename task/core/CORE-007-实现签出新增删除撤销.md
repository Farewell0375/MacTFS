# CORE-007 实现签出新增删除撤销

## 状态

todo

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

待完成后填写。
