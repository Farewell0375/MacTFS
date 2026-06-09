package com.mydev.mactfs.core;

import com.microsoft.tfs.core.TFSConfigurationServer;
import com.microsoft.tfs.core.TFSTeamProjectCollection;
import com.microsoft.tfs.core.clients.framework.configuration.TFSEntitySession;
import com.microsoft.tfs.core.clients.framework.configuration.entities.OrganizationalRootEntity;
import com.microsoft.tfs.core.clients.framework.configuration.entities.ProjectCollectionEntity;
import com.microsoft.tfs.core.clients.framework.configuration.entities.TeamFoundationServerEntity;
import com.microsoft.tfs.core.clients.framework.location.ConnectOptions;
import com.microsoft.tfs.core.clients.versioncontrol.GetItemsOptions;
import com.microsoft.tfs.core.clients.versioncontrol.GetOptions;
import com.microsoft.tfs.core.clients.versioncontrol.GetStatus;
import com.microsoft.tfs.core.clients.versioncontrol.PendChangesOptions;
import com.microsoft.tfs.core.clients.versioncontrol.VersionControlClient;
import com.microsoft.tfs.core.clients.versioncontrol.WorkspaceLocation;
import com.microsoft.tfs.core.clients.versioncontrol.WorkspaceOptions;
import com.microsoft.tfs.core.clients.versioncontrol.exceptions.WorkspaceNotFoundException;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.Change;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.ChangeType;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.Changeset;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.DeletedState;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.ExtendedItem;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.GetRequest;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.Item;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.ItemSet;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.ItemType;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.LockLevel;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.PendingChange;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.PendingSet;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.RecursionType;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.WorkingFolder;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.Workspace;
import com.microsoft.tfs.core.clients.versioncontrol.specs.ItemSpec;
import com.microsoft.tfs.core.clients.versioncontrol.specs.version.ChangesetVersionSpec;
import com.microsoft.tfs.core.clients.versioncontrol.specs.version.LatestVersionSpec;
import com.microsoft.tfs.core.clients.versioncontrol.specs.version.VersionSpec;
import com.microsoft.tfs.core.httpclient.Credentials;
import com.microsoft.tfs.core.httpclient.DefaultNTCredentials;
import com.microsoft.tfs.core.httpclient.UsernamePasswordCredentials;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * macTFS 核心服务层，封装 TFS 连接、目录、Workspace、文件操作、历史和 Diff 能力。
 */
public class MacTfsCoreService {

    private static final int HISTORY_LIMIT = 100;
    private static final Charset TEXT_CHARSET = Charset.forName("UTF-8");
    private static final long MAX_RENDER_BYTES = 5L * 1024L * 1024L;

    /**
     * 验证 TFS 地址和账号可用性，并返回当前账号可见 Collection 数量。
     */
    public CoreOperationResult<ConnectionSummary> testConnection(final TfsConnectionConfig config) {
        return execute("testConnection", new CoreCallable<ConnectionSummary>() {
            @Override
            public ConnectionSummary call(List<String> logs) throws Exception {
                TFSConfigurationServer configurationServer = connectConfigurationServer(config);
                ProjectCollectionEntity[] collections = loadServerEntity(configurationServer).getProjectCollections();
                logs.add("Login success");
                logs.add("Server URI: " + require(config.getServerUri(), "serverUri"));
                logs.add("Visible collections: " + collections.length);
                return new ConnectionSummary(config.getServerUri(), collections.length);
            }
        });
    }

    /**
     * 查询当前账号在配置服务器下可见的 Collection 列表。
     */
    public CoreOperationResult<List<TfsCollectionInfo>> listCollections(final TfsConnectionConfig config) {
        return execute("listCollections", new CoreCallable<List<TfsCollectionInfo>>() {
            @Override
            public List<TfsCollectionInfo> call(List<String> logs) throws Exception {
                TFSConfigurationServer configurationServer = connectConfigurationServer(config);
                ProjectCollectionEntity[] collections = loadServerEntity(configurationServer).getProjectCollections();
                List<TfsCollectionInfo> result = new ArrayList<TfsCollectionInfo>();
                logs.add("Login success");
                logs.add("Collections loaded: " + collections.length);
                for (ProjectCollectionEntity collection : collections) {
                    result.add(new TfsCollectionInfo(collection.getDisplayName(), String.valueOf(collection.getInstanceID())));
                    logs.add("Collection: " + collection.getDisplayName());
                }
                return result;
            }
        });
    }

    /**
     * 浏览指定 Collection 下的服务端目录，返回 path 下一级文件和文件夹。
     */
    public CoreOperationResult<List<TfsServerItem>> browseServerPath(final TfsConnectionConfig config,
                                                                    final String collectionName,
                                                                    final String serverPath) {
        return execute("browseServerPath", new CoreCallable<List<TfsServerItem>>() {
            @Override
            public List<TfsServerItem> call(List<String> logs) throws Exception {
                CoreConnection connection = connectCollection(config, collectionName);
                String normalizedPath = normalizeServerPath(emptyToDefault(serverPath, "$/"));
                ItemSet itemSet = connection.versionControlClient.getItems(
                    normalizedPath,
                    LatestVersionSpec.INSTANCE,
                    RecursionType.ONE_LEVEL,
                    DeletedState.NON_DELETED,
                    ItemType.ANY
                );
                List<TfsServerItem> result = toServerItems(normalizedPath, itemSet);
                logs.add("Collection: " + collectionName);
                logs.add("Browse path: " + normalizedPath);
                logs.add("Server items loaded: " + result.size());
                return result;
            }
        });
    }

    /**
     * 查询或创建 Collection 默认 Workspace，未传名称时按 macTFS 规则生成。
     */
    public CoreOperationResult<TfsWorkspaceInfo> ensureWorkspace(final TfsConnectionConfig config,
                                                                final String collectionName,
                                                                final String workspaceName,
                                                                final String comment) {
        return execute("ensureWorkspace", new CoreCallable<TfsWorkspaceInfo>() {
            @Override
            public TfsWorkspaceInfo call(List<String> logs) throws Exception {
                CoreConnection connection = connectCollection(config, collectionName);
                String ownerName = connection.collection.getAuthorizedAccountName();
                String computerName = resolveComputerName();
                String actualName = workspaceName == null || workspaceName.trim().isEmpty()
                    ? buildWorkspaceName(collectionName, config.getUsername(), computerName)
                    : workspaceName.trim();
                Workspace workspace = findRepositoryWorkspace(connection.versionControlClient, actualName, ownerName);
                boolean created = workspace == null;
                if (created) {
                    workspace = createWorkspace(connection.versionControlClient, actualName, computerName, comment);
                }
                logs.add(created ? "Workspace created: " + workspace.getName() : "Workspace reused: " + workspace.getName());
                return toWorkspaceInfo(workspace, created);
            }
        });
    }

    /**
     * 查询当前 Workspace 已保存的 Working Folder Mapping。
     */
    public CoreOperationResult<List<TfsMappingInfo>> listMappings(final TfsConnectionConfig config,
                                                                 final String collectionName,
                                                                 final String workspaceName) {
        return execute("listMappings", new CoreCallable<List<TfsMappingInfo>>() {
            @Override
            public List<TfsMappingInfo> call(List<String> logs) throws Exception {
                Workspace workspace = loadWorkspace(config, collectionName, workspaceName);
                List<TfsMappingInfo> mappings = toMappings(workspace.getFolders());
                logs.add("Mappings loaded: " + mappings.size());
                return mappings;
            }
        });
    }

    /**
     * 添加或更新一条 Mapping，并在保存前检查 serverPath/localPath 冲突。
     */
    public CoreOperationResult<TfsMappingInfo> addMapping(final TfsConnectionConfig config,
                                                         final String collectionName,
                                                         final String workspaceName,
                                                         final String serverPath,
                                                         final String localPath) {
        return execute("addMapping", new CoreCallable<TfsMappingInfo>() {
            @Override
            public TfsMappingInfo call(List<String> logs) throws Exception {
                Workspace workspace = loadWorkspace(config, collectionName, workspaceName);
                String normalizedServerPath = normalizeServerPath(require(serverPath, "serverPath"));
                String normalizedLocalPath = new File(require(localPath, "localPath")).getAbsolutePath();
                checkMappingConflict(workspace, normalizedServerPath, normalizedLocalPath);
                ensureLocalDirectory(normalizedLocalPath);
                workspace.addOrChangeMapping(normalizedServerPath, normalizedLocalPath);
                logs.add("Mapping saved: " + normalizedServerPath + " -> " + normalizedLocalPath);
                return new TfsMappingInfo(normalizedServerPath, normalizedLocalPath);
            }
        });
    }

