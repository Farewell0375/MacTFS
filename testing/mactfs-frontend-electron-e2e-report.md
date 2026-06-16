# macTFS 前端 Electron 真实 TFS 联调测试报告

- 日期：2026-06-10
- 依据：[TFS-AI测试流程.md](/Users/fenghp/Desktop/DEV/project/mydev/TFS-AI测试流程.md)
- 入口：真实 Electron 应用（playwright-core `_electron` 驱动，`mactfsui/scripts/e2e-electron.mjs`）
- TFS：`http://100.113.212.90:20094/tfs/`，Collection `PKUSEHR`
- 写操作范围：严格限定 `$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs`

## 一、问题修复记录

### 现象

进入工作台时报错：

```text
java.lang.NoSuchMethodError: com.mydev.mactfs.server.MacTfsServer.access$400(...)Ljava/util/Map;
```

### 根因

不是 JDK 版本问题。本机有一个自周二启动、一直常驻的 `MacTfsServer` 旧进程，
classpath 指向 `mactfs/build/classes/java/main`。前端阶段（FE-002）服务端源码新增接口后重新编译，
磁盘上的内部类 `MacTfsServer$NN.class` 已是新版本，但旧进程内存中加载的外部类还是旧版本；
Spark 路由懒加载新内部类时引用了旧外部类不存在的合成方法 `access$400`，于是报 NoSuchMethodError。

该进程使用的 java 本身就是项目内置 zulu8（`/api/health` 的 javaHome 可证）。

### 修复

1. 终止陈旧服务进程
2. 新增 `mactfs/gradle.properties`：`org.gradle.java.home` 固定指向项目内置 zulu8，构建与运行不再受系统 JAVA_HOME / PATH 影响（落实「用本地文件夹内的 JDK」）
3. 重新执行 `../tfsIntegration/gradlew --no-daemon build installDist`，刷新 `build/install/mactfs` 发布产物（已验证包含 `workspace/context` 等新接口）
4. Electron `main.cjs` 原本即优先使用内置 zulu8 拉起 install dist，本次未改动；应用退出时会回收自己拉起的服务进程，避免再次出现「旧进程 + 新类文件」错配

## 二、Electron 真实链路测试结果（14/14 通过）

| # | 测试项（对应测试大纲分组） | 结果 | 关键证据 |
|---|---|---|---|
| 1 | 服务自动拉起 + 连接页（4.1） | ✅ | 配置回填 serverUri |
| 2 | 连接真实 TFS + Collection（4.1/4.2） | ✅ | 返回 `PE`、`PKUSEHR` |
| 3 | 固定上下文进入工作台（4.3） | ✅ | 顶栏展示 PKUSEHR / 默认 Workspace |
| 4 | 目录树懒加载逐级导航（4.2） | ✅ | 树与中间列表同步到指定测试目录 |
| 5 | 目录历史弹窗（4.8） | ✅ | changeset 678201 等真实记录 |
| 6 | 文件查看服务器 latest（4.9） | ✅ | 未映射文件读取服务器内容 |
| 7 | Mapping 预校验 + 创建 + 立即 Get Latest（4.4/4.5） | ✅ | 最终路径由后端生成；3 个文件下载到本地，状态变「已映射」 |
| 8 | 目录对比（4.9.3） | ✅ | 「本地与服务端一致，没有差异」 |
| 9a | checkout 产生 pendingEdit（4.6/4.7） | ✅ | 右侧 Included 1 项「签出编辑」 |
| 9b | 本地 vs latest Diff（4.9.1） | ✅ | 弹窗正常生成对比 |
| 9c | undo 撤销挂起更改（4.6） | ✅ | 撤销后「当前没有挂起更改」 |
| 10 | 取消映射、不跳转浏览位置（4.4） | ✅ | 状态变「未映射」，路径不变 |
| 11 | 操作日志面板（FE-012） | ✅ | 47 条真实操作日志（connect/getLatest/checkout/undo/deleteMapping…） |

补充验证（第一轮运行顺带验证）：

- TFS 嵌套映射冲突时，Mapping 弹窗内展示后端可读错误并阻止创建
  （`already mapped in workspace mactfs-ai-subapp-pm-mactfs`），符合错误处理设计

## 三、测试边界遵守情况

- 写操作（mapping / get latest / checkout / undo / unmap）全部发生在指定测试目录
- 未执行 checkin，避免向服务端写入测试 changeset（checkin 链路留待 FEATURE-004，UI 层逻辑已在 mock 联调中验证）
- 本地映射目录使用 `/Users/fenghp/Desktop/DEV/mactfs-ui-e2e`（项目根目录之外）：
  测试大纲推荐的 `/Users/fenghp/Desktop/DEV/mactfs-ai-workspace` 已被旧测试
  Workspace `mactfs-ai-subapp-pm-mactfs` 整目录占用，TFS 禁止嵌套映射
- 测试结束已清理：取消映射、删除本地测试目录、关闭应用（随之回收服务进程）

## 四、遗留事项

- checkin 真实链路验证 → FEATURE-004
- 冲突弹窗的真实冲突场景（需要双端制造冲突）→ FEATURE-002 / FEATURE-003
- `scripts/e2e-electron.mjs` 可作为 FEATURE 阶段端到端验收的驱动基础
