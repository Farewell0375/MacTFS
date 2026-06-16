import { useCallback, useEffect, useState, type ChangeEvent } from "react"
import { Check, Clock3, Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { api } from "~/lib/api"
import type { AppConfig, Collection } from "~/lib/api"
import { getServiceStatus } from "~/lib/electron"
import { loadRecentServers, saveRecentServer, type RecentServer } from "~/lib/recent-servers"
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
 * macOS 风：左侧毛玻璃品牌区（大 logo + 一句话），右侧表单，带分阶段过渡与最近连接。
 */
export function ConnectView({ onReady }: { onReady: (session: WorkspaceSession) => void }) {
  const [phase, setPhase] = useState<ConnectPhase>("form")
  const [form, setForm] = useState<ConnectFormState>(EMPTY_FORM)
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollection, setSelectedCollection] = useState("")
  const [busy, setBusy] = useState(false)
  const [busyText, setBusyText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [recent, setRecent] = useState<RecentServer[]>([])
  const [serviceOk, setServiceOk] = useState<boolean | null>(null)
  // 每次失败自增，作为 key 触发表单抖动动画重放。
  const [shakeCount, setShakeCount] = useState(0)

  useEffect(() => {
    let active = true
    setRecent(loadRecentServers())
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
    void (async () => {
      const status = await getServiceStatus()
      if (active) {
        setServiceOk(status.running)
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
   * 失败统一处理：展示错误条并触发表单抖动。
   */
  const failWith = useCallback((message: string) => {
    setError(message)
    setShakeCount((count) => count + 1)
  }, [])

  /**
   * 用一条最近连接记录填充表单（不含密码）。
   */
  const applyRecent = useCallback((item: RecentServer) => {
    setError(null)
    setForm((prev) => ({
      ...prev,
      serverUri: item.serverUri,
      domain: item.domain,
      username: item.username,
    }))
  }, [])

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
      failWith(connectResult.errorMessage ?? "连接失败")
      return
    }
    setBusyText("正在加载 Collection…")
    const collectionsResult = await api.listCollections()
    setBusy(false)
    if (!collectionsResult.ok) {
      failWith(collectionsResult.errorMessage ?? "加载 Collection 失败")
      return
    }
    setRecent(
      saveRecentServer({
        serverUri: form.serverUri.trim(),
        domain: form.domain.trim(),
        username: form.username.trim(),
      }),
    )
    const list = collectionsResult.data?.collections ?? []
    setCollections(list)
    setSelectedCollection((prev) =>
      list.some((item) => item.name === prev) ? prev : list[0]?.name ?? "",
    )
    setPhase("collection")
  }, [form, failWith])

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
      failWith(ensureResult.errorMessage ?? "确保 Workspace 失败")
      return
    }
    onReady({
      serverUri: form.serverUri.trim(),
      collection: selectedCollection,
      workspace: workspace.name,
      mappings: workspace.mappings ?? [],
    })
  }, [selectedCollection, form.serverUri, onReady, failWith])

  const canConnect =
    form.serverUri.trim().length > 0 &&
    form.username.trim().length > 0 &&
    form.password.length > 0

  return (
    <div className="relative flex min-h-svh">
      {/* 隐藏式标题栏下登录页的窗口拖拽区 */}
      <div className="app-drag absolute inset-x-0 top-0 z-10 h-10" />

      {/* 左侧品牌区：半透明材质（vibrancy 下呈毛玻璃），大 logo + 一句话 */}
      <aside className="relative hidden w-[42%] max-w-md min-w-80 flex-col border-r bg-sidebar md:flex">
        <div className="flex flex-1 flex-col items-center justify-center gap-5 p-10">
          <img src="/logo.png" alt="MacTFS" className="size-24 drop-shadow-2xl" />
          <div className="text-center">
            <p className="text-2xl font-semibold tracking-tight">MacTFS</p>
            <p className="mt-1.5 text-sm text-muted-foreground">macOS 上的 TFS 源码管理工作台</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
          <span
            className={cn(
              "size-1.5 rounded-full",
              serviceOk == null ? "bg-muted-foreground/50" : serviceOk ? "bg-emerald-500" : "bg-red-500",
            )}
          />
          {serviceOk == null
            ? "正在检测本地服务…"
            : serviceOk
              ? "本地服务运行中 · 127.0.0.1:38765"
              : "本地服务未就绪"}
        </div>
      </aside>

      {/* 右侧表单区 */}
      <main className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          {phase === "form" && (
            <div
              key={`form-${shakeCount}`}
              className={cn(
                "animate-in fade-in slide-in-from-left-2 duration-200",
                error != null && "animate-shake",
              )}
            >
              <div className="space-y-1">
                <h1 className="text-xl font-semibold tracking-tight">连接 TFS</h1>
                <p className="text-sm text-muted-foreground">
                  使用域账号连接 Team Foundation Server
                </p>
              </div>

              <form
                className="mt-6 space-y-4"
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
                <div className="grid grid-cols-2 gap-3">
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
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">密码</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="pr-9"
                      value={form.password}
                      onChange={updateField("password")}
                      disabled={busy}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors duration-150 hover:text-foreground"
                      aria-label={showPassword ? "隐藏密码" : "显示密码"}
                    >
                      {showPassword ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={!canConnect || busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {busy ? busyText || "处理中…" : "连接 TFS"}
                </Button>
              </form>

              {recent.length > 0 && (
                <div className="mt-6 space-y-2">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock3 className="size-3.5" />
                    最近连接
                  </p>
                  <ul className="space-y-1.5">
                    {recent.map((item) => (
                      <li key={`${item.serverUri}-${item.username}`}>
                        <button
                          type="button"
                          onClick={() => applyRecent(item)}
                          disabled={busy}
                          className="flex w-full items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-left shadow-card transition-colors duration-150 hover:bg-muted/60"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-mono text-xs">
                              {item.serverUri}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {item.domain ? `${item.domain} \\ ` : ""}
                              {item.username}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-primary">填充</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {phase === "collection" && (
            <div
              key={`collection-${shakeCount}`}
              className={cn(
                "animate-in fade-in slide-in-from-right-4 duration-200",
                error != null && "animate-shake",
              )}
            >
              <div className="space-y-1">
                <h1 className="text-xl font-semibold tracking-tight">选择 Collection</h1>
                <p className="text-sm text-muted-foreground">
                  已连接 <span className="font-mono text-xs">{form.serverUri.trim()}</span>
                </p>
              </div>

              <div className="mt-6 space-y-4">
                {collections.length === 0 ? (
                  <p className="rounded-md border bg-card px-3 py-6 text-center text-sm text-muted-foreground">
                    当前账号没有可见的 Collection。
                  </p>
                ) : (
                  <ul className="max-h-72 space-y-2 overflow-y-auto">
                    {collections.map((collection) => {
                      const active = collection.name === selectedCollection
                      return (
                        <li key={collection.id || collection.name}>
                          <button
                            type="button"
                            onClick={() => setSelectedCollection(collection.name)}
                            disabled={busy}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg border px-3.5 py-3 text-left text-sm transition-colors duration-150",
                              active
                                ? "border-primary/60 bg-primary/5"
                                : "bg-card shadow-card hover:bg-muted/60",
                            )}
                          >
                            <span className={cn(active && "font-medium")}>{collection.name}</span>
                            {active && (
                              <span className="animate-in zoom-in-75 fade-in flex size-4.5 items-center justify-center rounded-full bg-primary text-primary-foreground duration-150">
                                <Check className="size-3" />
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {error && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

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
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    {busy ? busyText || "处理中…" : "进入工作台"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
