const { app, BrowserWindow, dialog, ipcMain } = require("electron")
const { spawn } = require("node:child_process")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")

const API_BASE_URL = "http://127.0.0.1:38765"
const HEALTH_URL = `${API_BASE_URL}/api/health`
const TOKEN_FILE = path.join(os.homedir(), ".mactfs", "server-token")
const MACTFS_DIRECTORY = path.resolve(__dirname, "../../mactfs")
const RUN_SERVER_SCRIPT = path.resolve(__dirname, "../../mactfs/run-server.sh")
const BUNDLED_JDK_HOME = path.resolve(
  __dirname,
  "../../zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home"
)
let serviceStartAttempted = false
let serviceStartError = ""

/**
 * 创建 Electron 主窗口，开发环境加载本地服务，生产环境加载构建后的静态页面。
 */
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  })

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173")
    return
  }

  mainWindow.loadFile(path.join(__dirname, "../build/client/index.html"))
}

/**
 * 读取 Java API 服务生成的本地 Bearer token，供 preload 和 health 检查复用。
 */
function readServerToken() {
  if (!fs.existsSync(TOKEN_FILE)) {
    return ""
  }

  return fs.readFileSync(TOKEN_FILE, "utf8").trim()
}

/**
 * 调用本地 API health 接口，确认服务、token 和连接状态是否可用。
 */
async function checkServiceHealth() {
  const token = readServerToken()
  if (!token) {
    return {
      baseUrl: API_BASE_URL,
      running: false,
      connected: false,
      message: "未找到本地 API token，正在尝试启动服务。",
      tokenFile: TOKEN_FILE,
    }
  }

  try {
    const response = await fetch(HEALTH_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    const result = await response.json()

    if (!response.ok || !result.success) {
      return {
        baseUrl: API_BASE_URL,
        running: false,
        connected: false,
        message:
          result.errorMessage || result.message || "本地 API health 检查失败。",
        tokenFile: TOKEN_FILE,
      }
    }

    return {
      baseUrl: API_BASE_URL,
      running: true,
      connected: Boolean(result.data.connected),
      message: result.message || "ok",
      tokenFile: result.data.tokenFile || TOKEN_FILE,
      configFile: result.data.configFile,
      javaArch: result.data.javaArch,
      nativeCompatible: result.data.nativeCompatible,
    }
  } catch (error) {
    return {
      baseUrl: API_BASE_URL,
      running: false,
      connected: false,
      message: error instanceof Error ? error.message : "本地 API 服务未响应。",
      tokenFile: TOKEN_FILE,
    }
  }
}

/**
 * 在开发环境下通过已有 Gradle runServer 任务拉起本地 Java API 服务。
 */
function startLocalService() {
  if (serviceStartAttempted) {
    return
  }

  serviceStartAttempted = true
  if (!fs.existsSync(RUN_SERVER_SCRIPT)) {
    serviceStartError = `未找到后端启动脚本：${RUN_SERVER_SCRIPT}`
    return
  }
  if (!fs.existsSync(path.join(BUNDLED_JDK_HOME, "bin", "java"))) {
    serviceStartError = `未找到项目内置 JDK：${BUNDLED_JDK_HOME}`
    return
  }

  const child = spawn(RUN_SERVER_SCRIPT, [], {
    cwd: MACTFS_DIRECTORY,
    detached: true,
    env: serviceEnvironment(),
    stdio: "ignore",
  })

  child.on("error", (error) => {
    serviceStartError = error.message
  })
  child.unref()
}

/**
 * TFS SDK 随带的 macOS JNI 库只有 x86_64，没有 arm64；Apple Silicon 下必须通过 Rosetta 启动 Java。
 */
function shouldUseRosettaJava() {
  return process.platform === "darwin" && process.arch === "arm64"
}

/**
 * 固定本项目随带的 x64 Zulu JDK，避免 Electron 继承系统 arm64 Java 导致 TFS JNI 加载失败。
 */
function serviceEnvironment() {
  return {
    ...process.env,
    JAVA_HOME: BUNDLED_JDK_HOME,
    PATH: `${path.join(BUNDLED_JDK_HOME, "bin")}${path.delimiter}${
      process.env.PATH || ""
    }`,
  }
}

/**
 * 等待一小段时间后重试 health，用于覆盖 Java 服务启动过程。
 */
function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * 确保本地 API 服务可用；未运行时先启动，再轮询 health 返回最终状态。
 */
async function ensureServiceStatus() {
  let status = await checkServiceHealth()
  if (status.running) {
    return status
  }

  startLocalService()
  for (let index = 0; index < 30; index += 1) {
    await delay(1000)
    status = await checkServiceHealth()
    if (status.running) {
      return {
        ...status,
        started: true,
      }
    }
  }

  return {
    ...status,
    started: serviceStartAttempted,
    message:
      serviceStartError ||
      (shouldUseRosettaJava()
        ? `本地 API 服务未就绪。请确认 Rosetta 可用，项目内置 JDK 路径为：${BUNDLED_JDK_HOME}`
        : "本地 API 服务未就绪，请确认 Java 8、Gradle 和 TFS 依赖可用。"),
  }
}

/**
 * 打开系统目录选择器，返回用户选择的本地目录。
 */
async function selectDirectory() {
  const window = BrowserWindow.getFocusedWindow()
  const result = await dialog.showOpenDialog(window || undefined, {
    properties: ["openDirectory", "createDirectory"],
  })

  return result.canceled ? null : result.filePaths[0]
}

/**
 * 注册 renderer 可调用的最小 Electron 桥接接口。
 */
function registerIpcHandlers() {
  ipcMain.handle("mactfs:get-token", () => readServerToken())
  ipcMain.handle("mactfs:get-service-status", () => ensureServiceStatus())
  ipcMain.handle("mactfs:select-directory", () => selectDirectory())
}

app.whenReady().then(() => {
  registerIpcHandlers()
  ensureServiceStatus()
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
