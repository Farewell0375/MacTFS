# SERVER-005 实现 Collection 与目录 API

## 状态

todo

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

待完成后填写。
