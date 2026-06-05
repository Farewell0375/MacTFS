# CLI-002 实现 Token 与调试命令

## 状态

todo

## 优先级

P1

## 所属阶段

cli

## 依赖任务

- CLI-001
- SERVER-002

## 需求来源

- PRD 四、4.2 本地 Token Auth

## 目标

实现 `mactfs token --show` 和常用 curl 调试辅助命令。

## 实现范围

- 读取 `~/.mactfs/server-token`
- 输出 token
- 提供 health 调试命令
- 文档中给出 curl 示例

## 不在范围

- 不自动暴露 token 到日志
- 不实现复杂认证

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs/MacTfsCli.java](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/MacTfsCli.java)

## 验收标准

- 可通过 CLI 查看 token
- curl 调试命令可复用 token
- token 文件不存在时提示清晰

## 测试方式

```bash
mactfs token --show
```

## 完成记录

待完成后填写。
