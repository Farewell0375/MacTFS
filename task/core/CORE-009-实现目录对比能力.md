# CORE-009 实现目录对比能力

## 状态

todo

## 优先级

P0

## 所属阶段

core

## 依赖任务

- CORE-005
- CORE-006

## 需求来源

- PRD 五、5.5 目录对比
- PRD 六、6.4 目录对比

## 目标

实现已映射目录的递归对比，找出本地与服务器的差异文件。

## 实现范围

- 根据 Mapping 解析 localPath 与 serverPath
- 批量查询服务端 ExtendedItem
- 批量查询 PendingChange
- 扫描本地文件
- 合并输出差异状态
- 默认不返回 upToDate

## 不在范围

- 不逐文件下载内容做 diff
- 不做实时 watcher
- 不做自动修复全部差异

## 涉及文件

- [tfsIntegration/src/org/jetbrains/tfsIntegration/core/tfs/StatusProvider.java](/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/src/org/jetbrains/tfsIntegration/core/tfs/StatusProvider.java)
- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 能识别 localModified、remoteChanged、localOnly、notDownloaded、localDeleted、pending 状态
- 大目录不逐文件下载服务端内容
- 结果可供 UI 勾选后处理

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
```

## 完成记录

待完成后填写。
