import { FolderOpen } from "lucide-react"

import type { WorkspaceSession } from "~/lib/tfs/session"

/**
 * 按最长前缀匹配查找服务端路径所属的 Mapping，未命中返回 null。
 */
function findMapping(session: WorkspaceSession, serverPath: string) {
  let matched: WorkspaceSession["mappings"][number] | null = null
  for (const mapping of session.mappings) {
    if (
      serverPath === mapping.serverPath ||
      serverPath.startsWith(`${mapping.serverPath}/`)
    ) {
      if (!matched || mapping.serverPath.length > matched.serverPath.length) {
        matched = mapping
      }
    }
  }
  return matched
}

/**
 * 中间主工作区骨架：顶部展示当前路径与 Mapping 摘要，主体为文件列表占位，
 * 真实目录数据加载与表格在 FE-005 实现。
 */
export function FolderItemsPanel({
  session,
  selectedServerPath,
}: {
  session: WorkspaceSession
  selectedServerPath: string
}) {
  const mapping = findMapping(session, selectedServerPath)
  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b px-3">
        <span className="shrink-0 text-xs text-muted-foreground">当前路径</span>
        <span className="min-w-0 truncate font-mono text-xs">{selectedServerPath}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {mapping ? (
            <span className="font-mono">{mapping.localPath}</span>
          ) : (
            "未映射到本地"
          )}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <FolderOpen className="size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            当前目录文件列表将在后续任务加载
          </p>
          <p className="font-mono text-xs text-muted-foreground/80">
            {selectedServerPath}
          </p>
        </div>
      </div>

      <div className="flex h-8 shrink-0 items-center border-t px-3 text-xs text-muted-foreground">
        未选中对象
      </div>
    </section>
  )
}
