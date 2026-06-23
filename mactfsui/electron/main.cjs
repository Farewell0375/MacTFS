const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage, protocol } = require("electron")
const path = require("node:path")
const fs = require("node:fs")
const os = require("node:os")
const http = require("node:http")
const { spawn } = require("node:child_process")

const API_HOST = "127.0.0.1"
const API_PORT = 38765
const API_BASE_URL = `http://${API_HOST}:${API_PORT}`
const SERVER_MAIN_CLASS = "com.mydev.mactfs.server.MacTfsServer"
const TOKEN_FILE = path.join(os.homedir(), ".mactfs", "server-token")
// MCP SSE 服务地址：随客户端拉起、随客户端退出回收，实现「客户端开着才能用」的绑定。
const MCP_HOST = "127.0.0.1"
const MCP_PORT = 38766
const MCP_RESTART_DELAY_MS = 2000
const HEALTH_TIMEOUT_MS = 2000
const START_POLL_TIMES = 30
const START_POLL_INTERVAL_MS = 1000

// 自定义协议：以 app://bundle/ 提供前端静态资源。
// 打包后构建产物使用绝对路径(/assets/...)，用 file:// 会指向磁盘根目录导致白屏，故走自定义协议从 build/client 映射。
const APP_SCHEME = "app"
const APP_ORIGIN = `${APP_SCHEME}://bundle/`
const MIME_BY_EXT = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".map": "application/json",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
}

// 必须在 app ready 之前注册自定义协议的特权（标准协议 + 安全上下文）。
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
])

/**
 * 注册 app:// 协议处理器：把请求路径映射到 build/client 下的静态文件，找不到时回退到 index.html（适配前端路由）。
 */
function registerAppProtocol() {
  const clientRoot = path.join(__dirname, "..", "build", "client")
  protocol.handle(APP_SCHEME, async (request) => {
    let relativePath = decodeURIComponent(new URL(request.url).pathname)
    if (!relativePath || relativePath === "/") {
      relativePath = "/index.html"
    }
    let filePath = path.normalize(path.join(clientRoot, relativePath))
    if (!filePath.startsWith(clientRoot) || !fs.existsSync(filePath)) {
      filePath = path.join(clientRoot, "index.html")
    }
    const data = await fs.promises.readFile(filePath)
    const contentType = MIME_BY_EXT[path.extname(filePath).toLowerCase()] || "application/octet-stream"
    return new Response(data, { headers: { "content-type": contentType } })
  })
}

// 记录由本进程拉起的服务端子进程，便于应用退出时回收。
let serverProcess = null
// 记录由本进程拉起的 MCP 子进程；应用退出时一并回收。
let mcpProcess = null
// 标记应用是否正在退出，用于区分「主动退出」与「子进程崩溃需重拉」。
let appQuitting = false

// MCP 运行状态与日志环形缓冲：供「MCP 状态」弹窗展示，最多保留最近 500 行。
const MCP_LOG_MAX_LINES = 500
const MCP_SSE_URL = `http://${MCP_HOST}:${MCP_PORT}/sse`
const MCP_HEALTHZ_URL = `http://${MCP_HOST}:${MCP_PORT}/healthz`
const mcpLogBuffer = []
const mcpLineRemainder = { stdout: "", stderr: "" }
let mcpStartedAt = 0
let mcpRestartCount = 0
let mcpLastExitCode = null
let mcpLastError = null

/**
 * 向环形缓冲追加一行 MCP 日志，超出上限时丢弃最旧的行。
 */
function pushMcpLine(stream, line) {
  if (typeof line !== "string" || line.length === 0) {
    return
  }
  mcpLogBuffer.push({ ts: Date.now(), stream, line })
  if (mcpLogBuffer.length > MCP_LOG_MAX_LINES) {
    mcpLogBuffer.splice(0, mcpLogBuffer.length - MCP_LOG_MAX_LINES)
  }
}

/**
 * 按行切分子进程输出（保留跨 chunk 的半行余量），逐行写入缓冲。
 */
