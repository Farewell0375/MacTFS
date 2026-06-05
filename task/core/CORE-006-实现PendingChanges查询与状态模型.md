# CORE-006 实现 Pending Changes 查询与状态模型

## 状态

todo

## 优先级

P0

## 所属阶段

core

## 依赖任务

- CORE-004

## 需求来源

- PRD 五、5.5 目录对比
- PRD 六、6.8 Pending Changes

## 目标

实现查询当前 Workspace 挂起更改，并统一文件状态枚举。

## 实现范围

- 查询 Workspace 下 Pending Changes
- 定义 `pendingEdit`、`pendingAdd`、`pendingDelete` 等状态
- 对接旧插件 `StatusProvider` 思路
- 返回可供 UI Included / Excluded 使用的数据结构

## 不在范围

- 不做 UI 的 Included / Excluded 状态
- 不做签入
- 不做目录对比完整实现

## 涉及文件

- [tfsIntegration/src/org/jetbrains/tfsIntegration/core/tfs/StatusProvider.java](/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/src/org/jetbrains/tfsIntegration/core/tfs/StatusProvider.java)
- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 可查询当前 Workspace pending changes
- 状态字段稳定可序列化
- 可区分 edit / add / delete

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
```

## 完成记录

待完成后填写。
