# FEATURE-001 连接与目录浏览端到端验收

## 状态

todo

## 优先级

P0

## 所属阶段

feature

## 依赖任务

- FE-013
- SERVER-005

## 需求来源

- PRD 十、验收标准

## 目标

验证从登录页到固定 Collection / Workspace 上下文，再到目录树和当前目录列表的完整链路。

## 实现范围

- UI 输入账号密码并连接
- 连接后加载 Collection
- 选择 Collection 并自动确保 Workspace
- 展示左侧服务端目录树
- 点击目录展示中间当前目录列表
- 未映射目录也可浏览

## 不在范围

- 不验证 Mapping
- 不验证 Get Latest
- 不验证签入签出

## 涉及文件

- [mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs)
- [mactfsui](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui)

## 验收标准

- 真实 TFS 环境可连接
- Collection 可见并可确认
- 默认 Workspace 可自动使用或创建
- 服务端目录树可展开
- 中间当前目录列表可展示

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
