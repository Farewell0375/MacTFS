# mactfs

第一阶段提供独立 Java CLI，用于验证 TFS 核心链路：

- 连接并校验认证
- 查询 Team Project Collection
- 查询 Workspace
- 创建或读取 Workspace
- 保存 Server Path 与 Local Path 映射
- 执行一次真实的 Get Latest

## 构建

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew clean build
```

## 运行

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew run --args="\
  --server-uri http://tfs.example.com:8080/tfs \
  --auth-type ntlm-explicit \
  --username user \
  --password secret \
  --collection DefaultCollection \
  --workspace my-workspace \
  --server-path $/TeamProject/Main \
  --local-path /tmp/mactfs/Main"
```

可选参数：

- `--domain xxx`
- `--comment xxx`
- `--list-only true`
- `--reuse-config true`

## 动作式接口

为桌面端集成，CLI 已补充动作式调用方式：

- `--action test-connection`
- `--action list-collections`
- `--action list-workspaces`
- `--action sync`
- `--output text|json`

### 测试连接

```bash
arch -x86_64 /Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home/bin/java \
-cp /Users/fenghp/Desktop/DEV/project/mydev/mactfs/build/classes/java/main:$(find /Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib -maxdepth 1 -name '*.jar' | tr '\n' ':') \
-Dcom.microsoft.tfs.jni.native.base-directory=/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib/native \
com.mydev.mactfs.MacTfsCli \
--action test-connection \
--output json \
--server-uri http://100.113.212.90:20094/tfs/ \
--auth-type ntlm-explicit \
--username fenghp \
--domain bdsoft \
--password '***'
```

### 查询 Collection

```bash
arch -x86_64 /Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home/bin/java \
-cp /Users/fenghp/Desktop/DEV/project/mydev/mactfs/build/classes/java/main:$(find /Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib -maxdepth 1 -name '*.jar' | tr '\n' ':') \
-Dcom.microsoft.tfs.jni.native.base-directory=/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib/native \
com.mydev.mactfs.MacTfsCli \
--action list-collections \
--output json \
--server-uri http://100.113.212.90:20094/tfs/ \
--auth-type ntlm-explicit \
--username fenghp \
--domain bdsoft \
--password '***'
```

### 查询 Workspace

```bash
arch -x86_64 /Users/fenghp/Desktop/DEV/project/mydev/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home/bin/java \
-cp /Users/fenghp/Desktop/DEV/project/mydev/mactfs/build/classes/java/main:$(find /Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib -maxdepth 1 -name '*.jar' | tr '\n' ':') \
-Dcom.microsoft.tfs.jni.native.base-directory=/Users/fenghp/Desktop/DEV/project/mydev/tfsIntegration/lib/native \
com.mydev.mactfs.MacTfsCli \
--action list-workspaces \
--output json \
--server-uri http://100.113.212.90:20094/tfs/ \
--auth-type ntlm-explicit \
--username fenghp \
--domain bdsoft \
--password '***' \
--collection PKUSEHR
```
