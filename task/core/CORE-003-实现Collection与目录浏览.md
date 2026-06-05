# CORE-003 实现 Collection 与目录浏览

## 状态

todo

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

待完成后填写。
