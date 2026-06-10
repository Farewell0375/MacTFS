import { SERVER_ROOT_PATH } from "./session"

/**
 * 规范化服务端路径：去掉末尾斜杠（根路径 `$/` 除外）。
 */
export function normalizeServerPath(serverPath: string): string {
  let result = serverPath.trim()
  while (result.length > SERVER_ROOT_PATH.length && result.endsWith("/")) {
    result = result.slice(0, -1)
  }
  return result.length === 0 ? SERVER_ROOT_PATH : result
}

/**
 * 取服务端路径的父路径，根路径返回自身。
 */
export function getParentPath(serverPath: string): string {
  const normalized = normalizeServerPath(serverPath)
  if (normalized === SERVER_ROOT_PATH || normalized === "$") {
    return SERVER_ROOT_PATH
  }
  const index = normalized.lastIndexOf("/")
  const parent = normalized.slice(0, index)
  return parent === "$" ? SERVER_ROOT_PATH : parent
}

/**
 * 按从根到父目录的顺序返回路径的全部祖先（不含自身），用于树的同步展开。
 */
export function getAncestorPaths(serverPath: string): string[] {
  const normalized = normalizeServerPath(serverPath)
  const ancestors: string[] = []
  let current = normalized
  while (current !== SERVER_ROOT_PATH) {
    current = getParentPath(current)
    ancestors.unshift(current)
  }
  return ancestors
}

/**
 * 判断 childPath 是否等于 basePath 或位于其子树内。
 */
export function isSameOrUnderPath(basePath: string, childPath: string): boolean {
  const base = normalizeServerPath(basePath)
  const child = normalizeServerPath(childPath)
  if (base === child) {
    return true
  }
  const prefix = base === SERVER_ROOT_PATH ? base : `${base}/`
  return child.startsWith(prefix)
}
