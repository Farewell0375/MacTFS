# SERVER-008 实现目录对比 API

## 状态

todo

## 优先级

P0

## 所属阶段

server

## 依赖任务

- SERVER-007
- CORE-009

## 需求来源

- PRD 五、5.5 目录对比

## 目标

实现 `POST /api/compare/folder`。

## 实现范围

- 接收 serverPath、localPath、recursive
- 校验路径已映射
- 调用 core 目录对比
- 默认隐藏 upToDate
- 返回差异文件列表

## 不在范围

- 不做目录级完整内容 diff
- 不做自动修复
- 不做实时刷新

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 已映射目录可对比
- 未映射目录返回明确错误
- 返回状态可供 UI 操作映射

## 测试方式

```bash
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" http://127.0.0.1:38765/api/compare/folder
```

## 完成记录

待完成后填写。
