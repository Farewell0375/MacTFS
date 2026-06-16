# FE-027 Electron窗口macOS化

## 状态

done

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-026

## 需求来源

- [docs/mactfs-ui-restyle-requirements.md](/Users/fenghp/Desktop/DEV/project/mydev/docs/mactfs-ui-restyle-requirements.md) U2

## 目标

让应用窗口具备 macOS 原生质感：隐藏式标题栏、红绿灯融入顶栏、毛玻璃材质。

## 实现范围

- BrowserWindow 配置 `titleBarStyle: "hiddenInset"`，校准 trafficLightPosition
- 顶栏对应区域设置 `-webkit-app-region: drag`，交互控件设置 no-drag
- 开启窗口 vibrancy（`sidebar` 或 `under-window` 材质），配合 FE-026 的透明背景变量让侧栏呈毛玻璃
- 核对窗口默认尺寸与最小尺寸
- 非 macOS 或 vibrancy 不可用时回退纯色背景，不影响功能

## 不在范围

- 顶栏内容与布局重排（FE-029 做）
- 打包签名相关配置（RELEASE 阶段做）

## 涉及文件

- `mactfsui/electron/main.cjs`
- `mactfsui/app/components/app/top-bar.tsx`（仅拖拽区域标记）
- `mactfsui/app/app.css`（透明背景接线）

## 验收标准

- 窗口无系统标题栏，红绿灯悬浮于顶栏内且不遮挡控件
- 顶栏空白区可拖动窗口，按钮等控件可正常点击
- 侧栏可见毛玻璃效果；关闭 vibrancy 时回退正常
- 全部既有功能无回归

## 测试方式

```bash
cd mactfsui && pnpm electron:dev
```

## 完成记录

- 实际修改文件：
  - `mactfsui/electron/main.cjs`
  - `mactfsui/app/components/app/top-bar.tsx`（拖拽区域 + 红绿灯留白）
  - `mactfsui/app/app.css`（app-drag / app-no-drag 工具类）
  - `mactfsui/app/root.tsx`（首屏前挂载 html.vibrancy 标记）
  - 新增 `mactfsui/app/lib/platform.ts`
- 实际实现内容：
  - macOS 下 `titleBarStyle: "hiddenInset"` + `trafficLightPosition {16,16}`，非 macOS 回退系统标题栏
  - 开启窗口 vibrancy（`sidebar` 材质，followWindow）；macOS 背景设全透明配合 `html.vibrancy body { background: transparent }` 让毛玻璃可透出；非 macOS 用实色背景
  - `show:false + ready-to-show` 显示并默认最大化铺满屏幕（带上现代风分支已确认的体验决策）
  - `minWidth 980 / minHeight 640`
  - 顶栏 `app-drag` 拖拽 + 控件 `app-no-drag`，macOS Electron 下 `pl-20` 为红绿灯留白
- 测试结果：
  - `pnpm typecheck` 通过、`pnpm build` 通过，产物确认 app-drag / vibrancy 已编译
  - 毛玻璃透出效果在 FE-029 侧栏完成后整体截图验证
- 遗留问题：
  - 登录页（无顶栏）拖拽区在 FE-028 补充
