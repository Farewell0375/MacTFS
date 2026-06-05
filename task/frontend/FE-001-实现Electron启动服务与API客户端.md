# FE-001 实现 Electron 启动服务与 API 客户端

## 状态

todo

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- SERVER-002

## 需求来源

- PRD 三、阶段三：Frontend
- PRD 六、UI 设计

## 目标

让 Electron 启动时能够拉起或连接本地 Java API 服务，并提供前端 API 客户端。

## 实现范围

- Electron 主进程启动本地服务
- 检查 `127.0.0.1:38765` health
- 读取 token 文件
- 前端封装统一 API 请求方法
- 请求自动带 Bearer token

## 不在范围

- 不实现业务页面
- 不做打包
- 不做自动更新

## 涉及文件

- [mactfsui/electron/main.cjs](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/electron/main.cjs)
- [mactfsui/app](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app)

## 验收标准

- Electron 启动后可连接本地 API
- API 请求能自动带 token
- 服务未启动时 UI 有明确提示

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