    /**
     * 删除 Workspace 中与 serverPath 或 localPath 精确匹配的 Mapping。
     */
    public CoreOperationResult<List<TfsMappingInfo>> deleteMapping(final TfsConnectionConfig config,
                                                                  final String collectionName,
                                                                  final String workspaceName,
                                                                  final String serverPath,
                                                                  final String localPath) {
        return execute("deleteMapping", new CoreCallable<List<TfsMappingInfo>>() {
            @Override
            public List<TfsMappingInfo> call(List<String> logs) throws Exception {
                Workspace workspace = loadWorkspace(config, collectionName, workspaceName);
                WorkingFolder target = findMapping(workspace, serverPath, localPath);
                if (target == null) {
                    throw new IllegalArgumentException("Mapping not found");
                }
                workspace.deleteWorkingFolder(target);
                List<TfsMappingInfo> mappings = toMappings(workspace.getFolders());
                logs.add("Mapping deleted: " + target.getServerItem() + " -> " + target.getLocalItem());
                return mappings;
            }
        });
    }

    /**
     * 对文件、目录或整个 Workspace 执行 Get Latest。
     */
    public CoreOperationResult<TfsGetLatestResult> getLatest(final TfsConnectionConfig config,
                                                            final String collectionName,
                                                            final String workspaceName,
                                                            final String serverPath,
                                                            final boolean recursive) {
        return execute("getLatest", new CoreCallable<TfsGetLatestResult>() {
            @Override
            public TfsGetLatestResult call(List<String> logs) throws Exception {
                Workspace workspace = loadWorkspace(config, collectionName, workspaceName);
                GetStatus status;
                String normalizedPath = serverPath == null || serverPath.trim().isEmpty() ? null : normalizeServerPath(serverPath);
                List<TfsConflictInfo> skipped = normalizedPath == null
                    ? Collections.<TfsConflictInfo>emptyList()
                    : pendingEditConflictInfos(queryPendingChanges(workspace, Arrays.asList(normalizedPath), recursive));
                if (normalizedPath == null) {
                    status = workspace.get(GetOptions.GET_ALL.combine(GetOptions.OVERWRITE));
                    logs.add("Get latest workspace: " + workspace.getName());
                } else if (!skipped.isEmpty()) {
                    GetRequest[] requests = nonPendingGetRequests(workspace, normalizedPath, recursive, skipped);
                    status = requests.length == 0 ? null : workspace.get(requests, GetOptions.GET_ALL);
                    logs.add("Get latest path: " + normalizedPath);
                    logs.add("Skipped pending edit items: " + skipped.size());
                } else {
                    RecursionType recursionType = recursive ? RecursionType.FULL : RecursionType.NONE;
                    GetRequest request = new GetRequest(new ItemSpec(normalizedPath, recursionType), LatestVersionSpec.INSTANCE);
                    status = workspace.get(new GetRequest[]{request}, GetOptions.GET_ALL);
                    logs.add("Get latest path: " + normalizedPath);
                }
                return toGetLatestResult(status, skipped);
            }
        });
    }

    /**
     * 查询当前 Workspace 下的挂起更改，并返回稳定可序列化的状态字段。
     */
    public CoreOperationResult<List<TfsPendingChangeInfo>> listPendingChanges(final TfsConnectionConfig config,
                                                                             final String collectionName,
                                                                             final String workspaceName,
                                                                             final List<String> serverPaths) {
        return execute("listPendingChanges", new CoreCallable<List<TfsPendingChangeInfo>>() {
            @Override
            public List<TfsPendingChangeInfo> call(List<String> logs) throws Exception {
                Workspace workspace = loadWorkspace(config, collectionName, workspaceName);
                PendingChange[] changes = queryPendingChanges(workspace, serverPaths, true);
                List<TfsPendingChangeInfo> result = toPendingChanges(changes);
                logs.add("Pending changes loaded: " + result.size());
                return result;
            }
        });
    }

    /**
     * 对本地已存在文件或目录执行 checkout，目录按 recursive 参数递归。
     */
    public CoreOperationResult<TfsFileOperationResult> checkout(final TfsConnectionConfig config,
                                                               final String collectionName,
                                                               final String workspaceName,
                                                               final List<String> paths,
                                                               final boolean recursive) {
        return execute("checkout", new CoreCallable<TfsFileOperationResult>() {
            @Override
            public TfsFileOperationResult call(List<String> logs) throws Exception {
                Workspace workspace = loadWorkspace(config, collectionName, workspaceName);
                String[] items = toRequiredArray(paths, "paths");
                List<String> skipped = new ArrayList<String>();
                List<TfsConflictInfo> conflicts = new ArrayList<TfsConflictInfo>();
                for (String item : items) {
                    if (isServerPath(item)) {
                        CoreOperationResult<TfsGetLatestResult> latest = getLatest(config, collectionName, workspaceName, item, recursive);
                        if (!latest.isSuccess()) {
                            throw new IllegalStateException(latest.getErrorMessage());
                        }
                        if (latest.getData() != null) {
                            skipped.addAll(latest.getData().getSkipped());
                            conflicts.addAll(latest.getData().getConflictDetails());
                        }
                    }
                }
                if (!conflicts.isEmpty()) {
                    logs.add("Checkout stopped by conflicts: " + conflicts.size());
                    return new TfsFileOperationResult("checkout", 0, Collections.<String>emptyList(), skipped, conflicts);
                }
                RecursionType recursionType = recursive ? RecursionType.FULL : RecursionType.NONE;
                int affected = workspace.pendEdit(items, recursionType, LockLevel.NONE, null, GetOptions.NONE, PendChangesOptions.NONE);
                logs.add("Checkout affected: " + affected);
                return new TfsFileOperationResult("checkout", affected, Collections.<String>emptyList(), skipped, conflicts);
            }
        });
    }

    /**
     * 将本地新增文件加入 pending add。
     */
    public CoreOperationResult<TfsFileOperationResult> add(final TfsConnectionConfig config,
                                                          final String collectionName,
                                                          final String workspaceName,
                                                          final List<String> localPaths) {
        return execute("add", new CoreCallable<TfsFileOperationResult>() {
            @Override
            public TfsFileOperationResult call(List<String> logs) throws Exception {
                Workspace workspace = loadWorkspace(config, collectionName, workspaceName);
                String[] items = toRequiredArray(localPaths, "localPaths");
                int affected = workspace.pendAdd(items, true, null, LockLevel.NONE, GetOptions.NONE, PendChangesOptions.NONE);
                logs.add("Add affected: " + affected);
                return new TfsFileOperationResult("add", affected, Collections.<String>emptyList());
            }
        });
    }

    /**
     * 对已版本控制文件或目录执行 pending delete。
     */
    public CoreOperationResult<TfsFileOperationResult> delete(final TfsConnectionConfig config,
                                                             final String collectionName,
                                                             final String workspaceName,
                                                             final List<String> paths,
                                                             final boolean recursive) {
        return execute("delete", new CoreCallable<TfsFileOperationResult>() {
            @Override
            public TfsFileOperationResult call(List<String> logs) throws Exception {
                Workspace workspace = loadWorkspace(config, collectionName, workspaceName);
                String[] items = toRequiredArray(paths, "paths");
                RecursionType recursionType = recursive ? RecursionType.FULL : RecursionType.NONE;
                int affected = workspace.pendDelete(items, recursionType, LockLevel.NONE, GetOptions.NONE, PendChangesOptions.NONE);
                logs.add("Delete affected: " + affected);
                return new TfsFileOperationResult("delete", affected, Collections.<String>emptyList());
            }
        });
    }

