# FE-006 实现 Mapping 创建流程

## 状态

todo

## 优先级

P0

## 所属阶段

frontend

## 依赖任务

- FE-005
- SERVER-006

## 需求来源

- PRD 七、7.2 创建 Mapping

## 目标

实现选中服务端目录后映射到本地目录的流程。

## 实现范围

- 在未映射目录显示“映射到本地”
- 选择本地目录
- 调用 Mapping API
- 让用户选择是否立即 Get Latest
- 创建成功后更新 UI 状态

## 不在范围

- 不做多 Profile
- 不做复杂 Mapping 编辑
- 不强制立即下载

## 涉及文件

- [mactfsui/app](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/app)
- [mactfsui/electron/main.cjs](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui/electron/main.cjs)

## 验收标准

- 可创建 Mapping
- 可选择是否立即 Get Latest
- 不立即下载时后续仍可对下级文件 Get Latest

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
