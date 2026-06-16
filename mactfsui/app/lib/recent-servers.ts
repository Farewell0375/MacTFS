// 登录页「最近连接」本地记录，仅存非敏感字段（不存密码）。
export interface RecentServer {
  serverUri: string
  domain: string
  username: string
  lastUsedAt: number
}

const STORAGE_KEY = "mactfs.recent-servers"
const MAX_ENTRIES = 5

/**
 * 读取最近连接记录，本地存储不可用或数据损坏时返回空列表。
 */
export function loadRecentServers(): RecentServer[] {
  if (typeof window === "undefined") {
    return []
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as RecentServer[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * 写入一条最近连接记录：按 serverUri + username 去重置顶，最多保留 5 条。
 */
export function saveRecentServer(entry: Omit<RecentServer, "lastUsedAt">): RecentServer[] {
  const next: RecentServer[] = [
    { ...entry, lastUsedAt: Date.now() },
    ...loadRecentServers().filter(
      (item) => item.serverUri !== entry.serverUri || item.username !== entry.username,
    ),
  ].slice(0, MAX_ENTRIES)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // 本地存储写入失败不影响连接流程
  }
  return next
}