    /**
     * 撤销传入路径上的 pending changes。
     */
    public CoreOperationResult<TfsFileOperationResult> undo(final TfsConnectionConfig config,
                                                           final String collectionName,
                                                           final String workspaceName,
                                                           final List<String> paths,
                                                           final boolean recursive) {
        return execute("undo", new CoreCallable<TfsFileOperationResult>() {
            @Override
            public TfsFileOperationResult call(List<String> logs) throws Exception {
                Workspace workspace = loadWorkspace(config, collectionName, workspaceName);
                String[] items = toRequiredArray(paths, "paths");
                ItemSpec[] specs = ItemSpec.fromStrings(items, recursive ? RecursionType.FULL : RecursionType.NONE);
                int affected = workspace.undo(specs, GetOptions.NONE);
                logs.add("Undo affected: " + affected);
                return new TfsFileOperationResult("undo", affected, Collections.<String>emptyList());
            }
        });
    }

    /**
     * 按选中的 pending changes 执行 checkin，comment 为空时直接拒绝。
     */
    public CoreOperationResult<TfsCheckinResult> checkin(final TfsConnectionConfig config,
                                                        final String collectionName,
                                                        final String workspaceName,
                                                        final List<String> serverPaths,
                                                        final String comment) {
        return execute("checkin", new CoreCallable<TfsCheckinResult>() {
            @Override
            public TfsCheckinResult call(List<String> logs) throws Exception {
                String checkinComment = require(comment, "comment");
                Workspace workspace = loadWorkspace(config, collectionName, workspaceName);
                PendingChange[] selected = selectPendingChanges(workspace, toRequiredArray(serverPaths, "serverPaths"));
                if (selected.length == 0) {
                    throw new IllegalArgumentException("No selected pending changes found");
                }
                int changeset = workspace.checkIn(selected, checkinComment);
                logs.add("Checkin changeset: " + changeset);
                return new TfsCheckinResult(changeset, selected.length);
            }
        });
    }

    /**
     * 对已映射目录做元数据级对比，不下载服务端文件内容。
     */
    public CoreOperationResult<List<TfsFolderDiffItem>> compareFolder(final TfsConnectionConfig config,
                                                                     final String collectionName,
                                                                     final String workspaceName,
                                                                     final String serverPath,
                                                                     final String localPath,
                                                                     final boolean recursive) {
        return execute("compareFolder", new CoreCallable<List<TfsFolderDiffItem>>() {
            @Override
            public List<TfsFolderDiffItem> call(List<String> logs) throws Exception {
                Workspace workspace = loadWorkspace(config, collectionName, workspaceName);
                String normalizedServerPath = normalizeServerPath(require(serverPath, "serverPath"));
                String normalizedLocalPath = localPath == null || localPath.trim().isEmpty()
                    ? workspace.getMappedLocalPath(normalizedServerPath)
                    : new File(localPath).getAbsolutePath();
                if (normalizedLocalPath == null || normalizedLocalPath.trim().isEmpty()) {
                    throw new IllegalArgumentException("Server path is not mapped: " + normalizedServerPath);
                }
                Map<String, ExtendedItem> serverItems = queryExtendedItems(workspace, normalizedServerPath, recursive);
                Map<String, PendingChange> pendingChanges = mapPendingChanges(queryPendingChanges(workspace, Arrays.asList(normalizedServerPath), recursive));
                Set<String> localFiles = scanLocalFiles(new File(normalizedLocalPath), recursive);
                Map<String, TfsFolderDiffItem> result = new LinkedHashMap<String, TfsFolderDiffItem>();

                for (Map.Entry<String, ExtendedItem> entry : serverItems.entrySet()) {
                    ExtendedItem item = entry.getValue();
                    String itemServerPath = serverPathOf(item);
                    if (itemServerPath == null || normalizedServerPath.equals(itemServerPath)) {
                        continue;
                    }
                    String itemLocalPath = localPathOf(workspace, item, normalizedServerPath, normalizedLocalPath);
                    File localFile = itemLocalPath == null ? null : new File(itemLocalPath);
                    PendingChange pendingChange = pendingChanges.get(itemServerPath.toLowerCase());
                    String status = resolveDiffStatus(item, pendingChange, localFile);
                    if (!"upToDate".equals(status)) {
                        result.put(itemServerPath.toLowerCase(), new TfsFolderDiffItem(
                            itemServerPath,
                            itemLocalPath,
                            nameOf(itemServerPath),
                            isFolder(item.getItemType()),
                            status,
                            item.getLocalVersion(),
                            item.getLatestVersion()
                        ));
                    }
                    localFiles.remove(relativeLocalPath(normalizedLocalPath, itemLocalPath));
                }

                for (String relativePath : localFiles) {
                    if (relativePath.length() == 0) {
                        continue;
                    }
                    String itemServerPath = appendServerPath(normalizedServerPath, relativePath);
                    File localFile = new File(normalizedLocalPath, relativePath);
                    if (!result.containsKey(itemServerPath.toLowerCase())) {
                        result.put(itemServerPath.toLowerCase(), new TfsFolderDiffItem(
                            itemServerPath,
                            localFile.getAbsolutePath(),
                            localFile.getName(),
                            localFile.isDirectory(),
                            "localOnly",
                            0,
                            0
                        ));
                    }
                }
                logs.add("Folder diff items: " + result.size());
                return new ArrayList<TfsFolderDiffItem>(result.values());
            }
        });
    }

    /**
     * 查询文件或目录最近 100 条历史记录。
     */
    public CoreOperationResult<List<TfsHistoryEntry>> queryHistory(final TfsConnectionConfig config,
                                                                  final String collectionName,
                                                                  final String path,
                                                                  final boolean folder) {
        return execute("queryHistory", new CoreCallable<List<TfsHistoryEntry>>() {
            @Override
            public List<TfsHistoryEntry> call(List<String> logs) throws Exception {
                CoreConnection connection = connectCollection(config, collectionName);
                Changeset[] changesets = connection.versionControlClient.queryHistory(
                    require(path, "path"),
                    LatestVersionSpec.INSTANCE,
                    0,
                    folder ? RecursionType.FULL : RecursionType.NONE,
                    null,
                    null,
                    null,
                    HISTORY_LIMIT,
                    true,
                    true,
                    false,
                    false
                );
                List<TfsHistoryEntry> result = toHistoryEntries(changesets);
                logs.add("History loaded: " + result.size());
                return result;
            }
        });
    }

    /**
     * 查询指定 changeset 内影响的文件列表。
     */
    public CoreOperationResult<List<TfsHistoryEntry>> queryChangesetFiles(final TfsConnectionConfig config,
                                                                         final String collectionName,
                                                                         final int changesetId) {
        return execute("queryChangesetFiles", new CoreCallable<List<TfsHistoryEntry>>() {
            @Override
            public List<TfsHistoryEntry> call(List<String> logs) throws Exception {
                CoreConnection connection = connectCollection(config, collectionName);
                Changeset changeset = connection.versionControlClient.getChangeset(changesetId, true, true, null, null);
                List<TfsHistoryEntry> result = toChangesetFileEntries(changeset);
                logs.add("Changeset files loaded: " + result.size());
                return result;
            }
        });
    }

    /**
     * 获取 latest 或指定 changeset 的单文件文本内容。
     */
    public CoreOperationResult<TfsFileContent> getFileContent(final TfsConnectionConfig config,
                                                             final String collectionName,
                                                             final String serverPath,
                                                             final Integer changesetId) {
        return execute("getFileContent", new CoreCallable<TfsFileContent>() {
            @Override
            public TfsFileContent call(List<String> logs) throws Exception {
                CoreConnection connection = connectCollection(config, collectionName);
                VersionSpec versionSpec = changesetId == null ? LatestVersionSpec.INSTANCE : new ChangesetVersionSpec(changesetId.intValue());
                Item item = connection.versionControlClient.getItem(
                    require(serverPath, "serverPath"),
                    versionSpec,
                    DeletedState.NON_DELETED,
                    GetItemsOptions.DOWNLOAD
                );
                File tempFile = item.downloadFileToTempLocation(connection.versionControlClient, "mactfs");
                logs.add("File content loaded: " + item.getServerItem());
                return readFileContent(item.getServerItem(), null, item.getChangeSetID(), "server", tempFile);
            }
        });
    }

    /**
     * 读取本地文件内容，供 UI 在服务端完成 Mapping 边界校验后展示映射目录内文件。
     */
    public CoreOperationResult<TfsFileContent> getLocalFileContent(final String serverPath,
                                                                  final String localPath) {
        return execute("getLocalFileContent", new CoreCallable<TfsFileContent>() {
            @Override
            public TfsFileContent call(List<String> logs) throws Exception {
                File file = new File(require(localPath, "localPath"));
                if (!file.isFile()) {
                    throw new IllegalArgumentException("Local file not found: " + localPath);
                }
                logs.add("Local file content loaded: " + file.getAbsolutePath());
                return readFileContent(serverPath, file.getAbsolutePath(), 0, "local", file);
            }
        });
    }

