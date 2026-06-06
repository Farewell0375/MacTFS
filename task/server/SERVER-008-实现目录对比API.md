# SERVER-008 实现目录对比 API

## 状态

done

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

- 实际修改文件：
  - `mactfs/src/main/java/com/mydev/mactfs/server/MacTfsServer.java`
- 实际实现内容：
  - 新增 `POST /api/compare/folder`。
  - 接收 serverPath、localPath、recursive。
  - 调用 core `compareFolder`。
  - core 已默认过滤 `upToDate`，只返回差异项。
- 已执行测试：
  - 执行 `../tfsIntegration/gradlew build`。
- 测试结果：
  - build 成功。
- 未执行测试及原因：
  - 未执行真实目录对比，当前未提供可用 TFS mapping 和本地目录。
- 是否满足验收标准：
  - 已映射目录可对比：代码已调用 core。
  - 未映射目录返回明确错误：core 会返回 `Server path is not mapped`。
  - 返回状态可供 UI 操作映射：core 返回 PRD 约定状态字段。
- 遗留问题：
  - 需要真实映射目录后补充对比结果验收。
