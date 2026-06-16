import type { MappingInfo } from "~/lib/api"

import { isSameOrUnderPath, normalizeServerPath } from "./path"

/**
 * 按最长前缀匹配查找服务端路径所属的 Mapping，未命中返回 null。
 */
export function findMapping(
  mappings: MappingInfo[],
  serverPath: string,
): MappingInfo | null {
  const target = normalizeServerPath(serverPath)
  let matched: MappingInfo | null = null
  for (const mapping of mappings) {
    if (isSameOrUnderPath(mapping.serverPath, target)) {
      if (!matched || mapping.serverPath.length > matched.serverPath.length) {
        matched = mapping
      }
    }
  }
  return matched
}

/**
 * 依据 Mapping 推导服务端路径对应的本地路径，未映射返回 null。
 */
export function resolveLocalPath(
  mappings: MappingInfo[],
  serverPath: string,
): string | null {
  const target = normalizeServerPath(serverPath)
  const mapping = findMapping(mappings, target)
  if (!mapping) {
    return null
  }
  const base = normalizeServerPath(mapping.serverPath)
  if (target === base) {
    return mapping.localPath
  }
  const suffix = target.slice(base.length === 2 ? base.length : base.length + 1)
  const localBase = mapping.localPath.endsWith("/")
    ? mapping.localPath.slice(0, -1)
    : mapping.localPath
  return `${localBase}/${suffix}`
}