    /**
     * 生成本地文件和服务器 latest 的文本 diff。
     */
    public CoreOperationResult<TfsTextDiff> diffLocalLatest(final TfsConnectionConfig config,
                                                           final String collectionName,
                                                           final String serverPath,
                                                           final String localPath) {
        return execute("diffLocalLatest", new CoreCallable<TfsTextDiff>() {
            @Override
            public TfsTextDiff call(List<String> logs) throws Exception {
                CoreOperationResult<TfsFileContent> latest = getFileContent(config, collectionName, serverPath, null);
                if (!latest.isSuccess()) {
                    throw new IllegalStateException(latest.getErrorMessage());
                }
                TfsFileContent local = readFileContent(serverPath, new File(require(localPath, "localPath")).getAbsolutePath(), 0, "local", new File(localPath));
                if (latest.getData() == null || !latest.getData().isRenderable()) {
                    throw new IllegalArgumentException("Server latest is not text renderable");
                }
                if (!local.isRenderable()) {
                    throw new IllegalArgumentException("Local file is not text renderable");
                }
                TfsTextDiff diff = buildTextDiff(localPath, serverPath, local.getContent(), latest.getData().getContent());
                logs.add("Text diff lines: " + diff.getLines().size());
                return diff;
            }
        });
    }

    /**
     * 生成同一服务端文件两个 changeset 版本之间的文本 diff。
     */
    public CoreOperationResult<TfsTextDiff> diffRevisions(final TfsConnectionConfig config,
                                                         final String collectionName,
                                                         final String serverPath,
                                                         final int sourceChangeset,
                                                         final int targetChangeset) {
        return execute("diffRevisions", new CoreCallable<TfsTextDiff>() {
            @Override
            public TfsTextDiff call(List<String> logs) throws Exception {
                CoreOperationResult<TfsFileContent> source = getFileContent(config, collectionName, serverPath, Integer.valueOf(sourceChangeset));
                CoreOperationResult<TfsFileContent> target = getFileContent(config, collectionName, serverPath, Integer.valueOf(targetChangeset));
                if (!source.isSuccess()) {
                    throw new IllegalStateException(source.getErrorMessage());
                }
                if (!target.isSuccess()) {
                    throw new IllegalStateException(target.getErrorMessage());
                }
                if (source.getData() == null || !source.getData().isRenderable()) {
                    throw new IllegalArgumentException("Source revision is not text renderable");
                }
                if (target.getData() == null || !target.getData().isRenderable()) {
                    throw new IllegalArgumentException("Target revision is not text renderable");
                }
                TfsTextDiff diff = buildTextDiff(
                    serverPath + ";C" + sourceChangeset,
                    serverPath + ";C" + targetChangeset,
                    source.getData().getContent(),
                    target.getData().getContent()
                );
                logs.add("Text diff lines: " + diff.getLines().size());
                return diff;
            }
        });
    }

    private <T> CoreOperationResult<T> execute(String operation, CoreCallable<T> callable) {
        long startedAt = System.currentTimeMillis();
        List<String> logs = new ArrayList<String>();
        try {
            logs.add("Start " + operation);
            T data = callable.call(logs);
            long endedAt = System.currentTimeMillis();
            logs.add("Finish " + operation);
            return CoreOperationResult.success(operation, "success", data, startedAt, endedAt, logs);
        } catch (Throwable exception) {
            long endedAt = System.currentTimeMillis();
            logs.add("Failed " + operation + ": " + exception.getMessage());
            return CoreOperationResult.failure(operation, exception.getMessage(), startedAt, endedAt, logs);
        }
    }

    private TFSConfigurationServer connectConfigurationServer(TfsConnectionConfig config) throws Exception {
        Credentials credentials = createCredentials(config);
        TFSConfigurationServer configurationServer = new TFSConfigurationServer(new URI(require(config.getServerUri(), "serverUri")), credentials);
        configurationServer.connect(ConnectOptions.INCLUDE_SERVICES);
        configurationServer.ensureAuthenticated();
        return configurationServer;
    }

    private Credentials createCredentials(TfsConnectionConfig config) {
        String authType = emptyToDefault(config.getAuthType(), "ntlm-explicit").toLowerCase();
        if ("ntlm-native".equals(authType)) {
            return new DefaultNTCredentials();
        }
        if (!"ntlm-explicit".equals(authType)) {
            throw new IllegalArgumentException("Unsupported authType: " + authType);
        }
        String username = require(config.getUsername(), "username");
        String domain = config.getDomain();
        String qualifiedUser = domain == null || domain.trim().isEmpty() ? username : domain.trim() + "\\" + username;
        return new UsernamePasswordCredentials(qualifiedUser, require(config.getPassword(), "password"));
    }

    private CoreConnection connectCollection(TfsConnectionConfig config, String collectionName) throws Exception {
        TFSConfigurationServer configurationServer = connectConfigurationServer(config);
        ProjectCollectionEntity selectedCollection = resolveCollection(
            loadServerEntity(configurationServer).getProjectCollections(),
            require(collectionName, "collectionName")
        );
        TFSTeamProjectCollection collection = configurationServer.getTeamProjectCollection(selectedCollection.getInstanceID());
        collection.connect(ConnectOptions.INCLUDE_SERVICES);
        collection.ensureAuthenticated();
        return new CoreConnection(configurationServer, collection, collection.getVersionControlClient());
    }

    private TeamFoundationServerEntity loadServerEntity(TFSConfigurationServer configurationServer) {
        TFSEntitySession session = configurationServer.getConfigurationSession(false);
        OrganizationalRootEntity root = session.getOrganizationalRoot();
        return root.getTeamFoundationServer();
    }

    private ProjectCollectionEntity resolveCollection(ProjectCollectionEntity[] collections, String targetName) {
        for (ProjectCollectionEntity collection : collections) {
            if (collection.getDisplayName().equalsIgnoreCase(targetName)) {
                return collection;
            }
        }
        throw new IllegalArgumentException("Collection not found: " + targetName);
    }

    private Workspace loadWorkspace(TfsConnectionConfig config, String collectionName, String workspaceName) throws Exception {
        CoreConnection connection = connectCollection(config, collectionName);
        String actualName = require(workspaceName, "workspaceName");
        Workspace workspace = findRepositoryWorkspace(connection.versionControlClient, actualName, connection.collection.getAuthorizedAccountName());
        if (workspace == null) {
            throw new IllegalArgumentException("Workspace not found: " + actualName);
        }
        return workspace;
    }

    private Workspace findRepositoryWorkspace(VersionControlClient versionControlClient, String workspaceName, String ownerName) {
        try {
            return versionControlClient.getRepositoryWorkspace(workspaceName, ownerName);
        } catch (WorkspaceNotFoundException exception) {
            return null;
        }
    }

    private Workspace createWorkspace(VersionControlClient versionControlClient,
                                      String workspaceName,
                                      String computerName,
                                      String comment) {
        return versionControlClient.createWorkspace(
            new WorkingFolder[0],
            workspaceName,
            versionControlClient.getConnection().getAuthorizedAccountName(),
            computerName,
            emptyToDefault(comment, "mactfs workspace"),
            WorkspaceLocation.SERVER,
            WorkspaceOptions.NONE
        );
    }

    private void checkMappingConflict(Workspace workspace, String serverPath, String localPath) {
        WorkingFolder[] folders = workspace.getFolders();
        for (WorkingFolder folder : folders) {
            String mappedServerPath = normalizeServerPath(folder.getServerItem());
            String mappedLocalPath = new File(folder.getLocalItem()).getAbsolutePath();
            if (!mappedServerPath.equalsIgnoreCase(serverPath) && isPathRelated(mappedServerPath, serverPath)) {
                throw new IllegalArgumentException("Server path conflicts with existing mapping: " + mappedServerPath);
            }
            if (!mappedLocalPath.equals(localPath) && isLocalPathRelated(mappedLocalPath, localPath)) {
                throw new IllegalArgumentException("Local path conflicts with existing mapping: " + mappedLocalPath);
            }
        }
    }

