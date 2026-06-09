import { useEffect, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  FileText,
  Folder,
  Loader2,
  RefreshCw,
  RotateCcw,
  Upload,
} from "lucide-react"

import { Button } from "~/components/ui/button"
import { checkin, listPendingChanges, undoFiles } from "~/lib/api/endpoints"
import type {
  PendingChangeStatus,
  TfsPendingChangeInfo,
} from "~/lib/api/types"

interface PendingChangesPanelProps {
  connected: boolean
  collection: string
  refreshKey: number
}

const PENDING_STATUS_LABELS: Record<PendingChangeStatus, string> = {
  pendingEdit: "编辑",
  pendingAdd: "新增",
  pendingDelete: "删除",
  pendingRename: "重命名",
  pending: "挂起",
}

const PENDING_STATUS_CLASSES: Record<PendingChangeStatus, string> = {
  pendingEdit: "border-blue-200 bg-blue-50 text-blue-700",
  pendingAdd: "border-green-200 bg-green-50 text-green-700",
  pendingDelete: "border-red-200 bg-red-50 text-red-700",
  pendingRename: "border-violet-200 bg-violet-50 text-violet-700",
  pending: "border-border bg-muted/30 text-muted-foreground",
}

/**
 * 在 Inspector 中展示当前 Workspace 的 Included / Excluded Pending Changes。
 */
export function PendingChangesPanel({
  connected,
  collection,
  refreshKey,
}: PendingChangesPanelProps) {
  const [pendingChanges, setPendingChanges] = useState<
    TfsPendingChangeInfo[]
  >([])
  const [includedKeys, setIncludedKeys] = useState<string[]>([])
  const [excludedKeys, setExcludedKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [operationKey, setOperationKey] = useState("")
  const [checkinComment, setCheckinComment] = useState("")
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  )
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!connected || !collection) {
      setPendingChanges([])
      setIncludedKeys([])
      setExcludedKeys([])
      setCheckinComment("")
      setCheckinLoading(false)
      setMessageType("success")
      setMessage("")
      return
    }

    loadPendingChanges()
  }, [connected, collection, refreshKey])

  const includedChanges = pendingChanges.filter((change) =>
    includedKeys.includes(toPendingChangeKey(change))
  )
  const excludedChanges = pendingChanges.filter((change) =>
    excludedKeys.includes(toPendingChangeKey(change))
  )
  const collectionReady = connected && Boolean(collection)
  const canCheckin =
    includedChanges.length > 0 &&
    checkinComment.trim().length > 0 &&
    !checkinLoading

  /**
   * 查询后端 pending changes，并保留当前会话内用户移动到 Excluded 的选择。
   */
  async function loadPendingChanges() {
    setLoading(true)
    setMessage("")

    const result = await listPendingChanges({ collection })
    setLoading(false)

    if (!result.success) {
      setPendingChanges([])
      setIncludedKeys([])
      setExcludedKeys([])
      setMessageType("error")
      setMessage(result.errorMessage || result.message)
      return
    }

    const nextChanges = result.data.pendingChanges
    const nextKeys = nextChanges.map(toPendingChangeKey)
    setPendingChanges(nextChanges)
    setExcludedKeys((currentKeys) =>
      currentKeys.filter((currentKey) => nextKeys.includes(currentKey))
    )
    setIncludedKeys((currentKeys) => {
      const knownKeys = new Set([...currentKeys, ...excludedKeys])
      const excludedKeySet = new Set(excludedKeys)
      const includedKeySet = new Set(currentKeys)

      return nextKeys.filter((key) => {
        if (excludedKeySet.has(key)) {
          return false
        }
        return knownKeys.has(key) ? includedKeySet.has(key) : true
      })
    })
  }

  /**
   * 使用服务端路径作为 Pending Change 的会话 key。
   */
  function toPendingChangeKey(change: TfsPendingChangeInfo) {
    return change.serverPath
  }

  /**
   * 将单个挂起更改移动到 Excluded Changes。
   */
  function moveToExcluded(change: TfsPendingChangeInfo) {
    const key = toPendingChangeKey(change)
    setIncludedKeys((currentKeys) =>
      currentKeys.filter((currentKey) => currentKey !== key)
    )
    setExcludedKeys((currentKeys) =>
      currentKeys.includes(key) ? currentKeys : [...currentKeys, key]
    )
  }

  /**
   * 将单个挂起更改移回 Included Changes，后续签入只读取 Included。
   */
  function moveToIncluded(change: TfsPendingChangeInfo) {
    const key = toPendingChangeKey(change)
    setExcludedKeys((currentKeys) =>
      currentKeys.filter((currentKey) => currentKey !== key)
    )
    setIncludedKeys((currentKeys) =>
      currentKeys.includes(key) ? currentKeys : [...currentKeys, key]
    )
  }

  /**
   * 撤销指定 pending change，完成后刷新右侧挂起更改列表。
   */
  async function undoPendingChange(change: TfsPendingChangeInfo) {
    const key = toPendingChangeKey(change)
    setOperationKey(key)
    setMessage("")

    const result = await undoFiles({
      paths: [change.serverPath],
      recursive: change.folder,
    })
    setOperationKey("")

    if (!result.success) {
      setMessage(result.errorMessage || result.message)
      setMessageType("error")
      return
    }

    setMessageType("success")
    setMessage(`Undo 完成，影响 ${result.data.result?.affected ?? 0} 项。`)
    await loadPendingChanges()
  }

  /**
   * 提交 Included Changes，成功后清空 Included 并保留 Excluded 会话状态。
   */
  async function submitIncludedChanges() {
    const comment = checkinComment.trim()
    if (!comment) {
      setMessageType("error")
      setMessage("Comment 必填。")
      return
    }
    if (includedChanges.length === 0) {
      setMessageType("error")
      setMessage("没有可签入的 Included Changes。")
      return
    }

    setCheckinLoading(true)
    setMessage("")

    const result = await checkin({
      serverPaths: includedChanges.map((change) => change.serverPath),
      comment,
    })
    setCheckinLoading(false)

    if (!result.success) {
      setMessageType("error")
      setMessage(result.errorMessage || result.message)
      return
    }

    setCheckinComment("")
    await loadPendingChanges()
    setIncludedKeys([])
    setMessageType("success")
    setMessage(
      `Checkin 成功，changeset ${result.data.checkin?.changeset ?? "-"}，提交 ${result.data.checkin?.submittedChanges ?? 0} 项。`
    )
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">Pending Changes</div>
          <div className="text-xs text-muted-foreground">
            签入范围：Included Changes
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-[6px] border px-1.5 py-0.5 text-xs text-muted-foreground">
            {pendingChanges.length} 项
          </span>
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={!collectionReady || loading || checkinLoading}
            title="刷新挂起更改"
            onClick={loadPendingChanges}
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
          </Button>
        </div>
      </div>

      {!collectionReady ? (
        <div className="rounded-[6px] border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {connected ? "请选择 Collection" : "未连接"}
        </div>
      ) : (
        <>
          {message && (
            <div
              className={`rounded-[6px] border px-3 py-2 text-xs ${
                messageType === "error"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "bg-muted/20 text-muted-foreground"
              }`}
            >
              {message}
            </div>
          )}

          <PendingChangeGroup
            title="Included Changes"
            changes={includedChanges}
            emptyText={loading ? "正在查询挂起更改" : "暂无 Included Changes"}
            actionTitle="移到 Excluded"
            actionIcon="down"
            operationKey={operationKey}
            disabled={checkinLoading}
            onUndo={undoPendingChange}
            onMove={moveToExcluded}
          />

          <PendingChangeGroup
            title="Excluded Changes"
            changes={excludedChanges}
            emptyText="暂无 Excluded Changes"
            actionTitle="移回 Included"
            actionIcon="up"
            operationKey={operationKey}
            disabled={checkinLoading}
            onUndo={undoPendingChange}
            onMove={moveToIncluded}
          />

          <section className="grid gap-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-muted-foreground">Checkin</span>
              <span className="rounded-[6px] border px-1.5 py-0.5 text-muted-foreground">
                Included {includedChanges.length}
              </span>
            </div>
            <textarea
              className="min-h-20 rounded-[6px] border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              value={checkinComment}
              placeholder="Comment"
              disabled={checkinLoading}
              onChange={(event) => setCheckinComment(event.target.value)}
            />
            <Button
              size="sm"
              disabled={!canCheckin}
              onClick={submitIncludedChanges}
            >
              {checkinLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Upload />
              )}
              Checkin
            </Button>
            <div className="text-xs text-muted-foreground">
              只提交 Included Changes，Excluded 保留在当前 UI 会话。
            </div>
          </section>
        </>
      )}
    </section>
  )
}

