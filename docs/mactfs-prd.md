# macTFS 产品需求文档（PRD）

## 一、产品概述

### 1.1 产品名称

macTFS

### 1.2 产品定位

macOS 平台上的 TFS（Azure DevOps Server）版本控制客户端。提供文件获取、签出、签入、历史查询、差异对比等完整版本控制能力，替代依赖 IntelliJ 宿主的旧版 TFS 插件。

### 1.3 目标用户

在 macOS 环境下使用 TFS 进行代码版本管理的开发人员。

### 1.4 核心价值

- 脱离 IDE 宿主，独立运行
- 提供桌面 GUI 和 HTTP API 两种操作入口
- 支持 curl / 脚本 / CI 等第三方集成
- 支持 Apple Silicon（通过 Rosetta + x86_64 JDK 8）

### 1.5 技术架构

```
┌──────────────────────────────────────────────────────────┐
│                     消费端                                │
│  Electron UI  │  curl  │  第三方脚本  │  CI Pipeline     │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP REST API (localhost)
                         ▼
┌──────────────────────────────────────────────────────────┐
│                mactfs-server (Java 8)                    │
│                                                          │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────┐  │
│  │  HTTP Router  │  │  Session Mgr   │  │  Config DB  │  │
│  └───────┬───────┘  └───────┬────────┘  └────────────┘  │
│          └─────────┬────────┘                            │
│                    ▼                                     │
│  ┌───────────────────────────────────────────────────┐   │
│  │         TFS Core Service Layer                    │   │
│  │  (连接、认证、工作区、映射、文件操作、历史)         │   │
│  └───────────────────────┬───────────────────────────┘   │
│                          ▼                               │
│  ┌───────────────────────────────────────────────────┐   │
│  │         TFS SDK (tfsIntegration/lib)              │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 1.6 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Electron + React 19 + React Router 7 | 桌面壳 + 现代前端 |
| UI 库 | shadcn/ui (radix-nova) + TailwindCSS 4 | 组件与样式 |
| 后端 | Java 8 (内嵌 HTTP 服务器) | 复用已验证的 TFS SDK 能力 |
| TFS SDK | Microsoft TFS SDK (Java) | SOAP 通信、NTLM 认证、版本控制操作 |
| 通信协议 | HTTP REST (JSON) | 前后端 + 外部调用统一接口 |
| 运行环境 | Zulu JDK 8 x86_64 + Rosetta | Apple Silicon 兼容方案 |

---

## 二、TFS 核心概念说明

### 2.1 TFS 版本控制模型

```
TFS Server
└── Configuration Server          # 服务器根节点
    └── Team Project Collection   # 项目集合（如 PKUSEHR、PE）
        └── Team Project          # 团队项目（如 01HRAP4GQ）
            └── Source Control    # 版本控制根
                ├── $/Project/Main
                ├── $/Project/Dev
                └── $/Project/Release
```

### 2.2 Workspace（工作区）

工作区是 TFS 版本控制的核心单元，绑定以下属性：

| 属性 | 说明 |
|------|------|
| Name | 工作区名称，全局唯一 |
| Owner | 所有者（域账号） |
| Computer | 绑定的计算机名 |
| Type | Server（服务端管理）或 Local（本地管理） |
| Mappings | 服务端路径与本地路径的映射关系列表 |

### 2.3 Mapping（映射）

映射定义了云端文件路径与本地磁盘路径的对应关系：

```
映射示例：
  $/01HRAP4GQ/03DEV分支/V8_6_0  →  /Users/fenghp/projects/v8.6
  $/01HRAP4GQ/03DEV分支/V8_6_0/02数据库脚本  →  /Users/fenghp/projects/db-scripts
