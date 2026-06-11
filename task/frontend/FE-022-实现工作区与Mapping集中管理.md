# FE-022 实现工作区与 Mapping 集中管理

## 状态

todo

## 优先级

P1

## 所属阶段

frontend

## 依赖任务

- FE-007
- FE-013

## 需求来源

- [docs/mactfs-ui-enhancement-requirements-2.md](/Users/fenghp/Desktop/DEV/project/mydev/docs/mactfs-ui-enhancement-requirements-2.md) R8

## 目标

提供工作区集中管理入口：在一个弹窗内查看 Workspace 信息和全部 Mapping，
支持新增、删除、修改本地路径，替代只能在目录树逐个右键操作的现状，
对齐 VS 的 Edit Workspace 对话框。

## 实现范围

- 顶栏新增「工作区」按钮，打开集中管理弹窗：
  - 工作区信息区：名称、Owner、Computer、服务器地址、Collection
  - Mapping 表格：服务器路径、本地路径、本地目录是否存在（不存在标红提示）
- Mapping 操作：
  - 新增：复用既有映射弹窗逻辑（选择服务器路径 + 本地父目录），完成后可触发 Get Latest
  - 删除：确认弹窗，说明不会删除本地已下载文件；调用既有 `DELETE /api/mappings`
  - 修改本地路径：实现为「删旧 + 加新」，确认弹窗提示将按新路径重新获取
- 操作完成后刷新工作区上下文（mappings）、目录树映射标识与挂起更改
- server 复用既有 `GET/POST/DELETE /api/mappings`，原则上不新增接口；
  如需 Workspace 详细信息可扩展既有 `/api/workspace/context` 返回字段

## 不在范围

- 不做多 Workspace 创建 / 切换 / 删除
- 不做 cloak（遮蔽）类型的 mapping
- 不迁移本地已下载内容（修改本地路径后由用户自行决定是否重新获取）

## 涉及文件

- [mactfsui/app/components/app/top-bar.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/app/top-bar.tsx)
- [mactfsui/app/components/app/workspace-shell.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/app/workspace-shell.tsx)
- [mactfsui/app/components/app/workspace-dialogs.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/app/workspace-dialogs.tsx)
- [mactfsui/app/components/explorer/mapping-dialog.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer/mapping-dialog.tsx)
- [mactfsui/app/lib/api](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/api)
- [mactfsui/app/lib/tfs/session.ts](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/tfs/session.ts)
- [mactfs/src/main/java/com/mydev/mactfs/server/MacTfsServer.java](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/server/MacTfsServer.java)

## 验收标准

- 顶栏可打开工作区管理弹窗，正确展示 Workspace 信息与全部 Mapping
- 可在弹窗内新增 Mapping，与目录树右键映射效果一致
- 可删除 Mapping（带确认），目录树映射标识同步更新
- 可修改 Mapping 本地路径（删旧加新），有重新获取提示
- 本地目录不存在的 Mapping 有醒目标识
- 前端 typecheck 通过

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
