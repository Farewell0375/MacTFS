# mactfsui

macTFS 的 Electron + React 桌面前端。完整的项目介绍、截图、环境要求与使用说明请见仓库根目录的 [README](../README.md)。

## 常用命令

```bash
pnpm install            # 安装依赖
pnpm electron:dev       # 开发模式（vite + Electron，自动拉起后端）
pnpm prepare:runtime    # 准备 x64 JDK（本地缺失时自动从 Azul 下载）
pnpm dist               # 打包 macOS 桌面应用到 dist-app/
```

启动 / 停止 / 重启 / 排错见根目录的 [`服务启停指南.md`](../服务启停指南.md)。
