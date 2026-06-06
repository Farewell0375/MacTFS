# SERVER-005 实现 Collection 与目录 API

## 状态

done

## 优先级

P0

## 所属阶段

server

## 依赖任务

- SERVER-004
- CORE-003

## 需求来源

- PRD 五、5.2 Collection 与目录

## 目标

实现 Collection 查询和服务端目录浏览 API。

## 实现范围

- `GET /api/collections`
- `GET /api/server-tree`
- `GET /api/server-folder/items`
- 返回路径、名称、类型、是否文件夹

## 不在范围

- 不做本地对比
- 不做 Mapping 创建
- 不做历史查询

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 可查询 Collection
- 可浏览未映射服务端目录
- 返回结构可供左侧树和中间列表使用

## 测试方式

```bash
curl -H "Authorization: Bearer <token>" "http://127.0.0.1:38765/api/collections"
```

## 完成记录

- 实际修改文件：
  - `mactfs/src/main/java/com/mydev/mactfs/server/MacTfsServer.java`
- 实际实现内容：
  - 新增 `GET /api/collections`。
  - 新增 `GET /api/server-tree`。
  - 新增 `GET /api/server-folder/items`。
  - 目录项返回 name、path、serverPath、type、folder、latestVersion、checkinDate。
- 已执行测试：
  - 执行 `../tfsIntegration/gradlew build`。
- 测试结果：
  - build 成功。
- 未执行测试及原因：
  - 未执行真实 Collection 和服务端目录浏览，当前任务输入未提供 TFS 连接配置。
- 是否满足验收标准：
  - 可查询 Collection：代码已调用 core `listCollections`。
  - 可浏览未映射服务端目录：代码已调用 core `browseServerPath`，不依赖 mapping。
  - 返回结构可供左侧树和中间列表使用：满足。
- 遗留问题：
  - 需要真实 TFS 配置后补充目录浏览结果验收。
