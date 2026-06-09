import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { AppShell } from "~/components/app/app-shell"
import { Button } from "~/components/ui/button"
import { FolderItemsPanel } from "~/components/explorer/folder-items-panel"
import { PendingChangesPanel } from "~/components/inspector/pending-changes-panel"
import { ServerTreePanel } from "~/components/explorer/server-tree-panel"
import { apiRequest, subscribeApiRequestLogs } from "~/lib/api/client"
import type { ApiRequestLogEntry } from "~/lib/api/client"
import {
  connectSession,
  getConfig,
  listOperationLogs,
} from "~/lib/api/endpoints"
import type {
  ApiResult,
  AppConfig,
  ConnectData,
  HealthData,
  TfsOperationLogEntry,
} from "~/lib/api/types"
import type { ServiceStatus } from "~/lib/electron/bridge"
import { getMactfsBridge } from "~/lib/electron/bridge"

interface ServiceViewState {
  loading: boolean
  serviceStatus?: ServiceStatus
  healthResult?: ApiResult<HealthData>
  errorMessage?: string
}

interface ConnectionForm {
  serverUri: string
  authType: string
  domain: string
  username: string
  password: string
}

const EMPTY_CONNECTION_FORM: ConnectionForm = {
  serverUri: "",
  authType: "ntlm-explicit",
  domain: "",
  username: "",
  password: "",
}

/**
 * 将后端配置转换为表单可直接使用的字符串结构，避免受缺省字段影响。
 */
function toConnectionForm(config?: AppConfig): ConnectionForm {
  return {
    serverUri: config?.serverUri || "",
    authType: config?.authType || "ntlm-explicit",
    domain: config?.domain || "",
    username: config?.username || "",
    password: config?.password || "",
  }
}