function appendMcpLog(stream, chunk) {
  const combined = (mcpLineRemainder[stream] || "") + chunk.toString()
  const parts = combined.split(/\r?\n/)
  mcpLineRemainder[stream] = parts.pop() || ""
  for (const part of parts) {
    pushMcpLine(stream, part)
  }
}

/**
 * 把残留的半行刷入缓冲（用于进程退出时收尾）。
 */
function flushMcpRemainder() {
  for (const stream of ["stdout", "stderr"]) {
    if (mcpLineRemainder[stream]) {
      pushMcpLine(stream, mcpLineRemainder[stream])
      mcpLineRemainder[stream] = ""
    }
  }
}

/**
 * 探测 MCP 的 /healthz 是否可达，返回 { ok, body? }，不抛异常。
 */
function pingMcpHealthz() {
  return new Promise((resolve) => {
    const request = http.request(MCP_HEALTHZ_URL, { method: "GET", timeout: 1500 }, (response) => {
      let raw = ""
      response.on("data", (chunk) => {
        raw += chunk
      })
      response.on("end", () => {
        if (response.statusCode !== 200) {
          resolve({ ok: false })
          return
        }
        try {
          resolve({ ok: true, body: JSON.parse(raw) })
        } catch (error) {
          resolve({ ok: true })
        }
      })
    })
    request.on("timeout", () => {
      request.destroy()
      resolve({ ok: false })
    })
    request.on("error", () => resolve({ ok: false }))
    request.end()
  })
}

/**
 * 汇总 MCP 当前状态：进程是否在跑、pid、运行时长、重启次数，并探活 /healthz。
 */
async function getMcpStatus() {
  const running = !!(mcpProcess && mcpProcess.exitCode === null)
  const healthz = running ? await pingMcpHealthz() : { ok: false }
  return {
    running,
    healthy: healthz.ok,
    pid: running ? mcpProcess.pid : null,
    sseUrl: MCP_SSE_URL,
    startedAt: mcpStartedAt || null,
    uptimeMs: running && mcpStartedAt ? Date.now() - mcpStartedAt : 0,
    restartCount: mcpRestartCount,
    lastExitCode: mcpLastExitCode,
    lastError: mcpLastError,
    entryResolved: resolveMcpEntry() != null,
  }
}

/**
 * 计算项目根目录，main.cjs 位于 mactfsui/electron 下，上溯两级即为单仓库根目录。
 */
function resolveProjectRoot() {
  return path.resolve(__dirname, "..", "..")
}

// 服务端 JVM 固定使用 x64：TFS 的 JNI 原生库（libnative_*.jnilib）只含 i386/x86_64，无 arm64 切片，
// 用 arm64 JVM 加载会 UnsatisfiedLinkError。Apple Silicon 上 x64 JVM 经 Rosetta 2 运行；
// 服务端是 IO 密集型，Rosetta 开销可接受。UI（Electron）走 universal 原生，已解决界面卡顿。
const PACKAGED_JRE_DIR = "jre-x64"
const DEV_JDK_DIR = "zulu8.94.0.17-ca-jdk8.0.492-macosx_x64"

/**
 * 解析运行服务端使用的 Java 可执行文件：固定 x64 内置 zulu8，其次 JAVA_HOME，最后 PATH 上的 java。
 */
function resolveJavaBin() {
  // 打包态：x64 JRE 随 extraResources 落在 Resources/jre-x64 下。
  if (app.isPackaged) {
    const packaged = path.join(process.resourcesPath, PACKAGED_JRE_DIR, "bin", "java")
    if (fs.existsSync(packaged)) {
      return packaged
    }
    // 兼容旧单架构包结构（Resources/jre）。
    const legacy = path.join(process.resourcesPath, "jre", "bin", "java")
    if (fs.existsSync(legacy)) {
      return legacy
    }
  }
  const projectRoot = resolveProjectRoot()
  const bundled = path.join(projectRoot, DEV_JDK_DIR, "Contents", "Home", "bin", "java")
  if (fs.existsSync(bundled)) {
    return bundled
  }
  if (process.env.JAVA_HOME) {
    const fromHome = path.join(process.env.JAVA_HOME, "bin", "java")
    if (fs.existsSync(fromHome)) {
      return fromHome
    }
  }
  return "java"
}

