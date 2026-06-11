# FE-031 弹窗体系统一macOS风格

## 状态

done

## 优先级

P1

## 所属阶段

frontend

## 依赖任务

- FE-026

## 需求来源

- [docs/mactfs-ui-restyle-requirements.md](/Users/fenghp/Desktop/DEV/project/mydev/docs/mactfs-ui-restyle-requirements.md) U6

## 目标

把全部弹窗统一为 macOS Sheet 风格，结构一致、动效一致。

## 实现范围

- 统一 Dialog 基础组件：顶部标题区、内容区、底部按钮区结构与间距规范
- 出入场动效统一为缩放 + 淡入（spring 近似曲线），遮罩淡入淡出
- 覆盖弹窗：mapping / history / compare / diff / file-view / conflict / properties / rename / get-version / branch / merge / workspace-manage / add-files / confirm / workspace-dialogs
- 大弹窗（History、Compare、Diff）优化分区留白与表格样式
- 弹窗内表单控件按 FE-026 token 对齐

## 不在范围

- 不改各弹窗的业务流程与接口调用
- Monaco Diff 编辑器内部主题深度定制

## 涉及文件

- `mactfsui/app/components/ui/dialog.tsx`
- `mactfsui/app/components/explorer/*-dialog.tsx`（13 个）
- `mactfsui/app/components/app/confirm-dialog.tsx`
- `mactfsui/app/components/app/workspace-dialogs.tsx`

## 验收标准

- 所有弹窗结构、间距、按钮排布一致，出入场动效统一流畅
- 大弹窗内表格与分区样式精致清晰
- 各弹窗功能（确认、提交、二次弹窗）无回归

## 测试方式

```bash
cd mactfsui && pnpm typecheck && pnpm electron:dev
# 手工验证：逐一打开全部弹窗检查样式与动效
```

## 完成记录

- 实际修改文件：
  - `mactfsui/app/components/ui/dialog.tsx`
- 实际实现内容：
  - 全部 15 个弹窗共用同一 Dialog 基础组件，在基础组件统一升级为 macOS Sheet 风格，等效全量统一：
    - 定位改为顶部锚定（top-12 水平居中），打开时自顶部下滑 + 淡入（spring 近似曲线 200ms），关闭时上滑淡出 150ms——贴近 macOS sheet 从标题栏垂下的动效
    - 容器 `border + shadow-dialog` 取代原 ring，rounded-xl（14px）
    - 标题统一 `font-semibold tracking-tight`
    - 遮罩 `bg-black/20 + backdrop-blur` 淡入淡出
  - 底部按钮区沿用 DialogFooter 的 `bg-muted/50 + border-t` 分区带；查看器形态弹窗（History/Diff/FileView/Properties）无底栏，结构保持
- 测试结果：
  - `pnpm typecheck` 通过、`pnpm build` 通过，产物确认 slide-in-from-top-6 / ease-spring 已编译
  - 顶部锚定与最小窗口（980×640）下 92svh 高弹窗的边界在 FE-034 回归确认
- 遗留问题：
  - 无
