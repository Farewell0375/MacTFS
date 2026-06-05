# RELEASE-002 打包 Electron 桌面应用

## 状态

todo

## 优先级

P0

## 所属阶段

release

## 依赖任务

- FEATURE-005
- RELEASE-001

## 需求来源

- PRD 三、阶段五：Release

## 目标

打包个人可用的 macOS Electron 桌面应用。

## 实现范围

- 构建 mactfsui
- 打包 Electron
- 关联本地 Java 服务启动方式
- 验证应用启动和 API 连接

## 不在范围

- 不做自动更新
- 不做签名公证
- 不做多人分发

## 涉及文件

- [mactfsui](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui)
- [mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs)

## 验收标准

- 桌面应用可启动
- 可拉起或连接本地 API
- 主流程可运行

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm build
pnpm electron
```

## 完成记录

待完成后填写。