```

一个工作区可以包含多条映射，每条映射是一个独立的同步单元。

### 2.4 版本控制操作

| 操作 | TFS 术语 | 说明 |
|------|----------|------|
| 获取最新 | Get Latest | 将云端最新文件下载到本地映射目录 |
| 获取指定版本 | Get Specific Version | 按 Changeset / 日期 / Label 获取 |
| 签出 | Checkout (Pend Edit) | 标记文件为可编辑状态 |
| 签入 | Checkin | 将本地修改提交到 TFS |
| 新增 | Pend Add | 将本地新文件加入版本控制 |
| 删除 | Pend Delete | 标记文件待删除 |
| 撤销 | Undo | 撤销本地挂起的变更 |
| 历史 | History | 查询文件或路径的变更历史 |
| 对比 | Diff | 对比两个版本或本地与云端的差异 |

---

## 三、功能需求

### 3.1 功能总览

| 模块 | 功能 | 优先级 | 阶段 |
|------|------|--------|------|
| **连接与认证** | 配置服务器地址与账号密码 | P0 | 二期 |
| | 测试连接 | P0 | 二期 |
| | 查询 Collection 列表 | P0 | 二期 |
| | 会话保持（常驻连接） | P0 | 二期 |
| **工作区管理** | 查询工作区列表 | P0 | 二期 |
| | 创建工作区 | P0 | 二期 |
| | 删除工作区 | P1 | 三期 |
| | 查看工作区详情 | P0 | 二期 |
| **映射管理** | 查看当前工作区映射列表 | P0 | 二期 |
| | 添加映射（服务端路径 → 本地路径） | P0 | 二期 |
| | 删除映射 | P1 | 二期 |
| | 编辑映射 | P2 | 三期 |
| **服务端目录浏览** | 浏览项目根目录 | P0 | 二期 |
| | 逐层展开子目录 | P0 | 二期 |
| | 查看文件详情（大小、版本号） | P2 | 三期 |
| **文件同步** | 获取最新（Get Latest） | P0 | 二期 |
| | 获取指定版本 | P1 | 三期 |
| | 获取到指定 Changeset | P1 | 三期 |
| **签出与签入** | 签出文件（Checkout） | P0 | 三期 |
| | 签入文件（Checkin） | P0 | 三期 |
| | 添加新文件（Add） | P0 | 三期 |
| | 删除文件（Delete） | P1 | 三期 |
| | 撤销变更（Undo） | P1 | 三期 |
| | 签入时附加注释 | P0 | 三期 |
| **本地变更管理** | 扫描本地文件变更状态 | P0 | 三期 |
| | 显示待处理文件列表（Pending Changes） | P0 | 三期 |
| | 按文件类型/路径过滤 | P2 | 四期 |
| **历史查询** | 查询文件变更历史 | P0 | 三期 |
| | 查询路径变更历史 | P0 | 三期 |
| | 查看指定 Changeset 详情 | P1 | 三期 |
| | 按用户/日期/注释筛选 | P2 | 四期 |
| **文件对比** | 本地文件 vs 云端最新版本 | P0 | 三期 |
| | 云端两个版本之间对比 | P1 | 四期 |
| | 差异内容展示（Unified Diff） | P0 | 三期 |
| **日志与反馈** | 操作执行日志实时展示 | P0 | 二期 |
| | 错误信息展示 | P0 | 二期 |
| | 操作进度展示 | P1 | 三期 |
| **配置管理** | 本地保存连接配置 | P0 | 二期 |
| | 配置回填（打开即恢复上次状态） | P0 | 二期 |
| | 多配置切换 | P2 | 四期 |

---

### 3.2 模块详细需求

#### 3.2.1 连接与认证

**描述：** 用户配置 TFS 服务器地址、认证方式、域账号和密码，建立与 TFS 的连接会话。

**输入：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| serverUri | string | 是 | TFS 服务器地址，如 `http://tfs.example.com:8080/tfs/` |
| authType | enum | 是 | 认证方式：`ntlm-explicit`（显式凭证）、`ntlm-native`（系统凭证） |
| username | string | 条件必填 | 用户名（ntlm-explicit 时必填） |
| domain | string | 否 | 域名，如 `bdsoft` |
| password | string | 条件必填 | 密码（ntlm-explicit 时必填） |