    private WorkingFolder findMapping(Workspace workspace, String serverPath, String localPath) {
        String normalizedServerPath = serverPath == null ? null : normalizeServerPath(serverPath);
        String normalizedLocalPath = localPath == null ? null : new File(localPath).getAbsolutePath();
        for (WorkingFolder folder : workspace.getFolders()) {
            boolean serverMatches = normalizedServerPath != null && normalizeServerPath(folder.getServerItem()).equalsIgnoreCase(normalizedServerPath);
            boolean localMatches = normalizedLocalPath != null && new File(folder.getLocalItem()).getAbsolutePath().equals(normalizedLocalPath);
            if (serverMatches || localMatches) {
                return folder;
            }
        }
        return null;
    }

    private PendingChange[] queryPendingChanges(Workspace workspace, List<String> serverPaths, boolean recursive) {
        if (serverPaths == null || serverPaths.isEmpty()) {
            PendingSet pendingSet = workspace.getPendingChanges();
            return pendingSet == null || pendingSet.getPendingChanges() == null ? new PendingChange[0] : pendingSet.getPendingChanges();
        }
        String[] items = new String[serverPaths.size()];
        for (int index = 0; index < serverPaths.size(); index++) {
            items[index] = normalizeServerPath(serverPaths.get(index));
        }
        PendingSet pendingSet = workspace.getPendingChanges(items, recursive ? RecursionType.FULL : RecursionType.NONE, false);
        return pendingSet == null || pendingSet.getPendingChanges() == null ? new PendingChange[0] : pendingSet.getPendingChanges();
    }

    private PendingChange[] selectPendingChanges(Workspace workspace, String[] serverPaths) {
        PendingChange[] changes = queryPendingChanges(workspace, Arrays.asList(serverPaths), true);
        List<PendingChange> selected = new ArrayList<PendingChange>();
        for (PendingChange change : changes) {
            for (String serverPath : serverPaths) {
                if (isPathRelated(normalizeServerPath(serverPath), change.getServerItem())) {
                    selected.add(change);
                    break;
                }
            }
        }
        return selected.toArray(new PendingChange[selected.size()]);
    }

    private Map<String, ExtendedItem> queryExtendedItems(Workspace workspace, String serverPath, boolean recursive) {
        ExtendedItem[][] groups = workspace.getExtendedItems(
            new ItemSpec[]{new ItemSpec(serverPath, recursive ? RecursionType.FULL : RecursionType.ONE_LEVEL)},
            DeletedState.NON_DELETED,
            ItemType.ANY,
            GetItemsOptions.NONE
        );
        Map<String, ExtendedItem> result = new LinkedHashMap<String, ExtendedItem>();
        if (groups == null) {
            return result;
        }
        for (ExtendedItem[] group : groups) {
            if (group == null) {
                continue;
            }
            for (ExtendedItem item : group) {
                String itemServerPath = serverPathOf(item);
                if (itemServerPath != null) {
                    result.put(itemServerPath.toLowerCase(), item);
                }
            }
        }
        return result;
    }

    private Map<String, PendingChange> mapPendingChanges(PendingChange[] pendingChanges) {
        Map<String, PendingChange> result = new LinkedHashMap<String, PendingChange>();
        for (PendingChange change : pendingChanges) {
            if (change.getServerItem() != null) {
                result.put(change.getServerItem().toLowerCase(), change);
            }
        }
        return result;
    }

    /**
     * 读取文件内容元数据，大文件和二进制文件只返回大小和可渲染状态，避免 UI 直接加载不可展示内容。
     */
    private TfsFileContent readFileContent(String serverPath, String localPath, int changeset, String source, File file) throws IOException {
        long size = file.length();
        boolean binary = isBinaryFile(file);
        boolean renderable = !binary && size <= MAX_RENDER_BYTES;
        String content = renderable ? new String(Files.readAllBytes(file.toPath()), TEXT_CHARSET) : "";
        return new TfsFileContent(
            serverPath,
            localPath,
            changeset,
            source,
            size,
            binary,
            renderable,
            TEXT_CHARSET.name(),
            content
        );
    }

    /**
     * 通过文件前 8KB 的 NUL 字节判断二进制文件，满足第一版文本查看的最小识别需求。
     */
    private boolean isBinaryFile(File file) throws IOException {
        FileInputStream inputStream = new FileInputStream(file);
        try {
            byte[] buffer = new byte[8192];
            int length = inputStream.read(buffer);
            for (int index = 0; index < length; index++) {
                if (buffer[index] == 0) {
                    return true;
                }
            }
            return false;
        } finally {
            inputStream.close();
        }
    }

    /**
     * 根据 pending change、工作区本地版本和服务端最新版本计算目录对比状态。
     */
    private String resolveDiffStatus(ExtendedItem item, PendingChange pendingChange, File localFile) {
        if (pendingChange != null) {
            return toPendingStatus(pendingChange);
        }
        boolean exists = localFile != null && localFile.exists();
        boolean remoteChanged = item.getLocalVersion() > 0 && item.getLatestVersion() > item.getLocalVersion();
        // mtime 只能作为远端版本变化时的辅助信号，避免 Get Latest 后因本地时间晚于签入时间误报本地修改。
        boolean localModified = remoteChanged && exists && item.getCheckinDate() != null && localFile.lastModified() > item.getCheckinDate().getTimeInMillis();
        if (!exists && item.getLocalVersion() > 0) {
            return "localDeleted";
        }
        if (!exists || item.getLocalVersion() <= 0) {
            return "notDownloaded";
        }
        if (remoteChanged && localModified) {
            return "bothChanged";
        }
        if (remoteChanged) {
            return "remoteChanged";
        }
        if (localModified) {
            return "localModified";
        }
        return "upToDate";
    }

    private List<TfsServerItem> toServerItems(String queryPath, ItemSet itemSet) {
        List<TfsServerItem> result = new ArrayList<TfsServerItem>();
        Item[] items = itemSet == null ? null : itemSet.getItems();
        if (items == null) {
            return result;
        }
        for (Item item : items) {
            if (queryPath.equals(item.getServerItem())) {
                continue;
            }
            result.add(new TfsServerItem(
                nameOf(item.getServerItem()),
                item.getServerItem(),
                isFolder(item.getItemType()),
                item.getChangeSetID(),
                item.getCheckinDate() == null ? null : item.getCheckinDate().getTimeInMillis()
            ));
        }
        return result;
    }

    private TfsWorkspaceInfo toWorkspaceInfo(Workspace workspace, boolean created) {
        return new TfsWorkspaceInfo(
            workspace.getName(),
            workspace.getOwnerName(),
            workspace.getComputer(),
            workspace.getComment(),
            created,
            toMappings(workspace.getFolders())
        );
    }

    private List<TfsMappingInfo> toMappings(WorkingFolder[] folders) {
        List<TfsMappingInfo> result = new ArrayList<TfsMappingInfo>();
        if (folders == null) {
            return result;
        }
        for (WorkingFolder folder : folders) {
            result.add(new TfsMappingInfo(folder.getServerItem(), folder.getLocalItem()));
        }
        return result;
    }

    private TfsGetLatestResult toGetLatestResult(GetStatus status, List<TfsConflictInfo> skipped) {
        int updated = status == null ? 0 : status.getNumUpdated();
        int operations = status == null ? 0 : status.getNumOperations();
        int failures = status == null ? 0 : status.getNumFailures();
        return new TfsGetLatestResult(
            updated,
            operations,
            skipped == null ? 0 : skipped.size(),
            failures,
            skipped == null ? Collections.<String>emptyList() : conflictServerPaths(skipped),
            skipped == null ? Collections.<TfsConflictInfo>emptyList() : skipped
        );
    }

    /**
     * 从 pending edit 列表生成 UI 冲突明细，Get Latest 不覆盖用户本地修改。
     */
    private List<TfsConflictInfo> pendingEditConflictInfos(PendingChange[] pendingChanges) {
        List<TfsConflictInfo> result = new ArrayList<TfsConflictInfo>();
        if (pendingChanges == null) {
            return result;
        }
        for (PendingChange change : pendingChanges) {
            if (change != null && change.isEdit()) {
                result.add(new TfsConflictInfo(
                    change.getServerItem(),
                    change.getLocalItem(),
                    fileSize(change.getLocalItem()),
                    false,
                    true,
                    true,
                    "pendingEdit"
                ));
            }
        }
        return result;
    }

