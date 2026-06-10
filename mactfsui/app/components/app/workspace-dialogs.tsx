import { CompareDialog } from "~/components/explorer/compare-dialog"
import { ConflictDialog } from "~/components/explorer/conflict-dialog"
import { DiffDialog } from "~/components/explorer/diff-dialog"
import { FileViewDialog } from "~/components/explorer/file-view-dialog"
import { HistoryDialog } from "~/components/explorer/history-dialog"
import { MappingDialog } from "~/components/explorer/mapping-dialog"
import type { WorkspaceDialogState } from "~/hooks/use-file-actions"
import type { MappingInfo } from "~/lib/api"
import type { FileActionId, FileTarget } from "~/lib/tfs"

/**
 * 工作台业务弹窗出口：按编排 hook 的弹窗状态渲染对应弹窗，
 * 自身不持有业务状态，所有回调回流到动作编排层。
 */
export function WorkspaceDialogs({
  dialog,
  mappings,
  onClose,
  onOpen,
  onFileAction,
  onMappingCreated,
  onConflictsResolved,
}: {
  dialog: WorkspaceDialogState
  mappings: MappingInfo[]
  onClose: () => void
  onOpen: (dialog: WorkspaceDialogState) => void
  onFileAction: (target: FileTarget, action: FileActionId) => void
  onMappingCreated: (mappings: MappingInfo[]) => void
  onConflictsResolved: () => void
}) {
  if (!dialog) {
    return null
  }
  switch (dialog.kind) {
    case "mapping":
      return (
        <MappingDialog
          serverPath={dialog.serverPath}
          onClose={onClose}
          onCreated={onMappingCreated}
        />
      )
    case "history":
      return (
        <HistoryDialog
          serverPath={dialog.serverPath}
          folder={dialog.folder}
          onClose={onClose}
          onDiffRevisions={(serverPath, sourceChangeset, targetChangeset) =>
            onOpen({
              kind: "diff",
              request: { mode: "revisions", serverPath, sourceChangeset, targetChangeset },
            })
          }
        />
      )
    case "compare":
      return (
        <CompareDialog
          serverPath={dialog.serverPath}
          mappings={mappings}
          onClose={onClose}
          onFileAction={onFileAction}
        />
      )
    case "viewFile":
      return (
        <FileViewDialog
          serverPath={dialog.serverPath}
          localPath={dialog.localPath}
          onClose={onClose}
        />
      )
    case "diff":
      return <DiffDialog request={dialog.request} onClose={onClose} />
    case "conflicts":
      return (
        <ConflictDialog
          serverPath={dialog.serverPath}
          onClose={onClose}
          onResolved={onConflictsResolved}
        />
      )
  }
}
