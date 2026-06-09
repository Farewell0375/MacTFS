# FE-003 实现连接页、Collection 选择与 Workspace 上下文

## 状态

todo

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-001
- FE-002
- SERVER-003
- SERVER-004
- SERVER-005
- SERVER-006

## 需求来源

- PRD 七、7.1 首次连接
- [mactfsui/FRONTEND_SPEC.md](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/FRONTEND_SPEC.md)

## 目标

实现前端新的连接入口：登录后先选择 Collection，再自动确保默认 Workspace，进入工作台后固定上下文。

## 实现范围

- 连接表单、连接中状态、错误提示
- 读取并回填默认配置
- 连接成功后加载 Collection 列表
- 登录页确认 Collection 后再进入工作台
- 自动查找或创建默认 Workspace
- 工作台共享状态中固定 `serverUri`、`collection`、`workspace`

## 不在范围

- 不实现工作台三栏布局
- 不实现目录树和文件列表
- 不支持工作台内切换 Collection
- 不提供 Workspace 手动选择控件

## 涉及文件

- [mactfsui/app/routes/home.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/routes/home.tsx)
- [mactfsui/app/components/app](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/components/app)
- [mactfsui/app/lib/api](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/api)

## 验收标准

- 登录页可以连接 TFS 并展示 Collection 选择
- 配置中有上次 Collection 时可默认回填
- 用户确认 Collection 后才进入工作台
- 工作台内展示固定 Collection 和当前 Workspace
- 前端没有 Workspace 选择控件

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
