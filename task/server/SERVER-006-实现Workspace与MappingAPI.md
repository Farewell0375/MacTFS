# SERVER-006 实现 Workspace 与 Mapping API

## 状态

done

## 优先级

P0

## 所属阶段

server

## 依赖任务

- SERVER-005
- CORE-004

## 需求来源

- PRD 五、5.3 Workspace 与 Mapping

## 目标

实现 Workspace 确保存在、Mapping 查询、创建和删除 API。

## 实现范围

- `GET /api/workspace`
- `POST /api/workspace/ensure`
- `GET /api/mappings`
- `POST /api/mappings`
- `DELETE /api/mappings`
- 创建 Mapping 后允许选择是否立即 Get Latest

## 不在范围

- 不做多 Workspace 管理 UI
- 不跨 Collection
- 不做复杂 Mapping 编辑

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 可创建或复用默认 Workspace
- 可添加多条 Mapping
- 可删除 Mapping
- 已映射路径可被后续操作识别

## 测试方式

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:38765/api/mappings
```

## 完成记录

- 实际修改文件：
  - `mactfs/src/main/java/com/mydev/mactfs/server/MacTfsServer.java`
- 实际实现内容：
  - 新增 `GET /api/workspace`。
  - 新增 `POST /api/workspace/ensure`。
  - 新增 `GET /api/mappings`。
  - 新增 `POST /api/mappings`。
  - 新增 `DELETE /api/mappings`。
  - 创建 Mapping 后支持 `getLatest=true` 立即执行 Get Latest。
  - Workspace/Mapping 成功后同步更新 `~/.mactfs/config.json`。
- 已执行测试：
  - 执行 `../tfsIntegration/gradlew build`。
- 测试结果：
  - build 成功。
- 未执行测试及原因：
  - 未执行真实 Workspace 创建和 Mapping 写入，避免在未确认 TFS 环境时修改服务端 Workspace。
- 是否满足验收标准：
  - 可创建或复用默认 Workspace：代码已调用 core `ensureWorkspace`。
  - 可添加多条 Mapping：代码已调用 core `addMapping` 并保存 mappings。
  - 可删除 Mapping：代码已调用 core `deleteMapping`。
  - 已映射路径可被后续操作识别：配置和会话均保存 mappings。
- 遗留问题：
  - 需要真实 TFS Workspace 环境后补充实测。
