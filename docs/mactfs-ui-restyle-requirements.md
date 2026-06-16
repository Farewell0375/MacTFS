# macTFS UI 风格改版需求（macOS 现代化 / 精致化 / 动效）

## 一、背景

macTFS 功能层面已完成 FE-001 ~ FE-025，三栏工作台、弹窗体系、挂起更改与签入链路均可用。但当前 UI 是「功能优先」的默认 shadcn 风格：

- 全局使用 Roboto Slab 衬线字体，与 macOS 原生观感不符
- 登录页只有一张简单表单卡片，元素少、缺少品牌感
- 窗口使用系统默认标题栏，没有 macOS 原生质感（毛玻璃、隐藏式标题栏）
- 几乎没有过渡动效：弹窗、面板折叠、列表加载都是瞬时切换
- 明暗主题虽有 token 定义，但没有切换入口、也不跟随系统

本批需求目标：在**不改任何业务逻辑与接口**的前提下，把整体 UI 升级为「精致、现代、macOS 原生感、富动效」的风格。

> 说明：本分支（`feature/ui-macos-restyle`）做 macOS 原生风方案；姊妹分支 `feature/ui-modern-restyle` 做 Codex/CC Switch 现代工具风方案，两套并行对比。

## 二、用户诉求原文与解读

> 「我希望的 ui 风格是更精致，有 macos 风格，动效更多，登录页元素多点，反正就是希望比较现代一些。」

解读为四个方向：

| 诉求 | 落地方向 |
|---|---|
| 更精致 | 统一设计令牌（颜色/圆角/阴影/间距/图标），细化悬停、选中、禁用等状态 |
| macOS 风格 | 系统字体栈、隐藏式标题栏 + 毛玻璃、Finder 式侧栏、Sheet 式弹窗、跟随系统明暗 |
| 动效更多 | 建立统一动效规范：弹窗出入场、面板折叠、列表级联、骨架屏、微交互 |
| 登录页元素多点 | 品牌区 + 分步表单 + 背景氛围 + 最近连接 + 连接过程动效 |

## 三、现状盘点

| 现状 | 文件 | 问题 |
|---|---|---|
| 主题 token | `mactfsui/app/app.css` | 衬线字体、紫色主色、无 macOS 质感变量，dark 主题无入口 |
| Electron 窗口 | `mactfsui/electron/main.cjs` | 默认标题栏，无 vibrancy / hiddenInset |
| 登录页 | `app/components/app/connect-view.tsx` | 单卡片表单，无品牌区、无动效、无最近连接 |
| 工作台 | `app/components/app/workspace-shell.tsx`、`top-bar.tsx` | 布局可用但视觉平淡，折叠无动画 |
| 目录树 / 文件列表 | `app/components/explorer/source-tree-panel.tsx`、`folder-items-panel.tsx` | 行样式简单，加载无骨架屏，空状态简陋 |
| 弹窗（13 个） | `app/components/explorer/*-dialog.tsx`、`app/components/app/*` | 风格不一，出入场无动效 |
| 反馈 | `changes-panel.tsx`、`console-panel.tsx` | 无 toast，操作反馈靠日志面板 |

技术栈现状：React 19 + React Router 7 + Tailwind CSS 4 + radix-ui/shadcn + tw-animate-css + lucide-react + Electron 42。动效优先用 CSS / tw-animate-css，复杂编排可引入 `motion`（原 framer-motion）。

## 四、需求定义

### U1 macOS 设计基建（FE-026，P0）

- 字体切换为系统字体栈（`-apple-system, BlinkMacSystemFont, "SF Pro", "PingFang SC"…`），仅代码/Diff 保留等宽字体
- 重定义颜色令牌：macOS 蓝为主色（accentColor 风格），中性灰分级、分隔线、半透明材质变量
- 统一圆角（macOS 常用 6/10/14px 档位）、阴影（弹窗/浮层分层阴影）、间距档位
- 建立动效令牌：统一时长（150/220/320ms）、缓动曲线（ease-out-quart、spring 近似）
- 完整 light/dark 两套 token，预留 vibrancy 透明背景变量

### U2 Electron 窗口 macOS 化（FE-027，P0）

