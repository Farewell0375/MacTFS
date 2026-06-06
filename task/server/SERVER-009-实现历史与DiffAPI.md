# SERVER-009 实现历史与 Diff API

## 状态

done

## 优先级

P0

## 所属阶段

server

## 依赖任务

- SERVER-008
- CORE-010
- CORE-011

## 需求来源

- PRD 五、5.6 历史记录
- PRD 五、5.7 Diff

## 目标

实现历史记录、changeset 详情和文件 diff API。

## 实现范围

- `GET /api/history`
- `GET /api/history/changeset`
- `POST /api/diff/local-latest`
- `POST /api/diff/revisions`
- 历史默认最近 100 条

## 不在范围

- 不做筛选
- 不做三方 merge
- 不做二进制可视化 diff

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 文件历史可查询
- 目录历史可查询
- changeset 文件列表可查询
- 两个历史版本可对比

## 测试方式

```bash
curl -H "Authorization: Bearer <token>" "http://127.0.0.1:38765/api/history?path=<path>"
```

## 完成记录

- 实际修改文件：
  - `mactfs/src/main/java/com/mydev/mactfs/server/MacTfsServer.java`
- 实际实现内容：
  - 新增 `GET /api/history`。
  - 新增 `GET /api/history/changeset`。
  - 新增 `POST /api/diff/local-latest`。
  - 新增 `POST /api/diff/revisions`。
  - 历史查询复用 core 默认最近 100 条逻辑。
- 已执行测试：
  - 执行 `../tfsIntegration/gradlew build`。
- 测试结果：
  - build 成功。
- 未执行测试及原因：
  - 未执行真实历史和 diff 查询，当前未提供可用 TFS 路径和 changeset。
- 是否满足验收标准：
  - 文件历史可查询：代码已调用 core `queryHistory`。
  - 目录历史可查询：请求 `folder=true` 时调用递归历史查询。
  - changeset 文件列表可查询：代码已调用 core `queryChangesetFiles`。
  - 两个历史版本可对比：代码已调用 core `diffRevisions`。
- 遗留问题：
  - 需要真实 TFS 路径和 changeset 后补充实测。
