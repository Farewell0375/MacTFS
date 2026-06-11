import { ConfirmDialog } from "~/components/app/confirm-dialog"
import { CompareDialog } from "~/components/explorer/compare-dialog"
import { ConflictDialog } from "~/components/explorer/conflict-dialog"
import { DiffDialog } from "~/components/explorer/diff-dialog"
import { FileViewDialog } from "~/components/explorer/file-view-dialog"
import { GetVersionDialog } from "~/components/explorer/get-version-dialog"
import { HistoryDialog } from "~/components/explorer/history-dialog"
import { MappingDialog } from "~/components/explorer/mapping-dialog"
import { PropertiesDialog } from "~/components/explorer/properties-dialog"
import { RenameDialog } from "~/components/explorer/rename-dialog"
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
  onForceGetConfirmed,
  onGetVersion,
  onRenameConfirmed,
  onRollback,
}: {
  dialog: WorkspaceDialogState
  mappings: MappingInfo[]
  onClose: () => void
  onOpen: (dialog: WorkspaceDialogState) => void
  onFileAction: (target: FileTarget, action: FileActionId) => void
  onMappingCreated: (mappings: MappingInfo[]) => void
  onConflictsResolved: () => void
  onForceGetConfirmed: (serverPath: string, folder: boolean) => Promise<void>
  onGetVersion: (serverPath: string, changeset: number, folder: boolean) => Promise<boolean>
  onRenameConfirmed: (serverPath: string, newName: string) => Promise<boolean>
  onRollback: (serverPath: string, mode: "single" | "toVersion", changeset: number) => Promise<boolean>
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
          onGetVersion={onGetVersion}
          onRollback={onRollback}
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
          changeset={dialog.changeset}
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
    case "properties":
      return <PropertiesDialog target={dialog.target} onClose={onClose} />
    case "rename":
      return (
        <RenameDialog
          serverPath={dialog.serverPath}
          folder={dialog.folder}
          onConfirm={(newName) => onRenameConfirmed(dialog.serverPath, newName)}
          onClose={onClose}
        />
      )
    case "getVersion":
      return (
        <GetVersionDialog
          serverPath={dialog.serverPath}
          folder={dialog.folder}
          onConfirm={(changeset) => onGetVersion(dialog.serverPath, changeset, dialog.folder)}
          onClose={onClose}
        />
      )
    case "confirmForceGet":
      return (
        <ConfirmDialog
          title="强制获取最新"
          description={
            <>
              <p>
                将对 <span className="font-mono text-xs">{dialog.serverPath}</span>{" "}
                强制获取服务器最新版本。
              </p>
              <p className="mt-2 font-medium text-destructive">
                本地未签入的修改会被服务器版本直接覆盖，且无法恢复。确定继续吗？
              </p>
            </>
          }
          confirmLabel="覆盖本地并获取"
          danger
          onConfirm={() => onForceGetConfirmed(dialog.serverPath, dialog.folder)}
          onClose={onClose}
        />
      )
  }
}