**输出：**

- 连接成功：返回 sessionToken，后续请求携带此 token
- 连接失败：返回错误信息（网络不通、认证失败等）

**API：**

```
POST /api/session/connect
Request:
{
  "serverUri": "http://100.113.212.90:20094/tfs/",
  "authType": "ntlm-explicit",
  "username": "fenghp",
  "domain": "bdsoft",
  "password": "***"
}

Response (200):
{
  "success": true,
  "data": {
    "sessionToken": "abc123",
    "serverUri": "http://100.113.212.90:20094/tfs/",
    "collectionCount": 2
  }
}
```

**验收标准：**

- 正确的账号密码能成功建立连接
- 错误的账号密码返回明确错误信息
- 网络不通时在合理时间内超时并返回错误
- 连接建立后服务端保持会话，后续请求无需重复认证

---

#### 3.2.2 Collection 查询

**描述：** 查询当前服务器下用户可见的 Team Project Collection 列表。

**前置条件：** 已建立连接会话

**API：**

```
GET /api/collections
Authorization: Bearer <sessionToken>

Response (200):
{
  "success": true,
  "data": {
    "collections": [
      { "name": "PE", "id": "xxx-xxx-xxx" },
      { "name": "PKUSEHR", "id": "yyy-yyy-yyy" }
    ]
  }
}
```

---

#### 3.2.3 工作区管理

**描述：** 管理当前用户在指定 Collection 下的工作区。

**查询工作区列表：**

```
GET /api/workspaces?collection=PKUSEHR
Authorization: Bearer <sessionToken>

Response (200):
{
  "success": true,
  "data": {
    "workspaces": [
      {
        "name": "mactfs-PKUSEHR-xxx",
        "ownerName": "BDSOFT\\fenghp",
        "computer": "fenghaopengdeMacBook-Pro.local",
        "comment": "mactfs workspace",
        "mappings": [
          {
            "serverPath": "$/01HRAP4GQ/03DEV分支/V8_6_0",
            "localPath": "/Users/fenghp/projects/v8.6",
            "type": "map"
          }
        ]
      }
    ]
  }
}
```

**创建工作区：**

```
POST /api/workspaces
Authorization: Bearer <sessionToken>
{
  "collection": "PKUSEHR",
  "name": "mactfs-dev-workspace",
  "comment": "开发用工作区"
}

Response (201):
{
  "success": true,
  "data": {
    "name": "mactfs-dev-workspace",
    "ownerName": "BDSOFT\\fenghp",
    "computer": "fenghaopengdeMacBook-Pro.local",
    "created": true
  }
}
```

**删除工作区：**

```
DELETE /api/workspaces/:name?collection=PKUSEHR
Authorization: Bearer <sessionToken>

Response (200):
{
  "success": true,
  "message": "Workspace deleted"
}
```

---

#### 3.2.4 映射管理

**描述：** 管理工作区内的服务端路径与本地路径映射。映射是文件同步、签出签入等所有操作的前提。

**业务规则：**

- 一个工作区可以有多条映射
- 每条映射由一个服务端路径（Server Path）和一个本地路径（Local Path）组成
- 服务端路径必须以 `$/` 开头
- 本地路径必须是绝对路径且目录可写
- 不允许映射路径互相包含（TFS 约束）
- 添加映射时如果本地目录不存在，自动创建

**查看工作区映射列表：**

```
GET /api/workspaces/:name/mappings?collection=PKUSEHR
Authorization: Bearer <sessionToken>

Response (200):
{
  "success": true,
  "data": {
    "workspace": "mactfs-dev-workspace",
    "mappings": [
      {
        "id": 1,
        "serverPath": "$/01HRAP4GQ/03DEV分支/V8_6_0",
        "localPath": "/Users/fenghp/projects/v8.6",
        "type": "map"
      },
      {
        "id": 2,
        "serverPath": "$/01HRAP4GQ/03DEV分支/V8_6_0/02数据库脚本",
        "localPath": "/Users/fenghp/projects/db-scripts",
        "type": "map"
      }
    ]
  }
}
```

