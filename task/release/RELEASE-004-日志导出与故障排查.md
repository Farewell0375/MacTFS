# RELEASE-004 日志导出与故障排查

## 状态

todo

## 优先级

P1

## 所属阶段

release

## 依赖任务

- SERVER-010
- FE-013

## 需求来源

- PRD 四、4.6 操作日志
- PRD 九、风险与约束

## 目标

补充日志导出和故障排查能力，方便定位 TFS 网络、权限、SDK 和本地路径问题。

## 实现范围

- 导出操作日志
- 记录 API 错误摘要
- 记录 TFS 错误信息
- 文档列出常见问题

## 不在范围

- 不做远程日志上传
- 不做实时日志流

## 涉及文件

- [mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs)
- [mactfsui](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui)
- [docs](/Users/fenghp/Desktop/DEV/project/mydev/docs)

## 验收标准

- 用户能导出最近操作日志
- 常见启动和 TFS 错误有排查说明
- 不泄露 token 默认值到日志

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
