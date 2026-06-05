# CORE-005 实现 Get Latest 能力

## 状态

todo

## 优先级

P0

## 所属阶段

core

## 依赖任务

- CORE-004

## 需求来源

- PRD 五、5.4 文件操作
- PRD 七、7.2 创建 Mapping

## 目标

实现文件、目录和整个 Mapping 粒度的 Get Latest。

## 实现范围

- 对单文件执行 Get Latest
- 对目录递归执行 Get Latest
- 对整个 Mapping 执行 Get Latest
- 返回 updated、operations、conflicts、failures 等结果

## 不在范围

- 不做指定 changeset 获取
- 不做冲突解决 UI
- 不做异步任务

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- Mapping 建立后可选择不立即下载
- 后续可对 Mapping 下子目录或文件单独下载
- 下载结果可被 API 和 UI 展示

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
```

## 完成记录

待完成后填写。