**添加映射：**

```
POST /api/workspaces/:name/mappings
Authorization: Bearer <sessionToken>
{
  "collection": "PKUSEHR",
  "serverPath": "$/01HRAP4GQ/03DEV分支/V8_6_0",
  "localPath": "/Users/fenghp/projects/v8.6"
}

Response (201):
{
  "success": true,
  "data": {
    "id": 1,
    "serverPath": "$/01HRAP4GQ/03DEV分支/V8_6_0",
    "localPath": "/Users/fenghp/projects/v8.6",
    "created": true
  }
}
```

**删除映射：**

```
DELETE /api/workspaces/:name/mappings/:id?collection=PKUSEHR
Authorization: Bearer <sessionToken>

Response (200):
{
  "success": true,
  "message": "Mapping removed"
}
```

---

#### 3.2.5 服务端目录浏览

**描述：** 浏览 TFS 服务端的目录树结构，用于在添加映射时选择服务端路径。

```
GET /api/browse?collection=PKUSEHR&path=$/01HRAP4GQ
Authorization: Bearer <sessionToken>

Response (200):
{
  "success": true,
  "data": {
    "path": "$/01HRAP4GQ",
    "items": [
      { "name": "01文档", "path": "$/01HRAP4GQ/01文档", "folder": true },
      { "name": "02SRC", "path": "$/01HRAP4GQ/02SRC", "folder": true },
      { "name": "03DEV分支", "path": "$/01HRAP4GQ/03DEV分支", "folder": true },
      { "name": "README.md", "path": "$/01HRAP4GQ/README.md", "folder": false }
    ]
  }
}
```

---

#### 3.2.6 文件同步（Get Latest / Get Specific Version）

**描述：** 将服务端文件下载到本地映射目录。

**获取最新：**

```
POST /api/files/get-latest
Authorization: Bearer <sessionToken>
{
  "collection": "PKUSEHR",
  "workspace": "mactfs-dev-workspace",
  "serverPath": "$/01HRAP4GQ/03DEV分支/V8_6_0",
  "localPath": "/Users/fenghp/projects/v8.6"
}

Response (200):
{
  "success": true,
  "data": {
    "updatedFiles": 142,
    "operations": 142,
    "conflicts": 0,
    "failures": 0
  }
}
```

**获取指定版本（三期）：**

```
POST /api/files/get-version
Authorization: Bearer <sessionToken>
{
  "collection": "PKUSEHR",
  "workspace": "mactfs-dev-workspace",
  "serverPath": "$/01HRAP4GQ/03DEV分支/V8_6_0/src/App.vue",
  "versionType": "changeset",
  "versionValue": "12345"
}
```

---

#### 3.2.7 签出与签入

**签出文件（Checkout / Pend Edit）：**

```
POST /api/files/checkout
Authorization: Bearer <sessionToken>
{
  "collection": "PKUSEHR",
  "workspace": "mactfs-dev-workspace",
  "serverPaths": [
    "$/01HRAP4GQ/03DEV分支/V8_6_0/src/App.vue",
    "$/01HRAP4GQ/03DEV分支/V8_6_0/src/main.js"
  ]
}

Response (200):
{
  "success": true,
  "data": {
    "checkedOut": 2,
    "files": [
      { "serverPath": "$/01HRAP4GQ/.../App.vue", "status": "edit" },
      { "serverPath": "$/01HRAP4GQ/.../main.js", "status": "edit" }
    ]
  }
}
```

**签入文件（Checkin）：**

