# FE-034 UI改版回归验收

## 状态

done

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

- 实际修改文件：
  - 移植 `mactfsui/scripts/e2e-electron.mjs`、`e2e-electron-part2.mjs`、`shot-workspace.mjs`（与现代风分支共用同一套回归脚本）
  - 新增 `docs/ui-restyle-screenshots/`（macOS 风 6 张关键页面截图）
- 实际实现内容（验收执行）：
  - playwright-core 驱动真实 Electron 应用连真实 TFS，两轮共 13 项检查通过：
    1. 本地服务自动拉起 → macOS 风登录页（毛玻璃品牌区/最近连接/服务指示灯）
    2. 连接真实 TFS → Collection 卡片选择 → 进入工作台（上下文正确）
    3. 主题切换 跟随系统→亮→暗 生效（暗色工作台截图存档）
    4. 目录树懒加载导航至指定测试目录
    5. 目录历史弹窗（Sheet 式，真实 Changeset 678739）
    6. 文件查看弹窗（服务器 latest）
    7. 目录对比（先确认选项再执行流程正常）
    8. 签出文件 → 挂起更改出现 → 本地 vs latest Monaco Diff → 撤销恢复现场（仅动 ai-smoke 测试文件）
    9. 操作日志面板记录真实 API 调用（undo /api/files/undo 等）
  - 接口契约零改动：`app/lib/api` 未触碰（新增 platform.ts / recent-servers.ts 为纯前端工具）
  - `pnpm typecheck` / `pnpm build` 每任务提交前均通过
- 测试结果：
  - 13/14 PASS；1 项 FAIL 为环境因素：「创建/取消映射」跳过（测试目录已被既有 Workspace 映射且含用户真实挂起更改，避免破坏现场）
- 遗留问题：
  - 「映射到本地 / 取消映射」建议在干净环境人工补验一次
  - vibrancy 毛玻璃实际透出效果（截图合成不含窗后模糊）建议真机肉眼确认一次
