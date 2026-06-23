const { contextBridge, ipcRenderer } = require("electron")

// 仅向渲染进程暴露窄接口，渲染层不直接接触 fs、child_process 或 token 文件。
contextBridge.exposeInMainWorld("mactfs", {
  isElectron: true,
  /**
   * 获取本地 API 基础地址。
   */
  getApiBaseUrl() {
    return ipcRenderer.invoke("mactfs:get-api-base-url")
  },
  /**
   * 获取本地服务 Bearer Token。
   */
  getToken() {
    return ipcRenderer.invoke("mactfs:get-token")
  },
  /**
   * 查询本地 API 服务当前状态。
   */
  getServiceStatus() {
    return ipcRenderer.invoke("mactfs:get-service-status")
  },
  /**
   * 拉起本地 API 服务并等待就绪。
   */
  startService() {
    return ipcRenderer.invoke("mactfs:start-service")
  },
  /**
   * 打开系统目录选择器，返回所选目录路径。
   */
  selectDirectory() {
    return ipcRenderer.invoke("mactfs:select-directory")
  },
  /**
   * 批量检测本地绝对路径是否存在。
   */
  pathsExist(paths) {
    return ipcRenderer.invoke("mactfs:paths-exist", paths)
  },
  /**
   * 在访达中打开：目录直接进入，文件定位并选中。
   */
  revealPath(targetPath, isFolder) {
    return ipcRenderer.invoke("mactfs:reveal-path", targetPath, isFolder)
  },
  /**
   * 查询 MCP 子进程运行状态（含 /healthz 探活）。
   */
  getMcpStatus() {
    return ipcRenderer.invoke("mactfs:get-mcp-status")
  },
  /**
   * 读取 MCP 子进程运行日志（最近 500 行）。
   */
  getMcpLogs() {
    return ipcRenderer.invoke("mactfs:get-mcp-logs")
  },
})
