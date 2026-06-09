# mactfsui 前端 AI 规则

本文件适用于 `mactfsui` 目录下所有前端、Electron、样式和文档改动。后续 AI 在实现前端任务时必须优先遵守本规则。

## 一、必读上下文

开始任何前端改动前，必须先读取：

- `/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/AGENTS.md`
- `/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/FRONTEND_SPEC.md`
- `/Users/fenghp/Desktop/DEV/project/mydev/docs/mactfs-api-product-prd.md`
- `/Users/fenghp/Desktop/DEV/project/mydev/task/README.md`
- `/Users/fenghp/Desktop/DEV/project/mydev/task/AI-RULES.md`
- 当前任务文件

如果旧任务或旧文档提到 “VS 风格” 或 “Visual Studio Source Control Explorer”，前端视觉实现必须按本文件的 macOS 风格规则解释，不再照搬 Visual Studio 视觉。

## 二、强制 UI 风格

前端默认风格是：

```text
shadcn/ui + macOS Source Workspace
```

具体含义：

- 组件基础使用 shadcn/ui。
- 整体布局参考 macOS Finder、Xcode Source Control、Fork / SourceTree。
- 保留 TFS 工具所需的信息密度。
- 视觉上要像 macOS 原生源码管理工作台，不像 Windows Visual Studio，也不像 Web SaaS 后台。

默认关键词：

- macOS native
- lightweight
- quiet
- source-control focused
- Finder-like table
- Xcode-like inspector
- Fork-like diff

## 三、布局规则

主界面必须采用 macOS 工作台布局：

```text
顶部：macOS 风格工具栏
左侧：Source List，展示 Collection / Server Tree
中间：文件列表、目录对比、历史记录、Diff 主内容
右侧：Inspector，展示 Pending Changes、当前文件操作、签入
底部：可折叠 Console，展示操作日志
```

建议尺寸：

- 顶部工具栏：48-56px
- 左侧 Source List：260-320px
- 右侧 Inspector：320-380px
- 底部 Console：默认 150-220px，可折叠
- 列表行高：28-34px
- 按钮高度：28-32px
- 圆角：6-8px

第一屏必须是连接配置或可操作工作台，不做 landing page、hero、产品介绍页。

## 四、shadcn/ui 使用规则

允许并优先使用：

- `Button`
- `Input`
- `Select`
- `Dialog`
- `Sheet`
- `Tooltip`
- `DropdownMenu`
- `Tabs`
- `Table`
- `Badge`
- `Checkbox`
- `Textarea`
- `Separator`
- `ScrollArea`

规则：

- shadcn 基础组件只能放在 `app/components/ui`。
- 业务组件放到 `app/components/*` 对应业务目录。
- 图标使用 `lucide-react`。
- 文件操作按钮优先使用图标 + tooltip。
- 状态必须用文字或 badge 辅助，不能只靠颜色。
- 路径和版本号可用等宽字体。

## 五、禁止的视觉方向

禁止把 macTFS 做成以下风格：

- Visual Studio / Windows 工具窗口风格
- 满屏 Card 的 SaaS dashboard
- 后台管理系统首页
- 营销 landing page
- 大 Hero
- 大面积渐变背景
- 装饰性 orb / blob
- 过重深蓝、灰黑企业后台色
- 大圆角、过大留白、低信息密度
- 页面区域卡片套卡片

Card 只允许用于重复实体、弹窗内容或确实需要边界的局部工具，不允许把主布局区域都做成 card。

## 六、色彩与主题

默认使用浅色主题，整体背景应接近 macOS 工具软件：

- 主背景：浅灰或 shadcn muted background
- 内容区：白色或轻微分层背景
- 分隔：细边框、浅分割线
- 主色：macOS system blue 方向

状态色只表达业务状态：

- `pendingEdit`：蓝色
- `pendingAdd` / 成功：绿色
- `pendingDelete` / 失败：红色
- `notDownloaded` / 等待：琥珀色
- `remoteChanged`：蓝紫色
- `bothChanged`：红色强调
- `upToDate`：中性灰

不要在组件里硬编码大段颜色，优先使用 Tailwind token 和 `app.css` 变量。

## 七、实现约束

- 继续使用现有 React 19、React Router 7、Electron、Tailwind CSS 4、shadcn/ui 技术栈。
- 不新增 Vue、MicroFront、Redux、Zustand、TanStack Query，除非用户明确要求。
- Electron 本机能力放在 main / preload，React 组件不直接读文件、不启动 Java 进程。
- API 请求必须走统一 API client，不在组件里散落 `fetch`。
- Bearer token 由 Electron 主进程读取后通过 preload 暴露给渲染层。
- 新增函数必须按项目规则添加函数级注释。
- 改任何文件前必须先执行 `chmod u+w <file>` 或 `chmod 644 <file>`。

## 八、验收要求

前端任务完成后至少验证：

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

涉及 UI 的改动还必须实际打开页面或 Electron 看一遍，确认：

- 主区域不空白。
- 文案不重叠。
- 工具栏、Source List、Inspector、Console 区域关系清晰。
- 控件尺寸符合 macOS 工作台风格。
- 没有出现 VS 风格或 SaaS dashboard 风格。

最终输出必须说明是否遵守本规则。