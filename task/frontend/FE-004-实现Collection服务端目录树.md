# FE-004 实现 Collection 服务端目录树

## 状态

todo

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

待完成后填写。
