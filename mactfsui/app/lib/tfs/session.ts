import type { MappingInfo } from "~/lib/api"

// 服务端目录树根路径，工作台导航的默认起点。
export const SERVER_ROOT_PATH = "$/"

// 工作台进入后固定的共享上下文，serverUri / collection / workspace 不再在台内切换。
export interface WorkspaceSession {
  serverUri: string
  collection: string
  workspace: string
  mappings: MappingInfo[]
}