    /**
     * 对递归 Get Latest 过滤掉 pending edit 子项，只同步其余服务端项。
     */
    private GetRequest[] nonPendingGetRequests(Workspace workspace, String serverPath, boolean recursive, List<TfsConflictInfo> skipped) {
        if (!recursive) {
            return new GetRequest[0];
        }
        Map<String, TfsConflictInfo> skippedByPath = new LinkedHashMap<String, TfsConflictInfo>();
        for (TfsConflictInfo conflict : skipped) {
            skippedByPath.put(conflict.getServerPath().toLowerCase(), conflict);
        }
        Map<String, ExtendedItem> serverItems = queryExtendedItems(workspace, serverPath, true);
        List<GetRequest> requests = new ArrayList<GetRequest>();
        for (String itemServerPath : serverItems.keySet()) {
            if (!skippedByPath.containsKey(itemServerPath.toLowerCase())) {
                requests.add(new GetRequest(new ItemSpec(itemServerPath, RecursionType.NONE), LatestVersionSpec.INSTANCE));
            }
        }
        return requests.toArray(new GetRequest[requests.size()]);
    }

    /**
     * 提取冲突明细中的服务端路径，兼容旧 UI 只展示跳过路径列表的场景。
     */
    private List<String> conflictServerPaths(List<TfsConflictInfo> conflicts) {
        List<String> result = new ArrayList<String>();
        for (TfsConflictInfo conflict : conflicts) {
            result.add(conflict.getServerPath());
        }
        return result;
    }

    /**
     * 判断传入路径是否是 TFS 服务端路径。
     */
    private boolean isServerPath(String path) {
        return path != null && path.trim().startsWith("$/");
    }

    /**
     * 返回本地文件大小，文件不存在时按 0 处理，避免冲突明细缺字段。
     */
    private long fileSize(String localPath) {
        if (localPath == null || localPath.trim().isEmpty()) {
            return 0L;
        }
        File file = new File(localPath);
        return file.isFile() ? file.length() : 0L;
    }

    private List<TfsPendingChangeInfo> toPendingChanges(PendingChange[] pendingChanges) {
        List<TfsPendingChangeInfo> result = new ArrayList<TfsPendingChangeInfo>();
        if (pendingChanges == null) {
            return result;
        }
        for (PendingChange change : pendingChanges) {
            result.add(new TfsPendingChangeInfo(
                change.getServerItem(),
                change.getLocalItem(),
                nameOf(change.getServerItem()),
                isFolder(change.getItemType()),
                toPendingStatus(change),
                change.getChangeType() == null ? "" : change.getChangeType().toUIString(false),
                change.getVersion()
            ));
        }
        return result;
    }

    private String toPendingStatus(PendingChange change) {
        if (change.isAdd()) {
            return "pendingAdd";
        }
        if (change.isDelete()) {
            return "pendingDelete";
        }
        if (change.isEdit()) {
            return "pendingEdit";
        }
        if (change.isRename()) {
            return "pendingRename";
        }
        return "pending";
    }

    private List<TfsHistoryEntry> toHistoryEntries(Changeset[] changesets) {
        List<TfsHistoryEntry> result = new ArrayList<TfsHistoryEntry>();
        if (changesets == null) {
            return result;
        }
        for (Changeset changeset : changesets) {
            Change[] changes = changeset.getChanges();
            String path = changes != null && changes.length > 0 && changes[0].getItem() != null ? changes[0].getItem().getServerItem() : "";
            String changeType = changes != null && changes.length > 0 && changes[0].getChangeType() != null
                ? changes[0].getChangeType().toUIString(false)
                : "";
            result.add(new TfsHistoryEntry(
                path,
                nameOf(path),
                changeType,
                "",
                changeset.getChangesetID(),
                emptyToDefault(changeset.getOwnerDisplayName(), changeset.getOwner()),
                changeset.getDate() == null ? null : Long.valueOf(changeset.getDate().getTimeInMillis()),
                changeset.getComment()
            ));
        }
        return result;
    }

    private List<TfsHistoryEntry> toChangesetFileEntries(Changeset changeset) {
        List<TfsHistoryEntry> result = new ArrayList<TfsHistoryEntry>();
        Change[] changes = changeset.getChanges();
        if (changes == null) {
            return result;
        }
        for (Change change : changes) {
            Item item = change.getItem();
            String path = item == null ? "" : item.getServerItem();
            ChangeType changeType = change.getChangeType();
            result.add(new TfsHistoryEntry(
                path,
                nameOf(path),
                changeType == null ? "" : changeType.toUIString(false),
                item == null || item.getItemType() == null ? "" : item.getItemType().toUIString(),
                changeset.getChangesetID(),
                emptyToDefault(changeset.getOwnerDisplayName(), changeset.getOwner()),
                changeset.getDate() == null ? null : Long.valueOf(changeset.getDate().getTimeInMillis()),
                changeset.getComment()
            ));
        }
        return result;
    }

    private TfsTextDiff buildTextDiff(String sourceLabel, String targetLabel, String sourceContent, String targetContent) {
        List<String> sourceLines = Arrays.asList(sourceContent.split("\\r?\\n", -1));
        List<String> targetLines = Arrays.asList(targetContent.split("\\r?\\n", -1));
        int max = Math.max(sourceLines.size(), targetLines.size());
        List<String> lines = new ArrayList<String>();
        for (int index = 0; index < max; index++) {
            String source = index < sourceLines.size() ? sourceLines.get(index) : null;
            String target = index < targetLines.size() ? targetLines.get(index) : null;
            if (source != null && target != null && source.equals(target)) {
                lines.add(" " + source);
            } else {
                if (source != null) {
                    lines.add("-" + source);
                }
                if (target != null) {
                    lines.add("+" + target);
                }
            }
        }
        return new TfsTextDiff(sourceLabel, targetLabel, lines);
    }

    private Set<String> scanLocalFiles(File root, boolean recursive) throws IOException {
        Set<String> result = new LinkedHashSet<String>();
        if (!root.exists()) {
            return result;
        }
        collectLocalFiles(root, root, recursive, result);
        return result;
    }

    private void collectLocalFiles(File root, File current, boolean recursive, Set<String> result) throws IOException {
        if (!root.equals(current) && isTfsTemporaryFile(current)) {
            return;
        }
        result.add(relativeLocalPath(root.getAbsolutePath(), current.getAbsolutePath()));
        if (!current.isDirectory() || (!recursive && !root.equals(current))) {
            return;
        }
        File[] children = current.listFiles();
        if (children == null) {
            return;
        }
        for (File child : children) {
            collectLocalFiles(root, child, recursive, result);
        }
    }

    /**
     * 忽略 TFS SDK 同步期间产生的临时文件，避免并发目录对比误报本地独有差异。
     */
    private boolean isTfsTemporaryFile(File file) {
        String name = file.getName().toLowerCase();
        return name.startsWith("teamexplorer") && name.endsWith(".tmp");
    }

    private String localPathOf(Workspace workspace, ExtendedItem item, String rootServerPath, String rootLocalPath) {
        if (item.getLocalItem() != null && item.getLocalItem().trim().length() > 0) {
            return new File(item.getLocalItem()).getAbsolutePath();
        }
        String mapped = workspace.getMappedLocalPath(serverPathOf(item));
        if (mapped != null && mapped.trim().length() > 0) {
            return new File(mapped).getAbsolutePath();
        }
        String serverPath = serverPathOf(item);
        if (serverPath != null && isPathRelated(rootServerPath, serverPath)) {
            String relative = serverPath.substring(rootServerPath.length()).replace('/', File.separatorChar);
            if (relative.startsWith(File.separator)) {
                relative = relative.substring(1);
            }
            return new File(rootLocalPath, relative).getAbsolutePath();
        }
        return null;
    }

    private String serverPathOf(ExtendedItem item) {
        if (item.getTargetServerItem() != null) {
            return item.getTargetServerItem();
        }
        return item.getSourceServerItem();
    }

    private String relativeLocalPath(String rootLocalPath, String itemLocalPath) {
        if (itemLocalPath == null || rootLocalPath == null) {
            return "";
        }
        File root = new File(rootLocalPath);
        File item = new File(itemLocalPath);
        String relative = root.toURI().relativize(item.toURI()).getPath();
        if (relative.endsWith("/")) {
            relative = relative.substring(0, relative.length() - 1);
        }
        return relative.replace('\\', '/');
    }

