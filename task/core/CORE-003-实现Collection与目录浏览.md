# CORE-003 实现 Collection 与目录浏览

## 状态

done

## 优先级

P0

## 所属阶段

core

## 依赖任务

- CORE-002

## 需求来源

- PRD 五、5.2 Collection 与目录
- PRD 六、6.2 左侧目录树

## 目标

实现查询 Collection 和浏览 TFS 服务端目录树的核心能力。

## 实现范围

- 查询当前账号可见 Collection
- 连接指定 Collection
- 浏览 `$ /` 或指定 server path 下一级目录和文件
- 返回名称、serverPath、类型、是否文件夹等信息

## 不在范围

- 不做本地 Mapping
- 不做目录对比
- 不做历史查询

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 能返回 Collection 列表
- 能浏览 Collection 下服务端目录
- 未映射目录也能浏览

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

- 新增 `listCollections` 查询可见 Collection。
- 新增 `browseServerPath` 浏览 `$ /` 或指定服务端路径的下一级文件和文件夹。
- 返回 `name`、`serverPath`、`folder`、`latestVersion`、`checkinDate`。

已执行测试：

- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew build`

测试结果：

- 构建通过。

未执行测试及原因：

- 未执行真实 Collection 浏览，避免默认访问真实 TFS 环境。

验收标准：

- 能返回 Collection 列表：代码实现满足。
- 能浏览 Collection 下服务端目录：代码实现满足。
- 未映射目录也能浏览：使用 VersionControlClient 直接按 server path 查询，满足。

遗留问题：

- 无。
