import { useCallback, useEffect, useState, type ChangeEvent } from "react"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { api } from "~/lib/api"
import type { AppConfig, Collection } from "~/lib/api"
import type { WorkspaceSession } from "~/lib/tfs/session"
import { cn } from "~/lib/utils"

// 连接阶段：填写连接信息 / 确认 Collection。
type ConnectPhase = "form" | "collection"

// 连接表单字段，第一版仅支持显式 NTLM 账号密码。
interface ConnectFormState {
  serverUri: string
  domain: string
  username: string
  password: string
}

const EMPTY_FORM: ConnectFormState = {
  serverUri: "",
  domain: "",
  username: "",
  password: "",
}

/**
 * 连接入口：连接 TFS、加载并确认 Collection、确保默认 Workspace，成功后回调固定上下文。
 */
export function ConnectView({ onReady }: { onReady: (session: WorkspaceSession) => void }) {
  const [phase, setPhase] = useState<ConnectPhase>("form")
  const [form, setForm] = useState<ConnectFormState>(EMPTY_FORM)
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollection, setSelectedCollection] = useState("")
  const [busy, setBusy] = useState(false)
  const [busyText, setBusyText] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      const result = await api.getConfig()
      if (!active) {
        return
      }
      const config = result.data?.config
      if (config) {
        setForm((prev) => ({
          serverUri: config.serverUri ?? prev.serverUri,
          domain: config.domain ?? prev.domain,
          username: config.username ?? prev.username,
          password: config.password ?? prev.password,
        }))
        if (config.collection) {
          setSelectedCollection(config.collection)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [])

  /**
   * 生成受控输入框的 onChange 处理器。
   */
  const updateField = (key: keyof ConnectFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  /**
   * 连接 TFS 并加载当前账号可见的 Collection 列表。
   */
  const handleConnect = useCallback(async () => {
    setError(null)
    setBusy(true)
    setBusyText("正在连接 TFS…")
    const payload: Partial<AppConfig> = {
      serverUri: form.serverUri.trim(),
      authType: "ntlm-explicit",
      domain: form.domain.trim(),
      username: form.username.trim(),
      password: form.password,
    }
    const connectResult = await api.connect(payload)
    if (!connectResult.ok) {
      setBusy(false)
      setError(connectResult.errorMessage ?? "连接失败")
      return
    }
    setBusyText("正在加载 Collection…")
    const collectionsResult = await api.listCollections()
    setBusy(false)
    if (!collectionsResult.ok) {
      setError(collectionsResult.errorMessage ?? "加载 Collection 失败")
      return
    }
    const list = collectionsResult.data?.collections ?? []
    setCollections(list)
    setSelectedCollection((prev) =>
      list.some((item) => item.name === prev) ? prev : list[0]?.name ?? "",
    )
    setPhase("collection")
  }, [form])

  /**
   * 确认 Collection 后确保默认 Workspace，并把固定上下文回调给上层。
   */
  const handleEnter = useCallback(async () => {
    if (!selectedCollection) {
      return
    }
    setError(null)
    setBusy(true)
    setBusyText("正在确保默认 Workspace…")
    const ensureResult = await api.ensureWorkspace({ collection: selectedCollection })
    setBusy(false)
    const workspace = ensureResult.data?.workspace
    if (!ensureResult.ok || !workspace) {
      setError(ensureResult.errorMessage ?? "确保 Workspace 失败")
      return
    }
    onReady({
      serverUri: form.serverUri.trim(),
      collection: selectedCollection,
      workspace: workspace.name,
      mappings: workspace.mappings ?? [],
    })
  }, [selectedCollection, form.serverUri, onReady])

  const canConnect =
    form.serverUri.trim().length > 0 &&
    form.username.trim().length > 0 &&
    form.password.length > 0

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-base font-semibold">macTFS</h1>
          <p className="text-sm text-muted-foreground">
            {phase === "form" ? "连接 TFS 服务器" : "选择 Collection"}
          </p>
        </div>

        {phase === "form" && (
          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (canConnect && !busy) {
                void handleConnect()
              }
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="serverUri">服务器地址</Label>
              <Input
                id="serverUri"
                placeholder="http://tfs.example.com:8080/tfs"
                value={form.serverUri}
                onChange={updateField("serverUri")}
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="domain">域（可选）</Label>
              <Input
                id="domain"
                placeholder="DOMAIN"
                value={form.domain}
                onChange={updateField("domain")}
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                autoComplete="username"
                value={form.username}
                onChange={updateField("username")}
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={updateField("password")}
                disabled={busy}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={!canConnect || busy}>
              {busy ? busyText || "处理中…" : "连接 TFS"}
            </Button>
          </form>
        )}

        {phase === "collection" && (
          <div className="mt-5 space-y-4">
            {collections.length === 0 ? (
              <p className="text-sm text-muted-foreground">当前账号没有可见的 Collection。</p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {collections.map((collection) => {
                  const active = collection.name === selectedCollection
                  return (
                    <li key={collection.id || collection.name}>
                      <button
                        type="button"
                        onClick={() => setSelectedCollection(collection.name)}
                        disabled={busy}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
                          active
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background hover:bg-muted",
                        )}
                      >
                        <span className="font-medium">{collection.name}</span>
                        {active && <span className="text-xs text-primary">已选择</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setError(null)
                  setPhase("form")
                }}
                disabled={busy}
              >
                返回
              </Button>
              <Button
                type="button"
                onClick={() => void handleEnter()}
                disabled={busy || !selectedCollection}
              >
                {busy ? busyText || "处理中…" : "进入工作台"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