/**
 * 解析服务端 classpath，优先使用 application 安装包 lib 目录（已包含全部运行依赖）。
 */
function resolveServerClasspath() {
  // 打包态：服务端 jar 随 extraResources 落在 Resources/server/lib 下。
  if (app.isPackaged) {
    const packagedLib = path.join(process.resourcesPath, "server", "lib")
    if (fs.existsSync(packagedLib)) {
      return path.join(packagedLib, "*")
    }
  }
  const installLib = path.join(
    resolveProjectRoot(),
    "mactfs",
    "build",
    "install",
    "mactfs",
    "lib",
  )
  if (fs.existsSync(installLib)) {
    return path.join(installLib, "*")
  }
  return null
}

/**
 * 解析 TFS native 库目录，供 SDK 加载 JNI 库。
 */
function resolveNativeDirectory() {
  // 打包态：JNI native 库随服务端 lib 一起落在 Resources/server/lib/native 下。
  if (app.isPackaged) {
    const packagedNative = path.join(process.resourcesPath, "server", "lib", "native")
    if (fs.existsSync(packagedNative)) {
      return packagedNative
    }
  }
  const projectRoot = resolveProjectRoot()
  const installNative = path.join(
    projectRoot,
    "mactfs",
    "build",
    "install",
    "mactfs",
    "lib",
    "native",
  )
  if (fs.existsSync(installNative)) {
    return installNative
  }
  const libNative = path.join(projectRoot, "tfsIntegration", "lib", "native")
  if (fs.existsSync(libNative)) {
    return libNative
  }
  return null
}

/**
 * 读取本地 Bearer Token，渲染进程不直接访问 token 文件，统一由主进程提供。
 */
function readToken() {
  try {
    const value = fs.readFileSync(TOKEN_FILE, "utf8").trim()
    return value.length > 0 ? value : null
  } catch (error) {
    return null
  }
}

/**
 * 延时辅助函数，用于轮询等待服务端就绪。
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 调用 /api/health 检查本地服务是否就绪，返回结构化服务状态。
 */
function checkHealth() {
  return new Promise((resolve) => {
    const token = readToken()
    const base = {
      running: false,
      baseUrl: API_BASE_URL,
      tokenAvailable: token != null,
      health: null,
      error: null,
    }
    if (!token) {
      resolve({ ...base, error: "未找到本地服务 token，服务可能尚未启动" })
      return
    }
    const request = http.request(
      `${API_BASE_URL}/api/health`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        timeout: HEALTH_TIMEOUT_MS,
      },
      (response) => {
        let raw = ""
        response.on("data", (chunk) => {
          raw += chunk
        })
        response.on("end", () => {
          if (response.statusCode !== 200) {
            resolve({ ...base, error: `服务返回状态码 ${response.statusCode}` })
            return
          }
          try {
            const payload = JSON.parse(raw)
            resolve({
              ...base,
              running: payload.success === true,
              health: payload.data || null,
            })
          } catch (error) {
            resolve({ ...base, error: "服务健康检查响应解析失败" })
          }
        })
      },
    )
    request.on("timeout", () => {
      request.destroy()
      resolve({ ...base, error: "服务健康检查超时" })
    })
    request.on("error", (error) => {
      resolve({ ...base, error: `无法连接本地服务：${error.message}` })
    })
    request.end()
  })
}

/**
 * 按本地开发约定拉起 mactfs-server，并轮询等待服务就绪。
 */
