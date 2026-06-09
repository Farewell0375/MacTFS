# FE-001 实现 Electron 启动服务、Preload 与 API 客户端

## 状态

todo

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- SERVER-002
- CLI-002

## 需求来源

- PRD 三、阶段四：Frontend Workspace UI
- [mactfsui/FRONTEND_SPEC.md](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/FRONTEND_SPEC.md)

## 目标

补齐 Electron 前端基础设施，让渲染进程通过 preload 和统一 API client 访问本地服务，而不是直接碰本机文件或 Java 进程。

## 实现范围

- Electron 主进程检查 `http://127.0.0.1:38765/api/health`
- 服务未启动时按本地开发约定拉起 `mactfs-server`
- 新增 `preload.cjs` 暴露 token、服务状态、目录选择等窄接口
- 渲染进程封装统一 API client
- API client 自动带 Bearer token
- 服务未就绪时提供明确错误提示和重试入口

## 不在范围

- 不实现业务页面
- 不实现目录树、文件列表、Pending Changes
- 不做 Release 打包
- 不在渲染进程直接暴露 `fs`、`child_process`

## 涉及文件

- [mactfsui/electron/main.cjs](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/electron/main.cjs)
- [mactfsui/electron/preload.cjs](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/electron/preload.cjs)
- [mactfsui/app/lib/api](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/api)
- [mactfsui/app/lib/electron](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/lib/electron)

## 验收标准

- Electron 启动后能检测本地 API 服务状态
- 服务未启动时能拉起或明确提示失败原因
- 渲染进程调用 API 时自动携带 token
- 渲染进程不直接读取 `~/.mactfs/server-token`
- 目录选择能力通过 preload 暴露

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
