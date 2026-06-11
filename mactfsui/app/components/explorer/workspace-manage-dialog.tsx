import { useCallback, useEffect, useState } from "react"
import { FolderSearch, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { ConfirmDialog } from "~/components/app/confirm-dialog"
import { MappingDialog } from "~/components/explorer/mapping-dialog"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { api } from "~/lib/api"
import type { CheckMappingTargetResult, MappingInfo, WorkspaceInfo } from "~/lib/api"
import { isElectron, pathsExist, selectDirectory } from "~/lib/electron"
import type { WorkspaceSession } from "~/lib/tfs"

/**
 * 工作区集中管理弹窗：展示 Workspace 信息与全部 Mapping，
 * 支持新增、删除与修改本地路径（删旧 + 加新），对齐 VS 的 Edit Workspace。
 */
export function WorkspaceManageDialog({
  session,
  onClose,
  onMappingsChanged,
}: {
  session: WorkspaceSession
  onClose: () => void
  /** Mapping 集合变化（新增 / 删除 / 修改）后回调上层刷新。 */
  onMappingsChanged: (mappings: MappingInfo[]) => void
}) {
  const [info, setInfo] = useState<WorkspaceInfo | null>(null)
  // 各 Mapping 本地目录存在性（null 表示无法检测，如非 Electron 环境）。
  const [existsMap, setExistsMap] = useState<Record<string, boolean> | null>(null)
  const [error, setError] = useState<string | null>(null)
  // 新增映射：输入服务端路径后打开既有 MappingDialog。
  const [addServerPath, setAddServerPath] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [editMapping, setEditMapping] = useState<MappingInfo | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<MappingInfo | null>(null)

  // Workspace 详细信息（Owner / Computer）通过 ensure 接口幂等获取。
  useEffect(() => {
    let active = true
    void (async () => {
      const result = await api.ensureWorkspace({})
      if (!active) {
        return
      }
      if (result.ok && result.data) {
        setInfo(result.data.workspace)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Mapping 集合变化时重新检测本地目录存在性。
  useEffect(() => {
    let active = true
    void (async () => {
      const result = await pathsExist(session.mappings.map((mapping) => mapping.localPath))
      if (active) {
        setExistsMap(result)
      }
    })()
    return () => {
      active = false
    }
  }, [session.mappings])

  /**
   * 删除 Mapping（仅解除映射，不删除本地文件），成功后回调上层刷新。
   */
  const handleDelete = useCallback(
    async (mapping: MappingInfo) => {
      const result = await api.deleteMapping({ serverPath: mapping.serverPath })
      if (!result.ok) {
        setError(result.errorMessage ?? "删除 Mapping 失败")
        return
      }
      setError(null)
      onMappingsChanged(result.data?.mappings ?? [])
    },
    [onMappingsChanged],
  )

  const trimmedAddPath = addServerPath.trim()
  const addPathValid = trimmedAddPath.startsWith("$/") && trimmedAddPath.length > 2

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>工作区管理</DialogTitle>
          <DialogDescription>查看 Workspace 信息，集中管理全部本地映射</DialogDescription>
        </DialogHeader>

        <div className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-1 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <InfoRow label="Workspace" value={session.workspace} mono />
          <InfoRow label="服务器" value={session.serverUri} mono />
          <InfoRow label="Collection" value={session.collection} />
          <InfoRow label="Owner" value={info?.ownerName ?? "…"} />
          <InfoRow label="Computer" value={info?.computer ?? "…"} />
          <InfoRow label="Mapping 数量" value={String(session.mappings.length)} />
        </div>

        <div className="flex shrink-0 items-end gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <Label htmlFor="addServerPath" className="text-xs">
              新增映射的服务端路径
            </Label>
            <Input
              id="addServerPath"
              value={addServerPath}
              onChange={(event) => setAddServerPath(event.target.value)}
              placeholder="$/Project/Folder"
              className="h-8 font-mono text-xs"
            />
          </div>
          <Button
            size="sm"
            disabled={!addPathValid}
            onClick={() => setAddOpen(true)}
            title={addPathValid ? undefined : "请输入以 $/ 开头的服务端路径"}
          >
            <Plus data-icon="inline-start" />
            新增映射…
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
          {session.mappings.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              当前 Workspace 还没有任何映射
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 text-xs text-muted-foreground">服务端路径</TableHead>
                  <TableHead className="h-8 text-xs text-muted-foreground">本地路径</TableHead>
                  <TableHead className="h-8 w-20 text-xs text-muted-foreground">本地目录</TableHead>
                  <TableHead className="h-8 w-20 text-xs text-muted-foreground" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.mappings.map((mapping) => {
                  const exists = existsMap?.[mapping.localPath]
                  return (
                    <TableRow key={mapping.serverPath} className="cursor-default select-none">
                      <TableCell
                        className="max-w-0 truncate py-1.5 font-mono text-xs"
                        title={mapping.serverPath}
                      >
                        {mapping.serverPath}
                      </TableCell>
                      <TableCell
                        className="max-w-0 truncate py-1.5 font-mono text-xs"
                        title={mapping.localPath}
                      >
                        {mapping.localPath}
                      </TableCell>
                      <TableCell className="py-1.5">
                        {existsMap == null ? (
                          <span className="text-xs text-muted-foreground">无法检测</span>
                        ) : exists ? (
                          <Badge variant="secondary" className="bg-muted text-foreground/80">
                            存在
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-red-500/10 text-red-700 dark:text-red-400"
                          >
                            不存在
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="修改本地路径…"
                            onClick={() => setEditMapping(mapping)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            title="删除映射…"
                            onClick={() => setConfirmDelete(mapping)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {error && <p className="shrink-0 text-sm text-destructive">{error}</p>}
        <p className="shrink-0 text-xs text-muted-foreground">
          删除映射只解除服务端目录与本地目录的关联，不会删除本地已下载的文件。
        </p>

        {addOpen && (
          <MappingDialog
            serverPath={trimmedAddPath}
            onClose={() => setAddOpen(false)}
            onCreated={(mappings) => {
              onMappingsChanged(mappings)
              setAddOpen(false)
              setAddServerPath("")
            }}
          />
        )}

        {editMapping && (
          <EditMappingDialog
            mapping={editMapping}
            onClose={() => setEditMapping(null)}
            onChanged={(mappings) => {
              onMappingsChanged(mappings)
              setEditMapping(null)
            }}
          />
        )}

        {confirmDelete && (
          <ConfirmDialog
            title="删除映射"
            description={
              <>
                <p>
                  将解除 <span className="font-mono text-xs">{confirmDelete.serverPath}</span>{" "}
                  与本地目录的映射。
                </p>
                <p className="mt-2 text-muted-foreground">
                  本地已下载的文件不会被删除；该目录下的挂起更改将无法继续签入。
                </p>
              </>
            }
            confirmLabel="删除映射"
            danger
            onConfirm={async () => {
              await handleDelete(confirmDelete)
              setConfirmDelete(null)
            }}
            onClose={() => setConfirmDelete(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * 工作区信息单行展示。
 */
function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className={`min-w-0 truncate ${mono ? "font-mono" : ""}`} title={value}>
        {value}
      </span>
    </div>
  )
}

/**
 * 修改 Mapping 本地路径弹窗：选择新的本地父目录并预校验，
 * 确认后按「删旧 + 加新」方式调整映射（不迁移本地内容）。
 */
function EditMappingDialog({
  mapping,
  onClose,
  onChanged,
}: {
  mapping: MappingInfo
  onClose: () => void
  onChanged: (mappings: MappingInfo[]) => void
}) {
  const [parentPath, setParentPath] = useState("")
  const [check, setCheck] = useState<CheckMappingTargetResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 通过系统目录选择器选择新的本地父目录。
   */
  const handleBrowse = useCallback(async () => {
    const selected = await selectDirectory()
    if (selected) {
      setParentPath(selected)
    }
  }, [])

  // 与创建映射一致：父目录变化时由后端预校验最终目标路径。
  useEffect(() => {
    const trimmed = parentPath.trim()
    if (trimmed.length === 0) {
      setCheck(null)
      return
    }
    let active = true
    setChecking(true)
    const timer = setTimeout(() => {
      void (async () => {
        const result = await api.checkMappingTarget({
          serverPath: mapping.serverPath,
          localParentPath: trimmed,
        })
        if (!active) {
          return
        }
        setChecking(false)
        if (!result.ok || !result.data) {
          setCheck(null)
          setError(result.errorMessage ?? "目标路径校验失败")
          return
        }
        setError(null)
        setCheck(result.data)
      })()
    }, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [parentPath, mapping.serverPath])

  const exists = check?.exists === true
  const canConfirm = check != null && !exists && !busy && !checking

  /**
   * 删旧 + 加新调整映射本地路径，成功后回调最新 mappings。
   */
  const handleConfirm = useCallback(async () => {
    if (!check) {
      return
    }
    setBusy(true)
    setError(null)
    const removed = await api.deleteMapping({ serverPath: mapping.serverPath })
    if (!removed.ok) {
      setBusy(false)
      setError(removed.errorMessage ?? "删除原映射失败")
      return
    }
    const added = await api.addMapping({
      serverPath: mapping.serverPath,
      localPath: check.targetPath,
      getLatest: false,
    })
    setBusy(false)
    if (!added.ok) {
      setError(`${added.errorMessage ?? "创建新映射失败"}（原映射已删除，请重新映射）`)
      return
    }
    const mappings = await api.listMappings()
    onChanged(mappings.data?.mappings ?? [])
  }, [check, mapping.serverPath, onChanged])

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>修改本地路径</DialogTitle>
          <DialogDescription className="font-mono text-xs">{mapping.serverPath}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>当前本地路径</Label>
            <p className="rounded-md border bg-muted/40 px-2.5 py-1.5 font-mono text-xs">
              {mapping.localPath}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newParentPath">新的本地父目录</Label>
            <div className="flex gap-2">
              <Input
                id="newParentPath"
                placeholder="/Users/me/tfs"
                value={parentPath}
                onChange={(event) => setParentPath(event.target.value)}
                disabled={busy}
                className="font-mono text-xs"
              />
              {isElectron() && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void handleBrowse()}
                  disabled={busy}
                  aria-label="浏览本地目录"
                >
                  <FolderSearch />
                </Button>
              )}
            </div>
          </div>

          {checking && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              正在校验目标路径…
            </p>
          )}

          {check && !checking && (
            <div className="space-y-1.5">
              <Label>新映射路径</Label>
              <p className="rounded-md border bg-muted/40 px-2.5 py-1.5 font-mono text-xs">
                {check.targetPath}
              </p>
              {exists && (
                <p className="text-xs font-medium text-destructive">目标目录已存在，禁止映射</p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            修改方式为「删除原映射 + 创建新映射」：原本地目录内容保留但不再与服务端关联，
            新目录需重新执行获取最新。
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={!canConfirm}>
            {busy ? "正在修改…" : "修改本地路径"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
