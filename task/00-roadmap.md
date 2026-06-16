# macTFS 开发路线图

## 阶段 1：Core

目标：把当前 CLI MVP 中的 TFS 能力抽离成可复用核心层。

输出：

- `mactfs-core` 或等价核心包
- 连接、Workspace、Mapping、文件操作、目录对比、历史、Diff 能力
- 不依赖 Electron UI
- 尽量减少对旧 IntelliJ 插件 UI 类的依赖

## 阶段 2：Server API

目标：实现本地常驻 Java API 服务。

输出：

- Java 8 + SparkJava 2.9.4 服务
- 监听 `127.0.0.1:38765`
- Bearer token auth
- 配置读写
- REST API
- 同步操作与超时
- 操作日志

## 阶段 3：CLI

目标：把 CLI 从直接执行 SDK 动作调整为调试和 API 客户端入口。

输出：

- `mactfs token --show`
- 常用 API 调试命令
- 保留必要的本地验证能力

## 阶段 4：Frontend Workspace UI

目标：实现以固定 Collection / Workspace 上下文为核心的桌面工作台。

输出：

- Electron 启动本地服务、preload、API client
- 登录配置、Collection 选择、默认 Workspace 上下文
- 三栏工作台、底部操作台、左右与底部收起能力
- 左侧服务端目录树与中间目录文件列表同步导航
- 对象右键菜单与统一动作模型
- Mapping、History、目录对比、文件查看、Diff、冲突处理弹窗
- Pending Changes、Checkin、操作反馈和日志展示

## 阶段 5：Frontend Refactor

目标：根据前端重构与 UI 功能调整方案，补齐后端接口能力并重构桌面工作台交互。

输出：

- 登录页固定 Collection，上次 Collection 默认选中
- Workspace 自动使用或创建
- 左右栏和底部日志收起
- 左侧树与中间文件列表同步导航
- 对象右键菜单
- Mapping、History、目录对比弹窗
- 文件查看与 Diff 编辑器
- Get Latest / Checkout 冲突选择弹窗
- Pending Changes 右键菜单与 Checkin 体验重构

## 阶段 6：Feature E2E

目标：按真实业务链路做端到端验收。

输出：

- 连接与目录浏览验收
- Mapping 与 Get Latest 验收
- 目录对比与差异处理验收
- Pending Changes 与 Checkin 验收
- History 与 Diff 验收

## 阶段 7：Release

目标：完成个人可用的 macOS 桌面应用交付。

输出：

- 运行环境配置
- Electron 打包
- README
- 故障排查和日志导出
