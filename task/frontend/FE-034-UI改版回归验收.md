# FE-034 UI改版回归验收

## 状态

todo

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-026 ~ FE-033 全部完成

## 需求来源

- [docs/mactfs-ui-restyle-requirements.md](/Users/fenghp/Desktop/DEV/project/mydev/docs/mactfs-ui-restyle-requirements.md) U9
- [TFS-AI测试流程.md](/Users/fenghp/Desktop/DEV/project/mydev/TFS-AI测试流程.md)

## 目标

确认 UI 改版后所有业务链路零回归，作为本批改版的收口验收。

## 实现范围

- 按测试大纲走查 UI 链路：登录连接、Collection 选择、目录浏览、Mapping、GetLatest、签出/新增/删除/撤销、签入、历史、Diff、目录对比、分支合并、工作区管理
- 明暗两种主题下分别走查关键页面
- 确认 `app/lib` 与接口契约零改动（diff 检查）
- 关键页面截图存档到 `docs/` 或任务完成记录
- `pnpm typecheck` 通过

## 不在范围

- 真实 TFS 写操作验收（属 FEATURE-001 ~ 005，按测试大纲限定目录执行）
- 性能压测

## 涉及文件

- 无新增改动（验收任务，发现问题回各任务修复）

## 验收标准

- 全部业务链路在新 UI 下可用，无功能回归
- 明暗主题下均无样式破损
- typecheck 通过
- 验收记录与截图归档

## 测试方式

```bash
cd mactfsui && pnpm typecheck && pnpm electron:dev
# 按 TFS-AI测试流程.md 第 6 节分组走查
```

## 完成记录

待完成后填写：

- 实际修改文件：
- 实际实现内容：
- 测试结果：
- 遗留问题：
