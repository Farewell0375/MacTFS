# CORE-011 实现文件内容与 Diff 能力

## 状态

todo

## 优先级

P0

## 所属阶段

core

## 依赖任务

- CORE-010

## 需求来源

- PRD 五、5.7 Diff
- PRD 六、6.11 Diff

## 目标

实现文件服务端内容获取、本地与 latest 对比、两个历史版本对比。

## 实现范围

- 获取指定 changeset 文件内容
- 获取 latest 文件内容
- 本地文件 vs latest 生成文本 diff
- 两个 changeset 版本生成文本 diff
- 识别文本文件优先处理

## 不在范围

- 不做三方 merge
- 不做二进制可视化 diff
- 不做目录级内容 diff

## 涉及文件

- [tfsIntegration/src/org/jetbrains/tfsIntegration/core/TFSDiffProvider.java](/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/src/org/jetbrains/tfsIntegration/core/TFSDiffProvider.java)
- [tfsIntegration/src/org/jetbrains/tfsIntegration/core/revision/TFSContentRevision.java](/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/src/org/jetbrains/tfsIntegration/core/revision/TFSContentRevision.java)
- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 单文件可对比本地与服务器 latest
- 历史记录中两个版本可对比
- 目录对比不会触发所有文件内容下载

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
```

## 完成记录

待完成后填写。