```
POST /api/files/checkin
Authorization: Bearer <sessionToken>
{
  "collection": "PKUSEHR",
  "workspace": "mactfs-dev-workspace",
  "comment": "修复登录页样式问题",
  "serverPaths": [
    "$/01HRAP4GQ/03DEV分支/V8_6_0/src/App.vue"
  ]
}

Response (200):
{
  "success": true,
  "data": {
    "changesetId": 56789,
    "checkedIn": 1,
    "comment": "修复登录页样式问题"
  }
}
```

**新增文件（Add）：**

```
POST /api/files/add
Authorization: Bearer <sessionToken>
{
  "collection": "PKUSEHR",
  "workspace": "mactfs-dev-workspace",
  "localPaths": [
    "/Users/fenghp/projects/v8.6/src/NewComponent.vue"
  ]
}
```

**删除文件（Delete）：**

```
POST /api/files/delete
Authorization: Bearer <sessionToken>
{
  "collection": "PKUSEHR",
  "workspace": "mactfs-dev-workspace",
  "serverPaths": [
    "$/01HRAP4GQ/03DEV分支/V8_6_0/src/OldComponent.vue"
  ]
}
```

**撤销变更（Undo）：**

```
POST /api/files/undo
Authorization: Bearer <sessionToken>
{
  "collection": "PKUSEHR",
  "workspace": "mactfs-dev-workspace",
  "serverPaths": [
    "$/01HRAP4GQ/03DEV分支/V8_6_0/src/App.vue"
  ]
}
```

---

#### 3.2.8 本地变更管理（Pending Changes）

**描述：** 扫描工作区内的本地变更状态。

```
GET /api/files/status?collection=PKUSEHR&workspace=mactfs-dev-workspace
Authorization: Bearer <sessionToken>

Response (200):
{
  "success": true,
  "data": {
    "pendingChanges": [
      {
        "serverPath": "$/01HRAP4GQ/.../App.vue",
        "localPath": "/Users/fenghp/projects/v8.6/src/App.vue",
        "changeType": "edit",
        "isLocked": false
      },
      {
        "serverPath": "$/01HRAP4GQ/.../NewFile.vue",
        "localPath": "/Users/fenghp/projects/v8.6/src/NewFile.vue",
        "changeType": "add",
        "isLocked": false
      }
    ],
    "total": 2
  }
}
```

---

#### 3.2.9 历史查询

**描述：** 查询文件或路径的变更历史记录。

```
GET /api/files/history?collection=PKUSEHR&serverPath=$/01HRAP4GQ/.../App.vue&maxCount=50
Authorization: Bearer <sessionToken>

Response (200):
{
  "success": true,
  "data": {
    "serverPath": "$/01HRAP4GQ/.../App.vue",
    "history": [
      {
        "changesetId": 56789,
        "committer": "BDSOFT\\fenghp",
        "date": "2026-05-28T10:30:00",
        "comment": "修复登录页样式问题",
        "changeType": "edit"
      },
      {
        "changesetId": 56700,
        "committer": "BDSOFT\\zhangsan",
        "date": "2026-05-25T15:20:00",
        "comment": "添加主题切换功能",
        "changeType": "edit"
      }
    ],
    "total": 2
  }
}
```

**查看 Changeset 详情：**

```
GET /api/changeset/:id?collection=PKUSEHR
Authorization: Bearer <sessionToken>

Response (200):
{
  "success": true,
  "data": {
    "changesetId": 56789,
    "committer": "BDSOFT\\fenghp",
    "date": "2026-05-28T10:30:00",
    "comment": "修复登录页样式问题",
    "changes": [
      {
        "serverPath": "$/01HRAP4GQ/.../App.vue",
        "changeType": "edit"
      },
      {
        "serverPath": "$/01HRAP4GQ/.../style.css",
        "changeType": "edit"
      }
    ]
  }
}
```

---

#### 3.2.10 文件对比

**本地 vs 云端最新版本：**

