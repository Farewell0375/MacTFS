# SERVER-001 创建本地 API 服务

## 状态

done

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

- 实际修改文件：
  - `mactfs/build.gradle`
  - `mactfs/src/main/java/com/mydev/mactfs/server/MacTfsServer.java`
- 实际实现内容：
  - 新增 `MacTfsServer` 本地 API 服务入口。
  - 引入 SparkJava 2.9.4、Jackson 和 slf4j-simple。
  - 服务固定监听 `127.0.0.1:38765`。
  - 新增 `runServer` Gradle 任务，不改变原 CLI 默认入口。
- 已执行测试：
  - `JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home ../tfsIntegration/gradlew build`
  - `JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home ../tfsIntegration/gradlew runServer`
- 测试结果：
  - build 成功。
  - Spark 启动成功，并输出监听 `127.0.0.1:38765`。
- 未执行测试及原因：
  - 未执行真实 TFS 业务调用，本任务只要求服务骨架。
- 是否满足验收标准：
  - 本地 API 服务可启动：满足。
  - 只监听 `127.0.0.1`：满足。
  - 构建通过：满足。
- 遗留问题：
  - 无。
