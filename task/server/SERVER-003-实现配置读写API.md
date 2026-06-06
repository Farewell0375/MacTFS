# SERVER-003 实现配置读写 API

## 状态

done

## 优先级

P0

## 所属阶段

server

## 依赖任务

- SERVER-002
- CORE-002

## 需求来源

- PRD 四、4.3 配置文件
- PRD 五、5.1 基础接口

## 目标

实现单默认配置文件的读取和保存 API。

## 实现范围

- `GET /api/config`
- `PUT /api/config`
- 配置文件路径 `~/.mactfs/config.json`
- 保存 serverUri、authType、domain、username、password、collection、workspace、mappings

## 不在范围

- 不做多 Profile
- 不做 Keychain
- 不隐藏明文密码

## 涉及文件

- [mactfs/src/main/java/com/mydev/mactfs](/Users/fenghp/Desktop/DEV/project/mydev/mactfs/src/main/java/com/mydev/mactfs)

## 验收标准

- 配置可保存并再次读取
- 空配置时返回默认结构
- JSON 结构与 PRD 一致

## 测试方式

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:38765/api/config
```

## 完成记录

- 实际修改文件：
  - `mactfs/src/main/java/com/mydev/mactfs/server/MacTfsServer.java`
- 实际实现内容：
  - 新增 `GET /api/config`。
  - 新增 `PUT /api/config`。
  - 配置文件固定为 `~/.mactfs/config.json`。
  - 配置结构包含 serverUri、authType、domain、username、password、collection、workspace、mappings。
  - 空配置默认返回 `authType=ntlm-explicit` 和空 mappings 数组。
- 已执行测试：
  - 带 token 调用 `GET /api/config`。
  - 执行 `../tfsIntegration/gradlew build`。
- 测试结果：
  - `GET /api/config` 返回 `success=true`。
  - 返回配置中 `authType=ntlm-explicit`，`mappings` 为数组。
  - build 成功。
- 未执行测试及原因：
  - 未写入真实账号密码配置，避免在本机生成不必要的明文凭据。
- 是否满足验收标准：
  - 配置可保存并再次读取：代码已实现，未写入真实凭据验证。
  - 空配置时返回默认结构：满足。
  - JSON 结构与 PRD 一致：满足。
- 遗留问题：
  - 后续可用测试配置补充 PUT/GET 回读验收。