```
POST /api/diff/local-vs-server
Authorization: Bearer <sessionToken>
{
  "collection": "PKUSEHR",
  "workspace": "mactfs-dev-workspace",
  "serverPath": "$/01HRAP4GQ/.../App.vue"
}

Response (200):
{
  "success": true,
  "data": {
    "serverPath": "$/01HRAP4GQ/.../App.vue",
    "localPath": "/Users/fenghp/projects/v8.6/src/App.vue",
    "serverVersion": 56700,
    "hasChanges": true,
    "diff": "--- server (changeset 56700)\n+++ local\n@@ -10,3 +10,5 @@\n ...(unified diff content)..."
  }
}
```

**两个版本之间对比（四期）：**

```
POST /api/diff/versions
Authorization: Bearer <sessionToken>
{
  "collection": "PKUSEHR",
  "serverPath": "$/01HRAP4GQ/.../App.vue",
  "fromVersion": 56700,
  "toVersion": 56789
}
```

---

## 四、API 统一规范

### 4.1 请求头

所有需要认证的请求必须携带：

```
Authorization: Bearer <sessionToken>
Content-Type: application/json
```

### 4.2 响应格式

**成功响应：**

```json
{
  "success": true,
  "message": "操作描述",
  "data": { ... }
}
```

**失败响应：**

```json
{
  "success": false,
  "message": "错误描述",
  "errorCode": "CONNECTION_FAILED",
  "data": null
}
```

### 4.3 错误码

| 错误码 | 说明 |
|--------|------|
| AUTH_FAILED | 认证失败（用户名密码错误） |
| CONNECTION_FAILED | 网络连接失败 |
| SESSION_EXPIRED | 会话已过期 |
| WORKSPACE_NOT_FOUND | 工作区不存在 |
| COLLECTION_NOT_FOUND | Collection 不存在 |
| PATH_NOT_FOUND | 服务端路径不存在 |
| MAPPING_CONFLICT | 映射路径冲突 |
| CHECKIN_CONFLICT | 签入冲突 |
| PERMISSION_DENIED | 权限不足 |
| INTERNAL_ERROR | 服务内部错误 |

### 4.4 API 一览表

| 方法 | 路径 | 说明 | 阶段 |
|------|------|------|------|
| POST | /api/session/connect | 建立连接会话 | 二期 |
| DELETE | /api/session | 断开连接 | 二期 |
| GET | /api/collections | 查询 Collection 列表 | 二期 |
| GET | /api/workspaces | 查询工作区列表 | 二期 |
| POST | /api/workspaces | 创建工作区 | 二期 |
| DELETE | /api/workspaces/:name | 删除工作区 | 三期 |
| GET | /api/workspaces/:name/mappings | 查看映射列表 | 二期 |
| POST | /api/workspaces/:name/mappings | 添加映射 | 二期 |
| DELETE | /api/workspaces/:name/mappings/:id | 删除映射 | 二期 |
| GET | /api/browse | 浏览服务端目录 | 二期 |
| POST | /api/files/get-latest | 获取最新 | 二期 |
| POST | /api/files/get-version | 获取指定版本 | 三期 |
| POST | /api/files/checkout | 签出 | 三期 |
| POST | /api/files/checkin | 签入 | 三期 |
| POST | /api/files/add | 新增文件 | 三期 |
| POST | /api/files/delete | 删除文件 | 三期 |
| POST | /api/files/undo | 撤销变更 | 三期 |
| GET | /api/files/status | 查询待处理变更 | 三期 |
| GET | /api/files/history | 查询历史 | 三期 |
| GET | /api/changeset/:id | 查看 Changeset 详情 | 三期 |
| POST | /api/diff/local-vs-server | 本地 vs 云端对比 | 三期 |
| POST | /api/diff/versions | 版本间对比 | 四期 |

---

## 五、桌面端页面设计

### 5.1 页面结构

