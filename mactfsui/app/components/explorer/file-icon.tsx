import {
  Database,
  File,
  FileArchive,
  FileCode,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileTerminal,
  FileText,
  FolderClosed,
  FolderOpen,
  FolderSymlink,
  type LucideIcon,
} from "lucide-react"

import { cn } from "~/lib/utils"

// 扩展名 -> 图标与配色的映射规则，未命中走默认文件图标。
const FILE_ICON_RULES: { exts: string[]; icon: LucideIcon; className: string }[] = [
  {
    exts: ["ts", "tsx", "js", "jsx", "java", "cs", "py", "go", "rs", "c", "cpp", "h", "vue", "css", "scss", "html"],
    icon: FileCode,
    className: "text-blue-600",
  },
  {
    exts: ["json", "xml", "yml", "yaml", "toml", "config", "properties", "gradle"],
    icon: FileJson,
    className: "text-amber-600",
  },
  {
    exts: ["md", "txt", "doc", "docx", "pdf", "rtf"],
    icon: FileText,
    className: "text-zinc-500",
  },
  {
    exts: ["sql", "db"],
    icon: Database,
    className: "text-violet-600",
  },
  {
    exts: ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "icns"],
    icon: FileImage,
    className: "text-emerald-600",
  },
  {
    exts: ["zip", "rar", "7z", "tar", "gz", "jar"],
    icon: FileArchive,
    className: "text-orange-600",
  },
  {
    exts: ["xls", "xlsx", "csv"],
    icon: FileSpreadsheet,
    className: "text-green-600",
  },
  {
    exts: ["sh", "bat", "cmd", "ps1", "zsh"],
    icon: FileTerminal,
    className: "text-zinc-600",
  },
]

/**
 * 取文件名扩展名（小写，无点）；无扩展名返回空串。
 */
function extOf(name: string): string {
  const index = name.lastIndexOf(".")
  return index > 0 ? name.slice(index + 1).toLowerCase() : ""
}

/**
 * 文件 / 文件夹图标：文件按扩展名区分图标与配色，
 * 文件夹区分普通（蓝色）与已映射（FolderSymlink 主色），展开态用 FolderOpen。
 */
export function FileIcon({
  name,
  folder,
  mapped = false,
  expanded = false,
  className,
}: {
  name: string
  folder: boolean
  mapped?: boolean
  expanded?: boolean
  className?: string
}) {
  if (folder) {
    const Icon = mapped ? FolderSymlink : expanded ? FolderOpen : FolderClosed
    return (
      <Icon
        className={cn(
          "size-3.5 shrink-0",
          mapped ? "text-primary" : "text-sky-600",
          className,
        )}
      />
    )
  }
  const rule = FILE_ICON_RULES.find((item) => item.exts.includes(extOf(name)))
  const Icon = rule?.icon ?? File
  return (
    <Icon
      className={cn(
        "size-3.5 shrink-0",
        rule?.className ?? "text-muted-foreground",
        className,
      )}
    />
  )
}
