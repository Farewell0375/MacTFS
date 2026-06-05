const { app, BrowserWindow } = require("electron")
const path = require("node:path")

/**
 * 创建 Electron 主窗口，开发环境加载本地服务，生产环境加载构建后的静态页面。
 */
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
  })

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173")
    return
  }

  mainWindow.loadFile(path.join(__dirname, "../build/client/index.html"))
}

app.whenReady().then(() => {
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
