# CORE-002 实现连接认证与配置模型

## 状态

todo

## 优先级

P0

## 所属阶段

core

## 依赖任务

- CORE-001

## 需求来源

- PRD 四、服务端设计
- PRD 五、API 设计

## 目标

实现核心层的连接参数模型、默认配置模型和 TFS 认证能力。

## 实现范围

- 定义连接配置对象
- 支持 `serverUri`、`authType`、`domain`、`username`、`password`
- 支持 `ntlm-explicit`
- 保留 `ntlm-native` 兼容入口
- 封装 `TFSConfigurationServer` 连接逻辑

## 不在范围

- 不做 Keychain
- 不做多 Profile
- 不做复杂账号体系

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 连接参数可从对象传入，不依赖 CLI 参数 Map
- 错误账号或地址能返回明确异常
- 真实 TFS 环境可复用当前 MVP 连接逻辑

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
```

## 完成记录

待完成后填写。
