# FEATURE-004 Pending Changes 与 Checkin 端到端验收

## 状态

todo

## 优先级

P0

## 所属阶段

feature

## 依赖任务

- FEATURE-003
- FE-008
- FE-010

## 需求来源

- PRD 七、7.4 签入

## 目标

验证右侧挂起更改、Included / Excluded 和签入完整链路。

## 实现范围

- 查询 pending changes
- Included / Excluded 分组
- 在两组之间移动文件
- comment 必填
- 只签入 Included Changes
- 成功返回 changeset
- 失败显示 TFS 错误

## 不在范围

- 不做 Work Item
- 不做 Check-in Policy UI
- 不做 Excluded 持久化

## 涉及文件

- [mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs)
- [mactfsui](/Users/fenghp/Desktop/DEV/project/mydev/mactfsui)

## 验收标准

- comment 为空不能签入
- Excluded 不参与签入
- 成功后 Included 清空
- changeset 编号可见

## 测试方式

```bash
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfs
../tfsIntegration/gradlew build
cd /Users/fenghp/Desktop/DEV/project/mydev/mactfsui
pnpm typecheck
```

## 完成记录

待完成后填写。
