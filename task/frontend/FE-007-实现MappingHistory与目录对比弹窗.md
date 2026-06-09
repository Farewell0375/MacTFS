# FE-007 实现 Mapping、History 与目录对比弹窗

## 状态

todo

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

待完成后填写。