async function startService() {
  const current = await checkHealth()
  if (current.running) {
    return current
  }
  const classpath = resolveServerClasspath()
  if (!classpath) {
    return {
      ...current,
      error:
        "未找到服务端构建产物，请先在 mactfs 目录执行 ../tfsIntegration/gradlew installDist",
    }
  }
  if (!serverProcess || serverProcess.exitCode !== null) {
    const args = ["-cp", classpath]
    const nativeDirectory = resolveNativeDirectory()
    if (nativeDirectory) {
      args.push(`-Dcom.microsoft.tfs.jni.native.base-directory=${nativeDirectory}`)
    }
    args.push(SERVER_MAIN_CLASS)
    serverProcess = spawn(resolveJavaBin(), args, {
      cwd: app.isPackaged ? process.resourcesPath : path.join(resolveProjectRoot(), "mactfs"),
      stdio: "ignore",
    })
    serverProcess.on("exit", () => {
      serverProcess = null
    })
  }
  for (let attempt = 0; attempt < START_POLL_TIMES; attempt += 1) {
    await delay(START_POLL_INTERVAL_MS)
    const status = await checkHealth()
    if (status.running) {
      return status
    }
  }
  return {
    ...current,
    error: "服务启动超时，请检查 JDK 与服务端构建产物",
  }
}

/**
 * 解析 MCP 入口脚本：打包态优先 Resources/mcp，开发态用单仓库内 mactfs-mcp/dist。
 */
function resolveMcpEntry() {
  if (app.isPackaged) {
    // 打包态：esbuild 单文件包随 extraResources 落在 Resources/mcp/index.cjs。
    const packaged = path.join(process.resourcesPath, "mcp", "index.cjs")
    if (fs.existsSync(packaged)) {
      return packaged
    }
  }
  // 开发态：tsc 产物（ESM + node_modules）。
  const dev = path.join(resolveProjectRoot(), "mactfs-mcp", "dist", "index.js")
  if (fs.existsSync(dev)) {
    return dev
  }
  return null
}

/**
 * 拉起 MCP 子进程（用 Electron 自带 Node 运行，避免依赖系统 node）。
 * 通过 MACTFS_PARENT_PID 让 MCP 看护父进程，父死则自杀；崩溃后自动重拉。
 */
