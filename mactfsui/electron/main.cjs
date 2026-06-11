const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } = require("electron")
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
const HEALTH_TIMEOUT_MS = 2000
const START_POLL_TIMES = 30
const START_POLL_INTERVAL_MS = 1000

// 记录由本进程拉起的服务端子进程，便于应用退出时回收。
let serverProcess = null

/**
 * 计算项目根目录，main.cjs 位于 mactfsui/electron 下，上溯两级即为单仓库根目录。
 */
function resolveProjectRoot() {
  return path.resolve(__dirname, "..", "..")
}

/**
 * 解析运行服务端使用的 Java 可执行文件，优先项目内置 zulu8，其次 JAVA_HOME，最后 PATH 上的 java。
 */
function resolveJavaBin() {
  const projectRoot = resolveProjectRoot()
  const bundled = path.join(
    projectRoot,
    "zulu8.94.0.17-ca-jdk8.0.492-macosx_x64",
    "Contents",
    "Home",
    "bin",
    "java",
  )
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
      cwd: path.join(resolveProjectRoot(), "mactfs"),
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
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    title: "MacTFS",
    ...(iconPath ? { icon: nativeImage.createFromPath(iconPath) } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173")
    return
  }

  mainWindow.loadFile(path.join(__dirname, "../build/client/index.html"))
}

app.setName("MacTFS")

app.whenReady().then(() => {
  // macOS 程序坞图标在开发态需要显式设置（BrowserWindow icon 仅对 Windows / Linux 生效）。
  const iconPath = resolveAppIcon()
  if (process.platform === "darwin" && iconPath && app.dock) {
    app.dock.setIcon(nativeImage.createFromPath(iconPath))
  }
  registerIpcHandlers()
  createWindow()

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

// 应用退出时回收由本进程拉起的服务端，避免遗留孤儿进程。
app.on("will-quit", () => {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill()
    serverProcess = null
  }
})
