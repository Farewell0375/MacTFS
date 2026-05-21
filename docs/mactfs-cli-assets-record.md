# mactfs CLI 资产与运行记录

## 一、文档目的

这份文档只记录当前 `mactfs` Java CLI 相关资产，不包含 `desktop-ui` Electron UI。

记录内容包括：

- 当前保留资产
- CLI 源码位置
- 构建产物位置
- 运行依赖位置
- 当前可用的 JDK 路径
- 当前 TFS 服务器与账号配置
- 当前已记录的工作区与映射
- CLI 的运行方法
- CLI 已验证通过的动作

## 二、当前目录资产

项目根目录：

- `/Users/fenghp/Desktop/DEV/project/mydev`

当前目录下与 CLI 相关的核心资产：

- `/Users/fenghp/Desktop/DEV/project/mydev/mactfs`
- `/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration`
- `/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64`

非 CLI 资产：

- `/Users/fenghp/Desktop/DEV/project/mydev/desktop-ui`

## 三、CLI 源码位置

CLI 主入口：

- `/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/MacTfsCli.java`

核心服务：

- `/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/TfsPhaseOneService.java`

参数解析：

- `/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/CliArguments.java`

本地配置读写：

- `/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/LocalConfigStore.java`

结果输出相关：

- `/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/CliActionResult.java`
- `/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/CliJsonWriter.java`
- `/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs/CliLogSink.java`

## 四、CLI 构建产物位置

已存在的构建输出：

- `/Users/fenghp/Desktop/DEV/project/mydev/mactfs/build/classes/java/main`
- `/Users/fenghp/Desktop/DEV/project/mydev/mactfs/build/libs/mactfs-0.1.0.jar`
- `/Users/fenghp/Desktop/DEV/project/mydev/mactfs/build/scripts/mactfs`
- `/Users/fenghp/Desktop/DEV/project/mydev/mactfs/build/distributions/mactfs-0.1.0.zip`
- `/Users/fenghp/Desktop/DEV/project/mydev/mactfs/build/distributions/mactfs-0.1.0.tar`

## 五、运行依赖位置

TFS SDK jar 目录：

- `/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib`

TFS native 目录：

- `/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib/native`

当前可用 JDK：

- `/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home/bin/java`

当前验证通过版本：

- `openjdk version "1.8.0_492"`
- `Zulu 8.94.0.17-CA-macosx`

## 六、当前 TFS 环境参数

当前已验证可用的 TFS 服务地址：

- `http://100.113.212.90:20094/tfs/`

当前认证方式：

- `ntlm-explicit`

当前域账号：

- `bdsoft\\fenghp`

当前密码：

- `Fhp@111111`

当前已验证可见 Collection：

- `PE`
- `PKUSEHR`

## 七、当前本地配置记录

当前 CLI 本地配置文件：

- `~/.mactfs/phase-one.properties`

当前文件内记录到的主要配置：

- `server-uri=http://100.113.212.90:20094/tfs/`
- `collection=PKUSEHR`
- `workspace=mactfs-PKUSEHR-fenghaopengdeMacBook-Pro.local`
- `server-path=$/01HRAP4GQ/03DEV分支/V8_6_0/02数据库脚本`
- `local-path=/Users/fenghp/Desktop/个人/test`
- `domain=bdsoft`
- `username=fenghp`
- `password=Fhp@111111`

## 八、当前已验证的工作区与映射记录

### 1. 已验证成功的第一条真实同步记录

用于第一阶段真实 `Get Latest` 验证的参数：

- Collection：`PKUSEHR`
- Workspace：`mactfs-mydev-01HRAP4GQ`
- Server Path：`$/WJBRS/5SRC4PRM/MicroFront`
- Local Path：`/Users/fenghp/Desktop/DEV/project/mydev`

这条链路已经验证通过：

- 能创建或复用 Workspace
- 能保存映射
- 能执行 `Get Latest`
- 能把代码下载到本地

### 2. 当前本地配置文件里最新记录的映射

当前 `phase-one.properties` 里保存的是另一条最新使用记录：

- Collection：`PKUSEHR`
- Workspace：`mactfs-PKUSEHR-fenghaopengdeMacBook-Pro.local`
- Server Path：`$/01HRAP4GQ/03DEV分支/V8_6_0/02数据库脚本`
- Local Path：`/Users/fenghp/Desktop/个人/test`

## 九、CLI 支持的动作

当前 `MacTfsCli` 支持：

- `test-connection`
- `list-collections`
- `list-workspaces`
- `browse-server-path`
- `ensure-workspace`
- `sync`

输出格式支持：

- `--output text`
- `--output json`

## 十、如何运行 CLI

### 1. 推荐运行方式

当前机器建议固定使用这套 `zulu8` JDK 运行，不使用系统默认 Java。

推荐 Java 路径：

```bash
/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home/bin/java
```

### 2. 查询 Collection 命令

```bash
JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home/bin/java \
-cp "/Users/fenghp/Desktop/DEV/project/mydev/mactfs/build/classes/java/main:$(find /Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib -name '*.jar' | paste -sd ':' -)" \
-Dcom.microsoft.tfs.jni.native.base-directory=/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib/native \
com.mydev.mactfs.MacTfsCli \
--action list-collections \
--output json \
--server-uri http://100.113.212.90:20094/tfs/ \
--auth-type ntlm-explicit \
--domain bdsoft \
--username fenghp \
--password 'Fhp@111111'
```

