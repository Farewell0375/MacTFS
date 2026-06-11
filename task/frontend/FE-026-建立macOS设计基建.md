# FE-026 建立macOS设计基建

## 状态

done

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

无

## 需求来源

- [docs/mactfs-ui-restyle-requirements.md](/Users/fenghp/Desktop/DEV/project/mydev/docs/mactfs-ui-restyle-requirements.md) U1

## 目标

把全局设计令牌升级为 macOS 现代风格，作为后续所有 UI 改版任务的统一基础。

## 实现范围

- 字体切换为系统字体栈（`-apple-system, BlinkMacSystemFont, "PingFang SC"` 等），移除 Roboto Slab 作为全局字体；代码/Diff 场景保留等宽字体
- 重定义颜色令牌：macOS 蓝主色、中性灰分级、分隔线、半透明材质变量，light/dark 两套完整定义
- 统一圆角档位（约 6/10/14px）、分层阴影（卡片/浮层/弹窗）、间距档位
- 建立动效令牌：统一时长（150/220/320ms）与缓动曲线变量
- 预留 vibrancy 透明背景变量（供 FE-027 使用）

## 不在范围

- 不改任何组件结构与业务逻辑
- 不实现主题切换入口（FE-033 做）
- 不改 Electron 窗口配置（FE-027 做）

## 涉及文件

- `mactfsui/app/app.css`
- `mactfsui/package.json`（如需移除字体依赖或引入 motion）

## 验收标准

- 全局字体为系统字体栈，界面文字观感与 macOS 原生应用一致
- light/dark 两套 token 完整、可用
- 圆角、阴影、动效时长全部来自统一变量，无散落魔法值
- `pnpm typecheck` 通过，现有页面无功能回归

## 测试方式

```bash
cd mactfsui && pnpm typecheck && pnpm electron:dev
```

## 完成记录

- 实际修改文件：
  - `mactfsui/app/app.css`
  - `mactfsui/package.json`、`mactfsui/pnpm-lock.yaml`（移除 `@fontsource-variable/roboto-slab`）
- 实际实现内容：
  - 全局字体切换为系统字体栈（SF Pro / PingFang SC 优先），`html` 改 `font-sans`；新增 `--font-mono` 等宽令牌
  - 主色改为 macOS 系统蓝（light ≈ #007AFF、dark ≈ #0A84FF），`--accent` 与主色解耦改中性悬停色
  - 中性灰分级 light/dark 两套完整定义（dark 深灰非纯黑）
  - 半透明材质变量：`--sidebar` / `--sidebar-accent` 带透明度，配套 `html.vibrancy` 时页面底透明（供 FE-027 毛玻璃透出），vibrancy 未开启时半透明叠在实色上近似实色、可安全回退
  - 圆角基准 0.875rem → 0.625rem（6/8/10/14px 档位）；阴影分层 card/overlay/dialog；动效令牌 150/220/320ms + ease-out-quart / spring
- 测试结果：
  - `pnpm typecheck` 通过、`pnpm build` 通过
  - 视觉走查随 FE-027 ~ FE-034 进行
- 遗留问题：
  - 无
