# SERVER-001 创建本地 API 服务

## 状态

todo

## 优先级

P0

## 所属阶段

server

## 依赖任务

- CORE-001

## 需求来源

- PRD 三、阶段二：Server API
- PRD 四、4.1 本地服务

## 目标

创建 Java 8 + SparkJava 2.9.4 本地常驻 API 服务骨架。

## 实现范围

- 新增 server 入口
- 引入 SparkJava 和 Jackson
- 监听 `127.0.0.1:38765`
- 提供基础路由注册结构
- 保持 mactfs 构建可用

## 不在范围

- 不实现业务 API
- 不实现 token auth
- 不启动 Electron

## 涉及文件

- [mactfs/build.gradle](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/build.gradle)
- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 本地 API 服务可启动
- 只监听 `127.0.0.1`
- 构建通过

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
```

## 完成记录

待完成后填写。
