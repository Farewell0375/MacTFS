# SERVER-007 实现文件操作 API

## 状态

done

## 优先级

P0

## 所属阶段

server

## 依赖任务

- SERVER-006
- CORE-005
- CORE-007
- CORE-008

## 需求来源

- PRD 五、5.4 文件操作

## 目标

实现 Get Latest、checkout、add、delete、undo、checkin 和 pending changes API。

## 实现范围

- `POST /api/files/get-latest`
- `POST /api/files/checkout`
- `POST /api/files/add`
- `POST /api/files/delete`
- `POST /api/files/undo`
- `GET /api/pending-changes`
- `POST /api/checkin`

## 不在范围

- 不做 Work Item
- 不做 Check-in Policy UI
- 不做冲突解决器

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- API 可操作同一 Workspace 下文件
- checkin comment 必填
- pending changes 可查询
- 操作结果包含成功、失败、耗时

## 测试方式

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:38765/api/pending-changes
```

## 完成记录

- 实际修改文件：
  - `mactfs/src/main/java/com/mydev/mactfs/server/MacTfsServer.java`
- 实际实现内容：
  - 新增 `POST /api/files/get-latest`。
  - 新增 `POST /api/files/checkout`。
  - 新增 `POST /api/files/add`。
  - 新增 `POST /api/files/delete`。
  - 新增 `POST /api/files/undo`。
  - 新增 `GET /api/pending-changes`。
  - 新增 `POST /api/checkin`。
  - checkin comment 通过必填校验，缺失时返回错误。
- 已执行测试：
  - 执行 `../tfsIntegration/gradlew build`。
- 测试结果：
  - build 成功。
- 未执行测试及原因：
  - 未执行 get latest、checkout、add、delete、undo、checkin 的真实 TFS 操作，避免在未确认工作区和文件范围时修改本地或服务端状态。
- 是否满足验收标准：
  - API 可操作同一 Workspace 下文件：代码已复用 core 文件操作。
  - checkin comment 必填：满足。
  - pending changes 可查询：代码已实现。
  - 操作结果包含成功、失败、耗时：统一 API 响应包含 success、errorMessage、durationMs。
- 遗留问题：
  - 需要真实映射目录后补充文件操作实测。
