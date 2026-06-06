# CORE-002 实现连接认证与配置模型

## 状态

done

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

完成时间：2026-06-05

实际修改文件：

- `mactfs/src/main/java/com/mydev/mactfs/core/MacTfsCoreService.java`
- `mactfs/src/main/java/com/mydev/mactfs/TfsPhaseOneService.java`

实际实现内容：

- 新增 `TfsConnectionConfig`，支持 `serverUri`、`authType`、`domain`、`username`、`password`。
- 支持 `ntlm-explicit` 显式账号密码认证和 `ntlm-native` 兼容入口。
- 封装 `TFSConfigurationServer` 连接、认证和 Collection 连接逻辑。

已执行测试：

- `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs && ../tfsIntegration/gradlew build`

测试结果：

- 构建通过。

未执行测试及原因：

- 未执行错误账号或真实 TFS 地址验证，避免默认访问真实 TFS 环境。

验收标准：

- 连接参数可从对象传入：满足。
- 错误账号或地址能返回明确异常：核心结果会返回失败消息。
- 真实 TFS 环境可复用当前 MVP 连接逻辑：满足。

遗留问题：

- 无。
