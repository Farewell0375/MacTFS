# RELEASE-001 运行环境与 JDK 配置

## 状态

todo

## 优先级

P0

## 所属阶段

release

## 依赖任务

- SERVER-001

## 需求来源

- PRD 九、9.1 TFS SDK 与 JDK

## 目标

固化 x86_64 JDK 8、Rosetta 和 TFS native lib 的运行方式。

## 实现范围

- 检测本地 JDK 路径
- 配置 native base directory
- 提供启动脚本或启动参数
- 文档说明 Apple Silicon 运行约束

## 不在范围

- 不解决 TFS SDK native arm64 兼容
- 不替换 TFS SDK

## 涉及文件

- [mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs)
- [docs](/Users/fenghp/Desktop/DEV/project/mydev/docs)

## 验收标准

- 服务可使用当前 zulu8 x86_64 JDK 启动
- native lib 路径正确
- 运行方式有文档说明

## 测试方式

```bash
/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home/bin/java -version
```

## 完成记录

待完成后填写。