export default function Home() {
  const [state, setState] = useState<ServiceViewState>({
    loading: true,
  })
  const [form, setForm] = useState<ConnectionForm>(EMPTY_CONNECTION_FORM)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [connectResult, setConnectResult] = useState<ConnectData>()
  const [preferredCollection, setPreferredCollection] = useState("")
  const [selectedCollection, setSelectedCollection] = useState("")
  const [selectedServerPath, setSelectedServerPath] = useState("")
  const [pendingRefreshKey, setPendingRefreshKey] = useState(0)
  const [workspaceActionKey, setWorkspaceActionKey] = useState("")
  const [selectedMappedItem, setSelectedMappedItem] = useState(false)
  const [operationLogs, setOperationLogs] = useState<ApiRequestLogEntry[]>([])
  const [operationLogsLoading, setOperationLogsLoading] = useState(false)

  /**
   * 先确认服务状态，再读取默认配置并验证自动 token 请求。
   */
  async function loadServiceStatus() {
    setState((currentState) => ({
      ...currentState,
      loading: true,
      errorMessage: undefined,
    }))

    const bridge = getMactfsBridge()
    if (!bridge) {
      setState({
        loading: false,
        errorMessage:
          "未检测到 Electron preload，请通过 Electron 启动 macTFS。",
      })
      return
    }

    const serviceStatus = await bridge.getServiceStatus()
    const healthResult = serviceStatus.running
      ? await apiRequest<HealthData>("/api/health")
      : undefined
    const configResult = serviceStatus.running ? await getConfig() : undefined

    if (configResult?.success) {
      setForm(toConnectionForm(configResult.data.config))
      setPreferredCollection(configResult.data.config.collection || "")
    }

    setState({
      loading: false,
      serviceStatus,
      healthResult,
      errorMessage: configResult?.success
        ? undefined
        : configResult?.errorMessage || configResult?.message,
    })
    setConnected(Boolean(healthResult?.data.connected))
  }

  useEffect(() => {
    return subscribeApiRequestLogs(upsertOperationLog)
  }, [])

  useEffect(() => {
    loadServiceStatus()
  }, [])

  useEffect(() => {
    if (connected) {
      loadOperationLogs()
    }
  }, [connected])

  const serviceReady =
    state.serviceStatus?.running && state.healthResult?.success
  const canConnect = serviceReady && !state.loading && !connecting
  const serviceMessage = serviceReady
    ? "本地 API 已连接。"
    : state.serviceStatus?.message ||
      state.errorMessage ||
      "正在检查本地 API 服务。"
  const requestStatus = state.healthResult?.success
    ? state.healthResult.message
    : state.healthResult?.errorMessage || state.errorMessage || "等待检查"

  /**
   * 更新连接表单字段，保持输入状态与受控表单一致。
   */
  function updateFormField(field: keyof ConnectionForm, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  /**
   * 调用连接 API，成功后进入已连接工作台状态。
   */
  async function handleConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setConnecting(true)
    setConnectResult(undefined)
    setState((currentState) => ({
      ...currentState,
      errorMessage: undefined,
    }))

    const result = await connectSession(form)
    setConnecting(false)

    if (!result.success) {
      setState((currentState) => ({
        ...currentState,
        errorMessage: result.errorMessage || result.message,
      }))
      return
    }

    setConnected(true)
    setConnectResult(result.data)
  }

  /**
   * 触发右侧 Pending Changes 面板重新查询当前 Workspace 状态。
   */
  function refreshPendingChanges() {
    setPendingRefreshKey((currentKey) => currentKey + 1)
  }

  /**
   * 切换主工作区当前路径，并清理上一目录的选中项状态。
   */
  function selectServerPath(path: string) {
    setSelectedMappedItem(false)
    setSelectedServerPath(path)
  }

  /**
   * 触发中间工作区文件操作，顶部工具栏和底部操作区复用同一套执行逻辑。
   */
  function runWorkspaceAction(action: string) {
    setWorkspaceActionKey(`${action}:${Date.now()}`)
  }

  /**
   * 合并统一 API client 推送的请求日志，保留最近 80 条。
   */
  function upsertOperationLog(entry: ApiRequestLogEntry) {
    setOperationLogs((currentLogs) =>
      [entry, ...currentLogs.filter((log) => log.id !== entry.id)].slice(0, 80)
    )
  }

  /**
   * 从服务端读取最近操作日志，补齐当前 UI 会话之前的 API 操作记录。
   */
  async function loadOperationLogs() {
    setOperationLogsLoading(true)
    const result = await listOperationLogs()
    setOperationLogsLoading(false)

    if (!result.success) {
      return
    }

    const serverLogs = result.data.logs.map(toOperationLog).reverse()
    setOperationLogs((currentLogs) => [
      ...currentLogs.filter((log) => log.status === "running"),
      ...serverLogs,
    ].slice(0, 80))
  }

  /**
   * 将后端操作日志转换成底部 Console 的展示结构。
   */
  function toOperationLog(
    entry: TfsOperationLogEntry,
    index: number
  ): ApiRequestLogEntry {
    return {
      id: `server:${entry.startedAt}:${entry.operation}:${index}`,
      operation: entry.operation,
      summary: entry.summary || "-",
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
      durationMs: entry.durationMs,
      success: entry.success,
      errorMessage: entry.errorMessage,
      status: entry.success ? "success" : "error",
    }
  }

  return (
    <div className="min-h-svh bg-muted/40 p-4 text-sm">
      <AppShell
        connected={connected}
        serviceReady={Boolean(serviceReady)}
        serviceLoading={state.loading}
        serverUri={connectResult?.serverUri || form.serverUri}
        username={form.username}
        collectionCount={connectResult?.collectionCount}
        serviceBaseUrl={state.serviceStatus?.baseUrl}
        tokenFile={state.serviceStatus?.tokenFile}
        serviceMessage={serviceMessage}
        requestStatus={requestStatus}
        operationLogs={operationLogs}
        operationLogsLoading={operationLogsLoading}
        workspaceGetLatestEnabled={connected && selectedMappedItem}
        workspaceHistoryEnabled={connected && Boolean(selectedServerPath)}
        sourceList={
          <ServerTreePanel
            connected={connected}
            preferredCollection={preferredCollection}
            onCollectionSelect={setSelectedCollection}
            onPathSelect={selectServerPath}
          />
        }
        inspector={
          <PendingChangesPanel
            connected={connected}
            collection={selectedCollection}
            refreshKey={pendingRefreshKey}
          />
        }
        onRefreshService={loadServiceStatus}
        onRefreshOperationLogs={loadOperationLogs}
        onWorkspaceGetLatest={() => runWorkspaceAction("getLatest")}
        onWorkspaceHistory={() => runWorkspaceAction("history")}
      >
        {connected ? (
          <FolderItemsPanel
            connected={connected}
            collection={selectedCollection}
            serverPath={selectedServerPath}
            actionKey={workspaceActionKey}
            onPendingChangesRefresh={refreshPendingChanges}
            onPathEnter={selectServerPath}
            onSelectedMappedItemChange={setSelectedMappedItem}
          />
        ) : (
          <div className="mx-auto grid w-full max-w-2xl gap-5 p-5">
            <div className="min-w-0">
              <h1 className="text-base font-medium">连接 TFS</h1>
              <p className="mt-1 text-muted-foreground">
                {serviceReady ? "本地 API 已就绪。" : serviceMessage}
              </p>
            </div>

            <form className="grid gap-4" onSubmit={handleConnect}>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  TFS 地址
                </span>
                <input
                  className="h-8 rounded-[6px] border bg-background px-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  value={form.serverUri}
                  required
                  placeholder="http://tfs.example.com:8080/tfs/"
                  onChange={(event) =>
                    updateFormField("serverUri", event.target.value)
                  }
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    认证方式
                  </span>
                  <select
                    className="h-8 rounded-[6px] border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    value={form.authType}
                    onChange={(event) =>
                      updateFormField("authType", event.target.value)
                    }
                  >
                    <option value="ntlm-explicit">NTLM 显式账号密码</option>
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    域
                  </span>
                  <input
                    className="h-8 rounded-[6px] border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    value={form.domain}
                    placeholder="domain"
                    onChange={(event) =>
                      updateFormField("domain", event.target.value)
                    }
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    用户名
                  </span>
                  <input
                    className="h-8 rounded-[6px] border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    value={form.username}
                    required
                    autoComplete="username"
                    onChange={(event) =>
                      updateFormField("username", event.target.value)
                    }
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    密码
                  </span>
                  <input
                    className="h-8 rounded-[6px] border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    type="password"
                    value={form.password}
                    required
                    autoComplete="current-password"
                    onChange={(event) =>
                      updateFormField("password", event.target.value)
                    }
                  />
                </label>
              </div>

              {state.errorMessage && (
                <div className="rounded-[6px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
                  {state.errorMessage}
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={!canConnect}>
                  {connecting && <Loader2 className="animate-spin" />}
                  连接
                </Button>
              </div>
            </form>
          </div>
        )}
      </AppShell>
    </div>
  )
}
