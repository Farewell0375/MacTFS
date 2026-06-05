# RELEASE-003 编写 README 与调试说明

## 状态

todo

## 优先级

P0

## 所属阶段

release

## 依赖任务

- RELEASE-002

## 需求来源

- PRD 三、阶段五：Release

## 目标

编写用户和开发调试说明，确保后续可以按文档启动和排查。

## 实现范围

- 启动服务说明
- 启动 UI 说明
- token 使用说明
- config.json 说明
- curl 调试示例
- 常见错误说明

## 不在范围

- 不写公网部署文档
- 不写多人使用文档

## 涉及文件

- [docs](/Users/fenghp/Desktop/DEV/project/mydev/docs)
- [README.md](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/README.md)

## 验收标准

- 新人能按文档启动服务和 UI
- 能按文档使用 token curl 调试
- 明确说明明文密码风险

## 测试方式

```bash
sed -n '1,200p' /Users/fenghp/Desktop/DEV/project/mydev/docs/mactfs-api-product-prd.md
```

## 完成记录

待完成后填写。
