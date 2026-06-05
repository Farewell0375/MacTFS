# SERVER-006 实现 Workspace 与 Mapping API

## 状态

todo

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

待完成后填写。