### 3. 测试连接命令

```bash
JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home/bin/java \
-cp "/Users/fenghp/Desktop/DEV/project/mydev/mactfs/build/classes/java/main:$(find /Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib -name '*.jar' | paste -sd ':' -)" \
-Dcom.microsoft.tfs.jni.native.base-directory=/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib/native \
com.mydev.mactfs.MacTfsCli \
--action test-connection \
--output json \
--server-uri http://100.113.212.90:20094/tfs/ \
--auth-type ntlm-explicit \
--domain bdsoft \
--username fenghp \
--password 'Fhp@111111'
```

### 4. 查询工作区命令

```bash
JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home/bin/java \
-cp "/Users/fenghp/Desktop/DEV/project/mydev/mactfs/build/classes/java/main:$(find /Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib -name '*.jar' | paste -sd ':' -)" \
-Dcom.microsoft.tfs.jni.native.base-directory=/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib/native \
com.mydev.mactfs.MacTfsCli \
--action list-workspaces \
--output json \
--server-uri http://100.113.212.90:20094/tfs/ \
--auth-type ntlm-explicit \
--domain bdsoft \
--username fenghp \
--password 'Fhp@111111' \
--collection PKUSEHR
```

### 5. 浏览服务端目录命令

```bash
JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home/bin/java \
-cp "/Users/fenghp/Desktop/DEV/project/mydev/mactfs/build/classes/java/main:$(find /Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib -name '*.jar' | paste -sd ':' -)" \
-Dcom.microsoft.tfs.jni.native.base-directory=/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib/native \
com.mydev.mactfs.MacTfsCli \
--action browse-server-path \
--output json \
--server-uri http://100.113.212.90:20094/tfs/ \
--auth-type ntlm-explicit \
--domain bdsoft \
--username fenghp \
--password 'Fhp@111111' \
--collection PKUSEHR \
--server-path '$/'
```

### 6. 确保工作区存在命令

```bash
JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home/bin/java \
-cp "/Users/fenghp/Desktop/DEV/project/mydev/mactfs/build/classes/java/main:$(find /Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib -name '*.jar' | paste -sd ':' -)" \
-Dcom.microsoft.tfs.jni.native.base-directory=/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib/native \
com.mydev.mactfs.MacTfsCli \
--action ensure-workspace \
--output json \
--server-uri http://100.113.212.90:20094/tfs/ \
--auth-type ntlm-explicit \
--domain bdsoft \
--username fenghp \
--password 'Fhp@111111' \
--collection PKUSEHR \
--workspace mactfs-PKUSEHR-fenghaopengdeMacBook-Pro.local
```

### 7. 执行同步命令

```bash
JAVA_HOME=/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home \
/Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home/bin/java \
-cp "/Users/fenghp/Desktop/DEV/project/mydev/mactfs/build/classes/java/main:$(find /Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib -name '*.jar' | paste -sd ':' -)" \
-Dcom.microsoft.tfs.jni.native.base-directory=/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib/native \
com.mydev.mactfs.MacTfsCli \
--action sync \
--output json \
--server-uri http://100.113.212.90:20094/tfs/ \
--auth-type ntlm-explicit \
--domain bdsoft \
--username fenghp \
--password 'Fhp@111111' \
--collection PKUSEHR \
--workspace mactfs-PKUSEHR-fenghaopengdeMacBook-Pro.local \
--server-path '$/01HRAP4GQ/03DEV分支/V8_6_0/02数据库脚本' \
--local-path '/Users/fenghp/Desktop/个人/test'
```

## 十一、如何使用 CLI

推荐顺序：

1. 先执行 `test-connection`
2. 再执行 `list-collections`
3. 选定 Collection 后执行 `list-workspaces`
4. 需要时执行 `ensure-workspace`
5. 通过 `browse-server-path` 找到目标服务端路径
6. 最后执行 `sync`

如果只是继续使用最近一次保存的本地配置，可以利用：

- `--reuse-config true`

但当前更推荐每次显式传参，避免混入旧配置。

## 十二、当前已验证状态

### 1. 已验证成功

- 使用 `zulu8 JDK 8` 启动成功
- CLI 能正常加载 TFS SDK native 库
- 能登录 `http://100.113.212.90:20094/tfs/`
- 能查询到 `PE`、`PKUSEHR`
- 能创建或复用工作区
- 能浏览服务端目录
- 能保存映射
- 能执行真实 `Get Latest`

### 2. 2026-05-21 再次验证结果

已使用以下动作再次真实验证成功：

- `list-collections`

成功返回：

- `PE`
- `PKUSEHR`

## 十三、注意事项

### 1. 不要用系统默认 JDK 17 直接跑

当前机器如果直接用系统 Java，容易混入错误 JVM 或 native 环境，导致 JNI 报错。

### 2. 当前配置文件明文保存密码

`~/.mactfs/phase-one.properties` 当前是明文密码：

- `password=Fhp@111111`

如果后续要清理环境，需要同时注意这个文件。

### 3. 当前文档包含真实敏感信息

这份文档内包含：

- 真实 TFS 地址
- 真实域账号
- 真实密码
- 真实本地目录

不建议提交到公共仓库。
