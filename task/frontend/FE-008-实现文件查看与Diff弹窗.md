# FE-008 实现文件查看与 Diff 弹窗

## 状态

todo

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-002
- FE-006
- FE-007
- SERVER-009

## 需求来源

- PRD 六、6.11 Diff
- [mactfsui/FRONTEND_SPEC.md](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/FRONTEND_SPEC.md)

## 目标

提供文件只读查看和文本 Diff 能力，支持从文件列表、History、Pending Changes、目录对比结果进入。

## 实现范围

- 文件查看弹窗
- 本地文件 vs 服务器 latest Diff 弹窗
- 两个历史版本 Diff 弹窗
- 来源标识、大小、编码、搜索、行号、差异高亮
- 大文件、二进制文件、非 Mapping 路径的提示

## 不在范围

- 不提供文件编辑能力
- 不实现 Monaco / CodeMirror 必选升级
- 不实现三方合并编辑
- 不做多标签页 Diff

## 涉及文件

- [mactfsui/app/components/explorer](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer)
- [mactfsui/app/lib/api](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/api)
- [mactfsui/package.json](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/package.json)

## 验收标准

- 已映射文件可查看本地内容
- 未映射文件可查看服务器 latest 内容
- 可从文件列表、History 或目录对比进入 Diff
- 大于 5MB 文件不直接渲染内容
- 非 Mapping 路径的本地内容读取被拒绝

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
```

## 完成记录

待完成后填写。