- `titleBarStyle: "hiddenInset"`，红绿灯融入顶栏，顶栏设置可拖拽区域
- 开启窗口 vibrancy（`under-window` 或 `sidebar` 材质），侧栏呈毛玻璃
- 窗口最小尺寸、默认尺寸与圆角阴影核对
- 兼容退化：非 macOS 或 vibrancy 不可用时回退为纯色背景

### U3 登录页改版（FE-028，P0）

- 左右分栏：左侧品牌区（logo、产品名、标语、版本号、氛围背景动效），右侧连接表单
- 表单分步过渡动效：连接表单 → Collection 选择，左右滑动 + 淡入淡出
- 新增元素：密码可见性切换、记住最近服务器（本地存储多条，可一键填充）、连接状态指示灯、服务健康状态展示
- 连接中动效：按钮内 spinner + 步骤文案渐变；失败时表单抖动 + 错误条
- Collection 选择改为卡片式列表，悬停浮起、选中高亮动画

### U4 工作台外壳与顶栏改版（FE-029，P0）

- 顶栏融合红绿灯区域，按 macOS 工具栏风格重排（上下文信息居左、动作按钮居右、图标化）
- 左侧目录树面板改 Finder 式侧栏：毛玻璃背景、分组标题、圆角选中条
- 三栏折叠/展开增加宽度过渡动画，底部操作台滑入滑出
- 面板间分隔线与留白统一

### U5 目录树与文件列表精致化（FE-030，P0）

- 树节点与文件行：统一行高、圆角悬停/选中态、展开箭头旋转动画、子级展开渐入
- 文件图标体系：按扩展名区分图标与颜色，文件夹/分支/映射目录差异化
- 加载骨架屏替代文字 loading；空状态配插图式占位（图标 + 引导文案）
- 状态徽标（pendingEdit/Add/Delete、未下载等）配色与形状统一

### U6 弹窗体系统一（FE-031，P1）

- 13 个弹窗统一为 macOS Sheet 风格：顶部标题区、内容区、底部按钮区结构一致
- 出入场动效统一：缩放 + 淡入（spring 曲线），遮罩淡入
- 弹窗内表格、表单控件按新 token 对齐；大弹窗（History/Compare/Diff）支持更合理的留白与分区

### U7 操作反馈与微交互（FE-032，P1）

- 引入轻量 toast（成功/失败/进行中），与日志面板互补
- 挂起更改面板、日志面板按新风格改版；新日志条目滑入动画
- 按钮、复选框、输入框等控件微交互：按压缩放、聚焦光环、hover 过渡
- 长操作（GetLatest、Checkin、目录对比）显示进度反馈动效

### U8 明暗主题跟随系统（FE-033，P1）

- 跟随 macOS 系统外观自动切换 light/dark，顶栏提供手动三态开关（跟随/亮/暗）
- 切换瞬间全局颜色过渡动画
- 校验全部面板与弹窗在 dark 下的对比度与可读性

### U9 改版回归验收（FE-034，P0）

- 改版完成后按 `TFS-AI测试流程.md` 大纲做 UI 链路回归：登录、浏览、Mapping、GetLatest、签出签入、历史、Diff、目录对比
- 确认零业务逻辑变化：`app/lib` 与接口契约不动
- typecheck 通过、关键页面截图存档

## 五、优先级与排期建议

| 顺序 | 任务 | 优先级 | 依赖 |
|---|---|---|---|
| 1 | FE-026 设计基建 | P0 | 无 |
| 2 | FE-027 窗口 macOS 化 | P0 | FE-026 |
| 3 | FE-028 登录页改版 | P0 | FE-026 |
| 4 | FE-029 工作台外壳改版 | P0 | FE-026、FE-027 |
| 5 | FE-030 目录树与文件列表 | P0 | FE-029 |
| 6 | FE-031 弹窗体系统一 | P1 | FE-026 |
| 7 | FE-032 反馈与微交互 | P1 | FE-026 |
| 8 | FE-033 明暗主题 | P1 | FE-026 ~ FE-032 |
| 9 | FE-034 回归验收 | P0 | 全部 |

## 六、不在本批范围

- 任何业务逻辑、接口契约、服务端代码改动
- 新功能（本批只做视觉与交互层）
- Windows / Linux 适配（仅保证不崩溃的回退样式）
- Monaco Diff 内部主题深度定制（仅跟随明暗主题切换）
