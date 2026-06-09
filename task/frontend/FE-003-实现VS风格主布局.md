# FE-003 实现 VS 风格主布局

## 状态

done

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-001

## 需求来源

- PRD 六、6.1 布局

## 目标

实现参考 Visual Studio Source Control Explorer 的主界面布局。

## 实现范围

- 顶部连接与 Workspace 信息区
- 左侧 Collection 服务端目录树区域
- 中间目录文件列表区域
- 右侧挂起更改区域
- 底部操作日志区域
- 基础响应式尺寸处理

## 不在范围

- 不实现具体业务数据
- 不实现完整 diff 展示

## 涉及文件

- [mactfsui/app/routes/home.tsx](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/routes/home.tsx)
- [mactfsui/app/app.css](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app/app.css)

## 验收标准

- UI 不再是默认模板页
- 主界面布局与 PRD 区域一致
- 桌面窗口下可正常使用

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

- 完成日期：2026-06-08
- 实际修改文件：
  - `mactfsui/app/components/app/app-shell.tsx`
  - `mactfsui/app/routes/home.tsx`
  - `mactfsui/app/app.css`
  - `task/README.md`
  - `task/frontend/FE-003-实现VS风格主布局.md`
- 实际实现内容：
  - 新增 `AppShell` 主工作台组件，包含顶部工具栏、左侧 Source List、中间 Source Workspace、右侧 Inspector、底部 Console。
  - 首页改为通过 `AppShell` 承载连接配置页和已连接后的文件列表占位，保留 FE-002 的连接表单逻辑。
  - 右侧 Inspector 预留 Pending Changes 区域，并展示本地 API 服务状态。
  - 底部 Console 展示 service、request、session 三类基础日志状态。
  - 增加桌面与窄屏响应式网格：桌面三栏，较窄宽度下 Inspector 下移。
  - 将全局字体从脚手架 slab serif 调整为 macOS/system sans，符合 `mactfsui/AGENTS.md` 的 macOS Source Workspace 风格要求。
- 已执行测试：
  - `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui && pnpm typecheck`：通过。
  - `git diff --check`：通过。
  - `find /Users/fenghp/Desktop/DEV/project/mydev/task -type f -name "*.md" | wc -l`：通过，结果为 `50`。
  - 内置浏览器打开 `http://127.0.0.1:5173/`：通过，顶部工具栏、Source List、Source Workspace、Inspector、Console 均可见；截图检查未发现空白或重叠。
  - `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui && pnpm electron:dev`：通过，Electron 启动后本地 API health 返回 `success=true`。
- 未执行测试及原因：
  - 未执行真实 Collection、目录树、Pending Changes 数据加载；本任务只实现布局区域，不实现具体业务数据。
- 验收标准确认：
  - UI 不再是默认模板页：满足，首页已替换为 macOS Source Workspace 工作台。
  - 主界面布局与 PRD 区域一致：满足，包含顶部连接/Workspace 信息、左侧目录树区、中间文件区、右侧挂起更改区、底部操作日志区。
  - 桌面窗口下可正常使用：满足，浏览器与 Electron dev 验证通过。
- 遗留问题：
  - 具体 Collection 目录树、文件列表、Pending Changes 数据加载留给后续 FE-004、FE-005、FE-008。