function startMcp() {
  if (mcpProcess && mcpProcess.exitCode === null) {
    return
  }
  const entry = resolveMcpEntry()
  if (!entry) {
    mcpLastError = "未找到 MCP 入口（开发态请先在 mactfs-mcp 执行 pnpm build）"
    pushMcpLine("stderr", `[mactfs] ${mcpLastError}`)
    console.error(`[mactfs] ${mcpLastError}`)
    return
  }
  mcpLastError = null
  mcpStartedAt = Date.now()
  // stdout/stderr 改为管道捕获，写入环形缓冲供 UI 查看（原来是 ignore，日志被丢弃）。
  mcpProcess = spawn(process.execPath, [entry], {
    cwd: path.dirname(entry),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      MACTFS_PARENT_PID: String(process.pid),
      MACTFS_API_BASE_URL: API_BASE_URL,
      MACTFS_TOKEN_FILE: TOKEN_FILE,
      MACTFS_MCP_PORT: String(MCP_PORT),
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
  pushMcpLine("stdout", `[mactfs] 已拉起 MCP 子进程 pid=${mcpProcess.pid}`)
  if (mcpProcess.stdout) {
    mcpProcess.stdout.on("data", (chunk) => appendMcpLog("stdout", chunk))
  }
  if (mcpProcess.stderr) {
    mcpProcess.stderr.on("data", (chunk) => appendMcpLog("stderr", chunk))
  }
  mcpProcess.on("error", (error) => {
    mcpLastError = error.message
    pushMcpLine("stderr", `[mactfs] MCP 子进程启动失败：${error.message}`)
  })
  mcpProcess.on("exit", (code, signal) => {
    flushMcpRemainder()
    mcpLastExitCode = code
    mcpProcess = null
    pushMcpLine("stderr", `[mactfs] MCP 子进程退出 code=${code} signal=${signal ?? ""}`)
    if (!appQuitting) {
      mcpRestartCount += 1
      setTimeout(startMcp, MCP_RESTART_DELAY_MS)
    }
  })
}

/**
 * 批量检测本地绝对路径是否存在，供渲染层展示“已映射未下载”状态。
 */
function pathsExist(paths) {
  const result = {}
  if (!Array.isArray(paths)) {
    return result
  }
  for (const target of paths) {
    if (typeof target === "string" && target.length > 0) {
      result[target] = fs.existsSync(target)
    }
  }
  return result
}

/**
 * 注册渲染进程通过 preload 调用的窄接口，集中暴露 token、服务状态与目录选择能力。
 */
function registerIpcHandlers() {
  ipcMain.handle("mactfs:get-api-base-url", () => API_BASE_URL)
  ipcMain.handle("mactfs:get-token", () => readToken())
  ipcMain.handle("mactfs:get-service-status", () => checkHealth())
  ipcMain.handle("mactfs:start-service", () => startService())
  ipcMain.handle("mactfs:get-mcp-status", () => getMcpStatus())
  ipcMain.handle("mactfs:get-mcp-logs", () => mcpLogBuffer.slice())
  ipcMain.handle("mactfs:select-directory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })
  ipcMain.handle("mactfs:paths-exist", (event, paths) => pathsExist(paths))
  ipcMain.handle("mactfs:reveal-path", async (event, targetPath, isFolder) => {
    if (typeof targetPath !== "string" || targetPath.length === 0 || !fs.existsSync(targetPath)) {
      return false
    }
    // 目录直接进入访达中的该目录，文件则在访达中定位并选中。
    if (isFolder) {
      const error = await shell.openPath(targetPath)
      return error === ""
    }
    shell.showItemInFolder(targetPath)
    return true
  })
}

/**
 * 解析应用图标路径：开发态用 public/logo.png，打包态用构建产物中的 logo.png。
 */
function resolveAppIcon() {
  const candidates = [
    path.join(__dirname, "..", "public", "logo.png"),
    path.join(__dirname, "..", "build", "client", "logo.png"),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }
  return null
}

/**
 * 创建 Electron 主窗口，开发环境加载本地服务，生产环境加载构建后的静态页面。
 */
function createWindow() {
  const iconPath = resolveAppIcon()
  const isMac = process.platform === "darwin"
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 640,
    title: "MacTFS",
    // 预设背景并延迟显示，避免启动白闪；macOS 下背景透明以透出 vibrancy 毛玻璃。
    show: false,
    backgroundColor: isMac ? "#00000000" : "#f9f9fa",
    // macOS 隐藏系统标题栏 + 窗口级毛玻璃材质；其它平台回退系统标题栏与实色背景。
    ...(isMac
      ? {
          titleBarStyle: "hiddenInset",
          trafficLightPosition: { x: 16, y: 16 },
          vibrancy: "sidebar",
          visualEffectState: "followWindow",
        }
      : {}),
    ...(iconPath ? { icon: nativeImage.createFromPath(iconPath) } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once("ready-to-show", () => {
    // 启动即铺满当前屏幕可视区域（保留程序坞与菜单栏，非独立全屏 Space）。
    mainWindow.maximize()
    mainWindow.show()
  })

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173")
    return
  }

  // 生产/打包态走自定义协议，保证前端的绝对资源路径(/assets/...)可被正确解析。
  mainWindow.loadURL(APP_ORIGIN)
}

app.setName("MacTFS")

app.whenReady().then(() => {
  // macOS 程序坞图标在开发态需要显式设置（BrowserWindow icon 仅对 Windows / Linux 生效）。
  const iconPath = resolveAppIcon()
  if (process.platform === "darwin" && iconPath && app.dock) {
    app.dock.setIcon(nativeImage.createFromPath(iconPath))
  }
  registerAppProtocol()
  registerIpcHandlers()
  createWindow()
  // 随客户端拉起 MCP；它会自行等待后端就绪，端口随客户端退出而消失。
  startMcp()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

// 应用退出时回收由本进程拉起的服务端与 MCP，避免遗留孤儿进程。
app.on("will-quit", () => {
  appQuitting = true
  if (mcpProcess && mcpProcess.exitCode === null) {
    mcpProcess.kill()
    mcpProcess = null
  }
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill()
    serverProcess = null
  }
})
