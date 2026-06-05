# FE-012 实现文件 Diff 界面

## 状态

todo

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-011
- SERVER-009

## 需求来源

- PRD 六、6.11 Diff

## 目标

实现本地 vs latest 和两个历史版本之间的文本 diff 展示。

## 实现范围

- 打开文件 diff 页面或面板
- 展示本地文件 vs 服务器 latest
- 展示历史版本 A vs 历史版本 B
- 文本 diff 左右对比
- 二进制或不支持文件显示提示

## 不在范围

- 不做三方 merge
- 不做二进制可视化
- 不做冲突解决器

## 涉及文件

- [mactfsui/app](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app)

## 验收标准

- 可从目录对比结果打开 diff
- 可从历史记录选择两个版本打开 diff
- 大文件或不支持类型有明确提示

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
