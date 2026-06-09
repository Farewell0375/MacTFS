import * as React from "react"

import { cn } from "~/lib/utils"

/**
 * 表单字段标签，保持轻量并禁止选中，贴合工具型界面。
 */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-1 text-sm font-medium text-foreground select-none",
        className,
      )}
      {...props}
    />
  )
}

export { Label }
