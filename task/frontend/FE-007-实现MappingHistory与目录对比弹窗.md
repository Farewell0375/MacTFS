# FE-007 实现 Mapping、History 与目录对比弹窗

## 状态

done

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-005
- FE-006
- SERVER-006
- SERVER-008
- SERVER-009

## 需求来源

- PRD 七、7.2 创建 Mapping
- PRD 七、7.3 目录对比并处理差异
- PRD 七、7.5 查看历史和 Diff
- [mactfsui/FRONTEND_SPEC.md](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/FRONTEND_SPEC.md)

## 目标

把 Mapping、History、目录对比从主列表内嵌块迁移到弹窗，释放中间工作区，并统一对象操作入口。

## 实现范围

- Mapping 创建弹窗
- History 弹窗
- 目录对比弹窗
- 弹窗内的基础筛选、刷新和对象操作入口
- Mapping 创建后的本地目录选择与是否立即 Get Latest 选项
- Mapping 创建时的目标路径预校验与结果预览
- 目录对比默认隐藏 `upToDate`

## 不在范围

- 不实现文件查看弹窗
- 不实现 Diff 弹窗
- 不实现冲突处理弹窗
- 不做新路由

## 涉及文件

- [mactfsui/app/components/explorer](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/explorer)
- [mactfsui/app/components/app](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/app)
- [mactfsui/app/routes/home.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/routes/home.tsx)

## 验收标准

- 中间文件列表不再内嵌 Mapping、History、目录对比大块内容
- 未映射目录可以通过弹窗创建 Mapping
- History 弹窗可展示文件或目录历史
- 目录对比弹窗可按状态筛选差异
- 目录对比结果项通过右键菜单触发对象动作
- Mapping 弹窗选择的是本地父目录，不是最终映射目录
- Mapping 最终路径以后端返回结果为准
- 如果最终目标目录已存在，弹窗直接提示“已存在，禁止映射”并禁用确认
- Mapping 创建成功后可选立即 Get Latest

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

### 实际修改文件

- `mactfsui/app/components/explorer/mapping-dialog.tsx`（新增）：Mapping 创建弹窗
- `mactfsui/app/components/explorer/history-dialog.tsx`（新增）：History 弹窗（文件 / 目录历史、changeset 下钻、版本勾选）
- `mactfsui/app/components/explorer/compare-dialog.tsx`（新增）：目录对比弹窗（状态筛选、重新对比、结果项右键菜单）
- `mactfsui/app/components/app/workspace-shell.tsx`：新增 DialogState，分发器接管 map / history / compare 动作，Mapping 创建成功后刷新 mappings 与当前目录
- `mactfsui/app/components/ui/dialog.tsx` / `checkbox.tsx` / `select.tsx`（新增）：shadcn 基础组件（button.tsx 同步 registry 小更新）

### 实际实现内容

- Mapping 弹窗：展示服务端路径；选择 / 输入本地父目录（Electron 走系统目录选择器）；输入防抖后调用 `/api/mappings/check-target` 预校验，最终映射路径以后端返回为准；目标已存在时提示「目标目录已存在，禁止映射」并禁用确认；支持「创建后立即获取最新」；成功后刷新 mappings 与当前目录列表、停留当前浏览位置
- History 弹窗：文件 / 目录历史表格（changeset / 类型 / 作者 / 时间 / 注释）；目录历史点击 changeset 编号或双击行下钻影响文件列表并可返回；文件历史可勾选两个版本（对比按钮在 FE-008 提供 Diff 后启用，现按 onDiffRevisions 可选注入）
- 目录对比弹窗：递归对比已映射目录；默认隐藏 `upToDate`，「显示最新项」开关可恢复；按结果中出现的状态生成可点选筛选 chips；支持重新对比；结果项复用 `FileTargetMenu` 统一右键菜单
- 中间文件列表保持纯浏览，无任何内嵌 Mapping / History / 对比大块内容

### 已执行测试

- `pnpm typecheck`：通过
- Playwright 浏览器验证（mock API，未改源码）：
  - 未映射目录 → 映射弹窗 → 填入父目录 → 预览最终路径 `/Users/fenghp/tfs/Tools`
  - 父目录含已存在目标 → 提示「目标目录已存在，禁止映射」且确认按钮禁用
  - 正常创建 → 弹窗关闭、该目录菜单变为已映射规则（含取消映射）
  - 目录历史 → changeset 102 下钻显示 2 个文件 → 返回列表
  - 目录对比默认 3/4 项（隐藏 upToDate）；点状态 chip 过滤到 1 项；开「显示最新项」后 4 项；结果行右键弹出统一菜单

### 是否满足验收标准

- 中间列表不再内嵌大块内容：满足
- 未映射目录可通过弹窗创建 Mapping：满足
- History 弹窗可展示文件或目录历史：满足
- 目录对比可按状态筛选差异：满足
- 对比结果项通过右键菜单触发动作：满足
- Mapping 选择的是本地父目录：满足
- 最终路径以后端返回为准：满足
- 目标已存在提示并禁用确认：满足
- 创建成功后可选立即 Get Latest：满足

### 遗留问题

- 文件历史「对比所选版本」按钮依赖 FE-008 的 Diff 弹窗注入 `onDiffRevisions` 后生效
- 对比结果中的 getLatest / checkout / undo 等动作执行待 FE-009 / FE-010
