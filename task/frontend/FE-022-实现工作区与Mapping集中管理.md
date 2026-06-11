# FE-022 实现工作区与 Mapping 集中管理

## 状态

done

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

### 实际修改文件

- `mactfsui/app/components/explorer/workspace-manage-dialog.tsx`（新增）：集中管理弹窗
  - 工作区信息区：Workspace / 服务器 / Collection / Owner / Computer / Mapping 数量（Owner、Computer 通过幂等的 `POST /api/workspace/ensure` 获取，未新增服务端接口）
  - Mapping 表格：服务端路径、本地路径、本地目录存在性（Electron `pathsExist` 批量检测，不存在标红）
  - 新增：输入服务端路径（校验 `$/` 前缀）→ 复用既有 `MappingDialog`（父目录选择 + 后端预校验 + 可选立即获取）
  - 删除：确认弹窗（说明不删除本地文件），调用既有 `DELETE /api/mappings`
  - 修改本地路径：内置 `EditMappingDialog`，选择新父目录 → `check-target` 预校验 → 「删旧 + 加新」，提示需重新获取
- `mactfsui/app/components/app/top-bar.tsx`：顶栏新增「工作区」按钮
- `mactfsui/app/components/app/workspace-shell.tsx`：持有弹窗显隐，Mapping 变化后统一刷新 mappings 与目录列表

### 实际实现内容

- 顶栏「工作区」一键打开集中管理弹窗，无需到目录树逐个右键
- 全部 mapping 一屏可见，本地目录缺失（已映射未下载 / 被手动删除）醒目标红
- 三类操作（新增 / 删除 / 改路径）完成后目录树映射标识、列表状态列同步刷新
- 未新增服务端接口，全部复用既有 mappings API

### 已执行测试

- `pnpm typecheck`：通过
- 服务端无改动，无需重新构建（沿用 FE-021 构建产物）

### 未执行测试及原因

- 真实 TFS 环境的映射增删改落盘验证：本机无环境，待 FEATURE 阶段执行

### 是否满足验收标准

- 工作区信息与全部 Mapping 展示、增 / 删 / 改、本地目录缺失标识：满足（代码层面）
- 前端 typecheck 通过：满足

### 遗留问题

- 「修改本地路径」中删旧成功但加新失败时会处于无映射状态（已在弹窗错误提示中说明需重新映射）
- 删除映射后该子树挂起更改的处理沿用服务端默认行为，未做额外清理
