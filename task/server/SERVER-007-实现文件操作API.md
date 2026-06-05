# SERVER-007 实现文件操作 API

## 状态

todo

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

待完成后填写。
