# SERVER-002 实现 Token 认证与健康检查

## 状态

done

## 优先级

P0

## 所属阶段

server

## 依赖任务

- SERVER-001

## 需求来源

- PRD 四、4.2 本地 Token Auth
- PRD 五、5.1 基础接口

## 目标

实现本地 Bearer token 认证和 `/api/health`。

## 实现范围

- 启动时生成或读取 `~/.mactfs/server-token`
- token 文件权限按 `600` 处理
- 请求校验 `Authorization: Bearer <token>`
- `/api/health` 返回服务状态

## 不在范围

- 不做用户体系
- 不做局域网访问
- 不打印 token 值到默认日志

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 无 token 请求被拒绝
- 正确 token 请求通过
- 可通过 health 检查服务状态

## 测试方式

```bash
curl http://127.0.0.1:38765/api/health
curl -H "Authorization: Bearer <token>" http://127.0.0.1:38765/api/health
```

## 完成记录

- 实际修改文件：
  - `mactfs/src/main/java/com/mydev/mactfs/server/MacTfsServer.java`
- 实际实现内容：
  - 启动时读取或生成 `~/.mactfs/server-token`。
  - token 文件权限设置为 `600`。
  - 所有 `/api/*` 请求校验 `Authorization: Bearer <token>`。
  - 新增 `GET /api/health`，返回 host、port、tokenFile、configFile、connected 和 durationMs。
- 已执行测试：
  - 无 token 调用 `GET /api/health`。
  - 带正确 Bearer token 调用 `GET /api/health`。
  - 检查 `~/.mactfs/server-token` 文件权限。
- 测试结果：
  - 无 token 返回 HTTP 401。
  - 正确 token 返回 `success=true`、`host=127.0.0.1`、`port=38765`。
  - token 文件权限为 `600`。
- 未执行测试及原因：
  - 未打印 token 明文，符合默认日志不暴露 token 的要求。
- 是否满足验收标准：
  - 无 token 请求被拒绝：满足。
  - 正确 token 请求通过：满足。
  - 可通过 health 检查服务状态：满足。
- 遗留问题：
  - 无。