    private String appendServerPath(String serverPath, String relativePath) {
        String cleanRelative = relativePath.replace('\\', '/');
        if (serverPath.endsWith("/")) {
            return serverPath + cleanRelative;
        }
        return serverPath + "/" + cleanRelative;
    }

    private String[] toRequiredArray(List<String> values, String name) {
        if (values == null || values.isEmpty()) {
            throw new IllegalArgumentException("Missing required argument " + name);
        }
        List<String> result = new ArrayList<String>();
        for (String value : values) {
            if (value != null && value.trim().length() > 0) {
                result.add(value.trim());
            }
        }
        if (result.isEmpty()) {
            throw new IllegalArgumentException("Missing required argument " + name);
        }
        return result.toArray(new String[result.size()]);
    }

    private boolean isPathRelated(String parent, String child) {
        if (parent == null || child == null) {
            return false;
        }
        String normalizedParent = normalizeServerPath(parent).toLowerCase();
        String normalizedChild = normalizeServerPath(child).toLowerCase();
        return normalizedChild.equals(normalizedParent) || normalizedChild.startsWith(normalizedParent + "/") || normalizedParent.startsWith(normalizedChild + "/");
    }

    private boolean isLocalPathRelated(String parent, String child) {
        String normalizedParent = new File(parent).getAbsolutePath();
        String normalizedChild = new File(child).getAbsolutePath();
        return normalizedChild.equals(normalizedParent)
            || normalizedChild.startsWith(normalizedParent + File.separator)
            || normalizedParent.startsWith(normalizedChild + File.separator);
    }

    private String normalizeServerPath(String serverPath) {
        String trimmed = serverPath.trim();
        if ("$".equals(trimmed)) {
            return "$/";
        }
        if (trimmed.length() > 2 && trimmed.endsWith("/")) {
            return trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private String buildWorkspaceName(String collectionName, String username, String computerName) {
        String value = "mactfs-" + emptyToDefault(collectionName, "collection") + "-" + emptyToDefault(username, "user") + "-" + emptyToDefault(computerName, "computer");
        String normalized = value.replaceAll("[^A-Za-z0-9_-]", "-");
        return normalized.length() > 64 ? normalized.substring(0, 64) : normalized;
    }

    private String resolveComputerName() throws Exception {
        return InetAddress.getLocalHost().getHostName();
    }

    private void ensureLocalDirectory(String localPath) {
        File directory = new File(localPath);
        if (!directory.exists()) {
            directory.mkdirs();
        }
    }

    private boolean isFolder(ItemType itemType) {
        return ItemType.FOLDER.equals(itemType);
    }

    private String nameOf(String path) {
        if (path == null || path.length() == 0) {
            return "";
        }
        int index = path.lastIndexOf('/');
        return index < 0 ? path : path.substring(index + 1);
    }

    private String emptyToDefault(String value, String defaultValue) {
        return value == null || value.trim().isEmpty() ? defaultValue : value.trim();
    }

    private String require(String value, String name) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Missing required argument " + name);
        }
        return value.trim();
    }

    private interface CoreCallable<T> {
        T call(List<String> logs) throws Exception;
    }

    private static class CoreConnection {
        private final TFSConfigurationServer configurationServer;
        private final TFSTeamProjectCollection collection;
        private final VersionControlClient versionControlClient;

        private CoreConnection(TFSConfigurationServer configurationServer,
                               TFSTeamProjectCollection collection,
                               VersionControlClient versionControlClient) {
            this.configurationServer = configurationServer;
            this.collection = collection;
            this.versionControlClient = versionControlClient;
        }
    }

    /**
     * 核心层连接配置，供 CLI、Server API 和 UI 间接复用。
     */
    public static class TfsConnectionConfig {
        private final String serverUri;
        private final String authType;
        private final String domain;
        private final String username;
        private final String password;

        public TfsConnectionConfig(String serverUri, String authType, String domain, String username, String password) {
            this.serverUri = serverUri;
            this.authType = authType;
            this.domain = domain;
            this.username = username;
            this.password = password;
        }

        public String getServerUri() {
            return serverUri;
        }

        public String getAuthType() {
            return authType;
        }

        public String getDomain() {
            return domain;
        }

        public String getUsername() {
            return username;
        }

        public String getPassword() {
            return password;
        }
    }

    /**
     * 统一描述核心操作执行结果、错误、耗时和日志摘要。
     */
    public static class CoreOperationResult<T> {
        private final boolean success;
        private final String operation;
        private final String message;
        private final String errorMessage;
        private final T data;
        private final long startedAt;
        private final long endedAt;
        private final long durationMillis;
        private final List<String> logs;

        private CoreOperationResult(boolean success,
                                    String operation,
                                    String message,
                                    String errorMessage,
                                    T data,
                                    long startedAt,
                                    long endedAt,
                                    List<String> logs) {
            this.success = success;
            this.operation = operation;
            this.message = message;
            this.errorMessage = errorMessage;
            this.data = data;
            this.startedAt = startedAt;
            this.endedAt = endedAt;
            this.durationMillis = endedAt - startedAt;
            this.logs = logs;
        }

        public static <T> CoreOperationResult<T> success(String operation, String message, T data, long startedAt, long endedAt, List<String> logs) {
            return new CoreOperationResult<T>(true, operation, message, null, data, startedAt, endedAt, logs);
        }

        public static <T> CoreOperationResult<T> failure(String operation, String errorMessage, long startedAt, long endedAt, List<String> logs) {
            return new CoreOperationResult<T>(false, operation, "failure", errorMessage, null, startedAt, endedAt, logs);
        }

        public boolean isSuccess() {
            return success;
        }

        public String getOperation() {
            return operation;
        }

        public String getMessage() {
            return message;
        }

        public String getErrorMessage() {
            return errorMessage;
        }

        public T getData() {
            return data;
        }

        public long getStartedAt() {
            return startedAt;
        }

        public long getEndedAt() {
            return endedAt;
        }

        public long getDurationMillis() {
            return durationMillis;
        }

        public List<String> getLogs() {
            return logs;
        }
    }

    public static class ConnectionSummary {
        private final String serverUri;
        private final int collectionCount;

        public ConnectionSummary(String serverUri, int collectionCount) {
            this.serverUri = serverUri;
            this.collectionCount = collectionCount;
        }

        public String getServerUri() {
            return serverUri;
        }

        public int getCollectionCount() {
            return collectionCount;
        }
    }

    public static class TfsCollectionInfo {
        private final String name;
        private final String id;

        public TfsCollectionInfo(String name, String id) {
            this.name = name;
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public String getId() {
            return id;
        }
    }

    public static class TfsServerItem {
        private final String name;
        private final String serverPath;
        private final boolean folder;
        private final int latestVersion;
        private final Long checkinDate;

        public TfsServerItem(String name, String serverPath, boolean folder, int latestVersion, Long checkinDate) {
            this.name = name;
            this.serverPath = serverPath;
            this.folder = folder;
            this.latestVersion = latestVersion;
            this.checkinDate = checkinDate;
        }

        public String getName() {
            return name;
        }

        public String getServerPath() {
            return serverPath;
        }

        public boolean isFolder() {
            return folder;
        }

        public int getLatestVersion() {
            return latestVersion;
        }

        public Long getCheckinDate() {
            return checkinDate;
        }
    }

    public static class TfsWorkspaceInfo {
        private final String name;
        private final String ownerName;
        private final String computer;
        private final String comment;
        private final boolean created;
        private final List<TfsMappingInfo> mappings;

        public TfsWorkspaceInfo(String name, String ownerName, String computer, String comment, boolean created, List<TfsMappingInfo> mappings) {
            this.name = name;
            this.ownerName = ownerName;
            this.computer = computer;
            this.comment = comment;
            this.created = created;
            this.mappings = mappings;
        }

        public String getName() {
            return name;
        }

        public String getOwnerName() {
            return ownerName;
        }

        public String getComputer() {
            return computer;
        }

        public String getComment() {
            return comment;
        }

        public boolean isCreated() {
            return created;
        }

        public List<TfsMappingInfo> getMappings() {
            return mappings;
        }
    }

