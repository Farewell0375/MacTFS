# FE-003 实现 VS 风格主布局

## 状态

todo

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-001

## 需求来源

- PRD 六、6.1 布局

## 目标

实现参考 Visual Studio Source Control Explorer 的主界面布局。

## 实现范围

- 顶部连接与 Workspace 信息区
- 左侧 Collection 服务端目录树区域
- 中间目录文件列表区域
- 右侧挂起更改区域
- 底部操作日志区域
- 基础响应式尺寸处理

## 不在范围

- 不实现具体业务数据
- 不实现完整 diff 展示

## 涉及文件

- [mactfsui/app/routes/home.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/routes/home.tsx)
- [mactfsui/app/app.css](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/app.css)

## 验收标准

- UI 不再是默认模板页
- 主界面布局与 PRD 区域一致
- 桌面窗口下可正常使用

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
