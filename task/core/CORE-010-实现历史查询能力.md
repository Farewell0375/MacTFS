# CORE-010 实现历史查询能力

## 状态

todo

## 优先级

P0

## 所属阶段

core

## 依赖任务

- CORE-004

## 需求来源

- PRD 五、5.6 历史记录
- PRD 六、6.10 History

## 目标

实现文件历史、目录历史和 changeset 文件列表查询。

## 实现范围

- 文件历史最近 100 条
- 目录历史最近 100 条
- queryHistory 使用 includeFiles
- 解析 changeset 内影响文件列表
- 返回 changeset、作者、时间、comment、changeType

## 不在范围

- 不做作者筛选
- 不做时间筛选
- 不做 changeset 范围筛选

## 涉及文件

- [tfsIntegration/src/org/jetbrains/tfsIntegration/core/TFSHistoryProvider.java](/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/src/org/jetbrains/tfsIntegration/core/TFSHistoryProvider.java)
- [tfsIntegration/src/org/jetbrains/tfsIntegration/core/tfs/VersionControlServer.java](/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/src/org/jetbrains/tfsIntegration/core/tfs/VersionControlServer.java)
- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 文件可返回最近 100 条历史
- 目录可返回最近 100 条历史
- 点击 changeset 所需文件列表数据可返回

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
```

## 完成记录

待完成后填写。