    public static class TfsMappingInfo {
        private final String serverPath;
        private final String localPath;

        public TfsMappingInfo(String serverPath, String localPath) {
            this.serverPath = serverPath;
            this.localPath = localPath;
        }

        public String getServerPath() {
            return serverPath;
        }

        public String getLocalPath() {
            return localPath;
        }
    }

    public static class TfsGetLatestResult {
        private final int updated;
        private final int operations;
        private final int conflicts;
        private final int failures;
        private final List<String> skipped;
        private final List<TfsConflictInfo> conflictDetails;

        public TfsGetLatestResult(int updated, int operations, int conflicts, int failures) {
            this(updated, operations, conflicts, failures, Collections.<String>emptyList(), Collections.<TfsConflictInfo>emptyList());
        }

        public TfsGetLatestResult(int updated, int operations, int conflicts, int failures, List<String> skipped, List<TfsConflictInfo> conflictDetails) {
            this.updated = updated;
            this.operations = operations;
            this.conflicts = conflicts;
            this.failures = failures;
            this.skipped = skipped;
            this.conflictDetails = conflictDetails;
        }

        public int getUpdated() {
            return updated;
        }

        public int getOperations() {
            return operations;
        }

        public int getConflicts() {
            return conflicts;
        }

        public int getFailures() {
            return failures;
        }

        public List<String> getSkipped() {
            return skipped;
        }

        public List<TfsConflictInfo> getConflictDetails() {
            return conflictDetails;
        }
    }

    public static class TfsPendingChangeInfo {
        private final String serverPath;
        private final String localPath;
        private final String name;
        private final boolean folder;
        private final String status;
        private final String changeType;
        private final int version;

        public TfsPendingChangeInfo(String serverPath, String localPath, String name, boolean folder, String status, String changeType, int version) {
            this.serverPath = serverPath;
            this.localPath = localPath;
            this.name = name;
            this.folder = folder;
            this.status = status;
            this.changeType = changeType;
            this.version = version;
        }

        public String getServerPath() {
            return serverPath;
        }

        public String getLocalPath() {
            return localPath;
        }

        public String getName() {
            return name;
        }

        public boolean isFolder() {
            return folder;
        }

        public String getStatus() {
            return status;
        }

        public String getChangeType() {
            return changeType;
        }

        public int getVersion() {
            return version;
        }
    }

    public static class TfsFileOperationResult {
        private final String operation;
        private final int affected;
        private final List<String> failures;
        private final List<String> skipped;
        private final List<TfsConflictInfo> conflictDetails;

        public TfsFileOperationResult(String operation, int affected, List<String> failures) {
            this(operation, affected, failures, Collections.<String>emptyList(), Collections.<TfsConflictInfo>emptyList());
        }

        public TfsFileOperationResult(String operation, int affected, List<String> failures, List<String> skipped, List<TfsConflictInfo> conflictDetails) {
            this.operation = operation;
            this.affected = affected;
            this.failures = failures;
            this.skipped = skipped;
            this.conflictDetails = conflictDetails;
        }

        public String getOperation() {
            return operation;
        }

        public int getAffected() {
            return affected;
        }

        public List<String> getFailures() {
            return failures;
        }

        public List<String> getSkipped() {
            return skipped;
        }

        public List<TfsConflictInfo> getConflictDetails() {
            return conflictDetails;
        }
    }

    public static class TfsCheckinResult {
        private final int changeset;
        private final int submittedChanges;

        public TfsCheckinResult(int changeset, int submittedChanges) {
            this.changeset = changeset;
            this.submittedChanges = submittedChanges;
        }

        public int getChangeset() {
            return changeset;
        }

        public int getSubmittedChanges() {
            return submittedChanges;
        }
    }

    public static class TfsFolderDiffItem {
        private final String serverPath;
        private final String localPath;
        private final String name;
        private final boolean folder;
        private final String status;
        private final int localVersion;
        private final int latestVersion;

        public TfsFolderDiffItem(String serverPath, String localPath, String name, boolean folder, String status, int localVersion, int latestVersion) {
            this.serverPath = serverPath;
            this.localPath = localPath;
            this.name = name;
            this.folder = folder;
            this.status = status;
            this.localVersion = localVersion;
            this.latestVersion = latestVersion;
        }

        public String getServerPath() {
            return serverPath;
        }

        public String getLocalPath() {
            return localPath;
        }

        public String getName() {
            return name;
        }

        public boolean isFolder() {
            return folder;
        }

        public String getStatus() {
            return status;
        }

        public int getLocalVersion() {
            return localVersion;
        }

        public int getLatestVersion() {
            return latestVersion;
        }
    }

    public static class TfsHistoryEntry {
        private final String serverPath;
        private final String name;
        private final String changeType;
        private final String itemType;
        private final int changeset;
        private final String author;
        private final Long date;
        private final String comment;

        public TfsHistoryEntry(String serverPath, String name, String changeType, String itemType, int changeset, String author, Long date, String comment) {
            this.serverPath = serverPath;
            this.name = name;
            this.changeType = changeType;
            this.itemType = itemType;
            this.changeset = changeset;
            this.author = author;
            this.date = date;
            this.comment = comment;
        }

        public String getServerPath() {
            return serverPath;
        }

        public String getName() {
            return name;
        }

        public String getChangeType() {
            return changeType;
        }

        public String getItemType() {
            return itemType;
        }

        public int getChangeset() {
            return changeset;
        }

        public String getAuthor() {
            return author;
        }

        public Long getDate() {
            return date;
        }

        public String getComment() {
            return comment;
        }
    }

    public static class TfsFileContent {
        private final String serverPath;
        private final String localPath;
        private final int changeset;
        private final String source;
        private final long size;
        private final boolean renderable;
        private final String encoding;
        private final String content;
        private final boolean binary;

        public TfsFileContent(String serverPath, int changeset, String content, boolean binary) {
            this(serverPath, null, changeset, "server", content == null ? 0L : content.length(), binary, !binary, TEXT_CHARSET.name(), content);
        }

        public TfsFileContent(String serverPath, String localPath, int changeset, String source, long size, boolean binary, boolean renderable, String encoding, String content) {
            this.serverPath = serverPath;
            this.localPath = localPath;
            this.changeset = changeset;
            this.source = source;
            this.size = size;
            this.renderable = renderable;
            this.encoding = encoding;
            this.content = content;
            this.binary = binary;
        }

        public String getServerPath() {
            return serverPath;
        }

        public String getLocalPath() {
            return localPath;
        }

        public int getChangeset() {
            return changeset;
        }

        public String getSource() {
            return source;
        }

        public long getSize() {
            return size;
        }

        public boolean isRenderable() {
            return renderable;
        }

        public String getEncoding() {
            return encoding;
        }

        public String getContent() {
            return content;
        }

        public boolean isBinary() {
            return binary;
        }
    }

    public static class TfsConflictInfo {
        private final String serverPath;
        private final String localPath;
        private final long fileSize;
        private final boolean binary;
        private final boolean renderable;
        private final boolean autoMergeable;
        private final String reason;

        public TfsConflictInfo(String serverPath, String localPath, long fileSize, boolean binary, boolean renderable, boolean autoMergeable, String reason) {
            this.serverPath = serverPath;
            this.localPath = localPath;
            this.fileSize = fileSize;
            this.binary = binary;
            this.renderable = renderable;
            this.autoMergeable = autoMergeable;
            this.reason = reason;
        }

        public String getServerPath() {
            return serverPath;
        }

        public String getLocalPath() {
            return localPath;
        }

        public long getFileSize() {
            return fileSize;
        }

        public boolean isBinary() {
            return binary;
        }

        public boolean isRenderable() {
            return renderable;
        }

        public boolean isAutoMergeable() {
            return autoMergeable;
        }

        public String getReason() {
            return reason;
        }
    }

    public static class TfsTextDiff {
        private final String sourceLabel;
        private final String targetLabel;
        private final List<String> lines;

        public TfsTextDiff(String sourceLabel, String targetLabel, List<String> lines) {
            this.sourceLabel = sourceLabel;
            this.targetLabel = targetLabel;
            this.lines = lines;
        }

        public String getSourceLabel() {
            return sourceLabel;
        }

        public String getTargetLabel() {
            return targetLabel;
        }

        public List<String> getLines() {
            return lines;
        }
    }
}