interface PendingChangeGroupProps {
  title: string
  changes: TfsPendingChangeInfo[]
  emptyText: string
  actionTitle: string
  actionIcon: "up" | "down"
  operationKey: string
  disabled: boolean
  onUndo(change: TfsPendingChangeInfo): void
  onMove(change: TfsPendingChangeInfo): void
}

/**
 * 渲染 Pending Changes 单个分组，并提供组间移动入口。
 */
function PendingChangeGroup({
  title,
  changes,
  emptyText,
  actionTitle,
  actionIcon,
  operationKey,
  disabled,
  onUndo,
  onMove,
}: PendingChangeGroupProps) {
  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-muted-foreground">{title}</span>
        <span className="rounded-[6px] border px-1.5 py-0.5 text-muted-foreground">
          {changes.length}
        </span>
      </div>

      {changes.length === 0 ? (
        <div className="rounded-[6px] border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="grid max-h-56 gap-2 overflow-auto">
          {changes.map((change) => (
            <div
              key={change.serverPath}
              className="grid gap-1 rounded-[6px] border bg-muted/20 p-2 text-xs"
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  {change.folder ? (
                    <Folder className="size-3.5 shrink-0 text-amber-600" />
                  ) : (
                    <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate font-medium">{change.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    title="Undo"
                    disabled={disabled || operationKey === change.serverPath}
                    onClick={() => onUndo(change)}
                  >
                    {operationKey === change.serverPath ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <RotateCcw />
                    )}
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    title={actionTitle}
                    disabled={disabled || operationKey === change.serverPath}
                    onClick={() => onMove(change)}
                  >
                    {actionIcon === "down" ? <ArrowDown /> : <ArrowUp />}
                  </Button>
                </div>
              </div>

              <div className="truncate font-mono text-[11px] text-muted-foreground">
                {change.serverPath}
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-1">
                <span
                  className={`rounded-[6px] border px-1.5 py-0.5 ${PENDING_STATUS_CLASSES[change.status]}`}
                >
                  {change.status} / {PENDING_STATUS_LABELS[change.status]}
                </span>
                {change.changeType && (
                  <span className="rounded-[6px] border bg-background px-1.5 py-0.5 text-muted-foreground">
                    {change.changeType}
                  </span>
                )}
                <span className="rounded-[6px] border bg-background px-1.5 py-0.5 font-mono text-muted-foreground">
                  v{change.version}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
