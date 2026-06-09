const { contextBridge, ipcRenderer } = require("electron")

/**
 * 请求主进程返回本地 API Bearer token。
 */
function getToken() {
  return ipcRenderer.invoke("mactfs:get-token")
}

/**
 * 请求主进程确认本地 Java API 服务状态。
 */
function getServiceStatus() {
  return ipcRenderer.invoke("mactfs:get-service-status")
}

/**
 * 请求主进程打开本地目录选择器。
 */
function selectDirectory() {
  return ipcRenderer.invoke("mactfs:select-directory")
}

contextBridge.exposeInMainWorld("mactfs", {
  getToken,
  getServiceStatus,
  selectDirectory,
})
