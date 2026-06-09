# FE-004 实现 Collection 服务端目录树

## 状态

done

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-003
- SERVER-005

## 需求来源

- PRD 六、6.2 左侧目录树

## 目标

实现左侧 Collection 下 TFS 服务端目录树。

## 实现范围

- 加载 Collection
- 展示服务端根目录
- 展开目录时调用 API 加载子节点
- 未映射目录也允许浏览
- 选中节点后通知中间列表加载

## 不在范围

- 不做本地状态对比
- 不做拖拽 Mapping
- 不做复杂搜索

## 涉及文件

- [mactfsui/app](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app)

## 验收标准

- 可浏览 Collection 下目录树
- 展开节点不要求本地已映射
- 选中目录能更新当前路径

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

- 完成日期：2026-06-08
- 实际修改文件：
  - `mactfsui/app/lib/api/types.ts`
  - `mactfsui/app/lib/api/endpoints.ts`
  - `mactfsui/app/components/app/app-shell.tsx`
  - `mactfsui/app/components/explorer/server-tree-panel.tsx`
  - `mactfsui/app/routes/home.tsx`
  - `task/README.md`
  - `task/frontend/FE-004-实现Collection服务端目录树.md`
- 实际实现内容：
  - 新增 Collection、服务端目录节点相关前端类型。
  - 新增 `listCollections`、`listServerTree` API endpoint 封装，继续复用统一 Bearer token client。
  - `AppShell` 左侧 Source List 支持传入业务树组件。
  - 新增 `ServerTreePanel`，连接成功后加载 Collection，默认加载第一个 Collection 的 `$/` 根目录。
  - 展开目录时按服务端路径调用 `/api/server-tree` 懒加载子节点，不要求目录已映射到本地。
  - 选中 Collection 或目录节点后通过回调更新首页当前 Collection 和当前服务端路径，中间区域展示当前路径。
- 已执行测试：
  - `cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui && pnpm typecheck`：通过。
  - `git diff --check`：通过。
  - `find /Users/fenghp/Desktop/DEV/project/mydev/task -type f -name "*.md" | wc -l`：通过，结果为 `50`。
  - 内置浏览器打开 `http://127.0.0.1:5173/`：通过，未连接状态下 Source List、主内容、Inspector、Console 均稳定显示。
- 未执行测试及原因：
  - 未执行真实 TFS Collection 与目录树成功浏览；当前环境没有可用于验收的真实 TFS 连接配置，且任务规则要求谨慎处理真实 TFS 操作。
- 验收标准确认：
  - 可浏览 Collection 下目录树：代码路径满足，真实 TFS 数据未在当前环境执行。
  - 展开节点不要求本地已映射：满足，展开时只使用服务端 `collection + path` 调用 `/api/server-tree`。
  - 选中目录能更新当前路径：满足，`ServerTreePanel` 通过 `onPathSelect` 通知首页并更新中间区域当前路径。
- 遗留问题：
  - 需要在具备真实 TFS 连接后补充 Collection / 目录树端到端验收。