```
┌──────────────────────────────────────────────────────────────┐
│ Top Bar: 连接状态 / Server / Collection / Workspace / 全局入口 │
├──────────────┬────────────────────────────────┬──────────────┤
│ Source Tree  │ Current Folder Items            │ Changes      │
│ 左侧目录树    │ 中间目录文件列表                │ Pending/Checkin│
├──────────────┴────────────────────────────────┴──────────────┤
│ Operation Console / 底部日志面板（可折叠）                    │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 各页面说明

#### 连接配置页

- 表单字段：Server URI、Auth Type、Username、Domain、Password
- 操作按钮：测试连接、保存配置
- 状态指示：连接状态（未连接/连接中/已连接/连接失败）

#### 上下文确认流程

- 登录成功后加载 Collection 列表
- 用户确认当前 Collection
- 系统自动查找或创建默认 Workspace
- 工作台内不提供 Workspace 手动选择

#### Mapping 弹窗

- 从目录树或文件列表触发“映射到本地”
- 选择服务端路径与本地目录
- 选择是否立即 Get Latest
- 创建后刷新当前工作台状态

#### 目录浏览工作台

- 左侧树形展开的服务端目录结构
- 中间展示当前目录下一级文件 / 文件夹
- 单击选中，双击目录进入
- 对象操作通过右键菜单触发

#### 右侧 Changes 面板

- 待处理变更列表（Pending Changes）
- Included / Excluded 分组
- 签入注释输入 + 签入按钮
- 查看、比较、撤销等对象操作走右键菜单

#### History 弹窗

- 输入路径或对象上下文触发
- 历史列表（Changeset ID、提交人、日期、注释）
- 点击 Changeset 查看详情
- 点击文件进入查看或 Diff

#### 文件查看与 Diff 弹窗

- 左右分栏对比视图
- 支持本地 vs 云端对比
- 支持两个历史版本对比
- 差异行高亮标记

---

## 六、分阶段实施计划

### 第二阶段：HTTP 服务 + 最小可用 UI

**目标：** 将 CLI 升级为常驻 HTTP 服务，完成连接、固定 Collection / Workspace 上下文、映射和 Get Latest 的界面化。

**后端任务：**

1. 在 mactfs 中引入内嵌 HTTP 服务器（JDK 自带 `com.sun.net.httpserver`）
2. 实现会话管理（保持 TFS 连接复用）
3. 将现有 TfsPhaseOneService 方法挂载为 REST 接口
4. 实现映射的 CRUD 接口（当前只有 sync 中的单条映射保存）
5. 保留 CLI 入口作为调试工具

**前端任务：**

1. `mactfsui` 从 spawn CLI 改为 HTTP 调用
2. 实现 Electron 启动服务、preload 和 API client
3. 实现连接页与 Collection 选择
4. 自动确保默认 Workspace，不单独提供 Workspace 管理页
5. 实现固定 Collection 下的目录树与当前目录列表
6. 实现 Mapping 弹窗、Get Latest、底部日志面板

**验收标准：**

- 用户可通过界面完成登录
- 用户可在登录阶段确认 Collection
- 用户进入工作台后可自动使用或创建默认 Workspace
- 用户可通过界面添加/查看/删除映射
- 用户可通过界面执行 Get Latest
- curl 可直接调用所有 API
- Java 服务启动后保持常驻，无需每次重启

### 第三阶段：签出签入闭环 + 历史与对比

**目标：** 完成文件级版本控制操作闭环。

**后端任务：**

1. 实现 checkout / checkin / add / delete / undo 接口
2. 实现 pending changes 查询
3. 实现文件历史查询
4. 实现文件对比（本地 vs 云端）
5. 实现 Changeset 详情查询

**前端任务：**

1. 实现 Pending Changes + Checkin 右侧面板
2. 实现 History 弹窗
3. 实现文件查看与 Diff 弹窗
4. 实现目录对比、右键菜单和冲突弹窗
5. 完善操作进度展示

### 第四阶段：增强能力

**目标：** 补充高频辅助能力和体验优化。

**功能范围：**

- 版本间对比
- 高级历史筛选（按用户、日期、注释）
- 多配置管理（支持切换不同 TFS 服务器/账号）
- Label 查询
- Branch / Merge 操作预研
- Work Item 只读关联展示

---

## 七、非功能需求

### 7.1 性能

| 指标 | 要求 |
|------|------|
| 服务启动时间 | ≤ 5 秒 |
| API 响应时间（非文件下载） | ≤ 3 秒 |
| 目录浏览单层展开 | ≤ 2 秒 |
| 会话保持时间 | ≥ 30 分钟无操作不断开 |

### 7.2 安全

- 服务仅监听 localhost，不对外暴露
- 密码在传输和存储中不明文显示（后续升级加密存储）
- sessionToken 使用随机生成的安全令牌

### 7.3 可靠性

- 网络断开时明确提示，不丢失本地状态
- 操作失败时提供回退建议
- 日志完整记录所有操作和错误

### 7.4 兼容性

| 环境 | 要求 |
|------|------|
| macOS | 12.0+ (Monterey 及以上) |
| 架构 | Apple Silicon (通过 Rosetta) + Intel |
| TFS 版本 | TFS 2015 及以下 |
| JDK | Zulu 8u492 x86_64 |

---

## 八、已验证能力基线

以下能力已在第一阶段 CLI 中验证通过，可直接复用：

| 能力 | 验证状态 | 对应代码 |
|------|----------|----------|
| TFS 连接与认证 | 已通过 | `TfsPhaseOneService.connectConfigurationServer()` |
| Collection 查询 | 已通过 | `TfsPhaseOneService.listCollections()` |
| Workspace 查询 | 已通过 | `TfsPhaseOneService.listWorkspaces()` |
| Workspace 创建 | 已通过 | `TfsPhaseOneService.ensureWorkspace()` |
| 服务端目录浏览 | 已通过 | `TfsPhaseOneService.browseServerPath()` |
| 映射保存 | 已通过 | `TfsPhaseOneService.sync()` (workspace.update) |
| Get Latest | 已通过 | `TfsPhaseOneService.sync()` (workspace.get) |
| JSON 输出 | 已通过 | `CliJsonWriter` |
| 本地配置存储 | 已通过 | `LocalConfigStore` |

---

## 九、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| JNI native 库仅支持 x86_64 | Apple Silicon 机器必须通过 Rosetta 运行 | 内置 x86_64 JDK，服务启动脚本自动切换 |
| TFS SDK 基于 JDK 8 | 无法使用现代 Java 特性 | 保持 JDK 8 编译，HTTP 层可用 JDK 自带 API |
| 旧版 SOAP 协议性能 | 大量文件操作时可能较慢 | 前端展示进度，支持中断 |
| 明文密码存储 | 安全风险 | 二期增加密钥环或加密存储 |
| 会话意外断开 | 操作中断 | 自动重连机制 + 明确错误提示 |

---

## 十、术语表

| 术语 | 说明 |
|------|------|
| TFS | Team Foundation Server，微软的应用生命周期管理平台 |
| Collection | Team Project Collection，项目集合，TFS 的顶级组织单元 |
| Workspace | 工作区，TFS 版本控制的核心工作单元 |
| Mapping | 映射，服务端路径与本地路径的对应关系 |
| Changeset | 变更集，TFS 中一次签入操作产生的版本记录 |
| Pending Change | 待处理变更，本地已修改但未签入的文件 |
| Get Latest | 获取最新版本，将云端文件同步到本地 |
| Checkout | 签出，标记文件为可编辑状态 |
| Checkin | 签入，将本地修改提交到 TFS 服务器 |
| NTLM | Windows 网络认证协议 |
| Server Path | 以 `$/` 开头的 TFS 服务端文件路径 |
| Local Path | 本地磁盘上的文件路径 |
