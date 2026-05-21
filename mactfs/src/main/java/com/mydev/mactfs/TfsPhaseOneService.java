package com.mydev.mactfs;

import com.microsoft.tfs.core.TFSConfigurationServer;
import com.microsoft.tfs.core.TFSTeamProjectCollection;
import com.microsoft.tfs.core.clients.framework.configuration.TFSEntitySession;
import com.microsoft.tfs.core.clients.framework.configuration.entities.OrganizationalRootEntity;
import com.microsoft.tfs.core.clients.framework.configuration.entities.ProjectCollectionEntity;
import com.microsoft.tfs.core.clients.framework.configuration.entities.TeamFoundationServerEntity;
import com.microsoft.tfs.core.clients.framework.location.ConnectOptions;
import com.microsoft.tfs.core.clients.versioncontrol.GetOptions;
import com.microsoft.tfs.core.clients.versioncontrol.GetStatus;
import com.microsoft.tfs.core.clients.versioncontrol.VersionControlClient;
import com.microsoft.tfs.core.clients.versioncontrol.WorkspaceLocation;
import com.microsoft.tfs.core.clients.versioncontrol.WorkspaceOptions;
import com.microsoft.tfs.core.clients.versioncontrol.exceptions.WorkspaceNotFoundException;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.DeletedState;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.GetRequest;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.Item;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.ItemSet;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.ItemType;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.RecursionType;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.WorkingFolder;
import com.microsoft.tfs.core.clients.versioncontrol.soapextensions.Workspace;
import com.microsoft.tfs.core.clients.versioncontrol.specs.ItemSpec;
import com.microsoft.tfs.core.clients.versioncontrol.specs.version.LatestVersionSpec;
import com.microsoft.tfs.core.httpclient.Credentials;
import com.microsoft.tfs.core.httpclient.DefaultNTCredentials;
import com.microsoft.tfs.core.httpclient.UsernamePasswordCredentials;

import java.io.File;
import java.net.InetAddress;
import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

/**
 * 第一阶段核心服务，负责执行登录、workspace、映射和 get latest 链路。
 */
public class TfsPhaseOneService {

    /**
     * 执行连接测试动作，只验证认证和服务可达性。
     */
    public CliActionResult testConnection(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, new Properties());
        TFSConfigurationServer configurationServer = connectConfigurationServer(merged);
        TeamFoundationServerEntity teamFoundationServer = loadServerEntity(configurationServer);
        ProjectCollectionEntity[] collections = teamFoundationServer.getProjectCollections();

        StringBuilder logs = new StringBuilder();
        appendLog(logs, logSink, "Login success");
        appendLog(logs, logSink, "Server URI: " + required(merged, "server-uri"));
        appendLog(logs, logSink, "Visible collections: " + collections.length);

        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("serverUri", required(merged, "server-uri"));
        data.put("collectionCount", Integer.valueOf(collections.length));
        return CliActionResult.success("Connection success", logs.toString(), data);
    }

    /**
     * 查询当前连接下可见的 Collection 列表，供桌面端下拉选择。
     */
    public CliActionResult listCollections(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, new Properties());
        TFSConfigurationServer configurationServer = connectConfigurationServer(merged);
        ProjectCollectionEntity[] collections = loadServerEntity(configurationServer).getProjectCollections();

        StringBuilder logs = new StringBuilder();
        appendLog(logs, logSink, "Login success");
        appendLog(logs, logSink, "Collections loaded: " + collections.length);

        List<Map<String, Object>> items = new ArrayList<Map<String, Object>>();
        for (ProjectCollectionEntity collection : collections) {
            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("name", collection.getDisplayName());
            item.put("id", String.valueOf(collection.getInstanceID()));
            items.add(item);
            appendLog(logs, logSink, "Collection: " + collection.getDisplayName());
        }

        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("collections", items);
        return CliActionResult.success("Collections loaded", logs.toString(), data);
    }

    /**
     * 查询指定 Collection 下当前用户在本机可见的 Workspace 列表。
     */
    public CliActionResult listWorkspaces(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, new Properties());
        TFSConfigurationServer configurationServer = connectConfigurationServer(merged);
        TFSTeamProjectCollection collection = connectProjectCollection(configurationServer, merged);
        VersionControlClient versionControlClient = collection.getVersionControlClient();
        String ownerName = collection.getAuthorizedAccountName();
        String computerName = resolveComputerName();
        List<Workspace> workspaces = new ArrayList<Workspace>();
        Workspace currentWorkspace = null;
        if (merged.getProperty("workspace") != null && merged.getProperty("workspace").trim().length() > 0) {
            currentWorkspace = findRepositoryWorkspace(versionControlClient, required(merged, "workspace"), ownerName);
        }
        if (currentWorkspace != null) {
            workspaces.add(currentWorkspace);
        }

        StringBuilder logs = new StringBuilder();
        appendLog(logs, logSink, "Login success");
        appendLog(logs, logSink, "Collection: " + required(merged, "collection"));
        appendLog(logs, logSink, "Workspace count: " + workspaces.size());
        appendLog(logs, logSink, "Computer: " + computerName);

        List<Map<String, Object>> items = new ArrayList<Map<String, Object>>();
        for (Workspace workspace : workspaces) {
            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("name", workspace.getName());
            item.put("ownerName", workspace.getOwnerName());
            item.put("computer", workspace.getComputer());
            item.put("comment", workspace.getComment());
            items.add(item);
            appendLog(logs, logSink, "Workspace: " + workspace.getName());
        }

        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("collection", required(merged, "collection"));
        data.put("workspaces", items);
        return CliActionResult.success("Workspaces loaded", logs.toString(), data);
    }

    /**
     * 浏览指定 Collection 下的服务端目录结构，供桌面端资源管理页展示。
     */
    public CliActionResult browseServerPath(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, new Properties());
        TFSConfigurationServer configurationServer = connectConfigurationServer(merged);
        TFSTeamProjectCollection collection = connectProjectCollection(configurationServer, merged);
        VersionControlClient versionControlClient = collection.getVersionControlClient();
        String serverPath = arguments.has("server-path") ? normalizeServerPath(required(merged, "server-path")) : "$/";
        ItemSet itemSet = versionControlClient.getItems(
            serverPath,
            LatestVersionSpec.INSTANCE,
            RecursionType.ONE_LEVEL,
            DeletedState.NON_DELETED,
            ItemType.ANY
        );

        StringBuilder logs = new StringBuilder();
        appendLog(logs, logSink, "Login success");
        appendLog(logs, logSink, "Collection: " + required(merged, "collection"));
        appendLog(logs, logSink, "Browse path: " + serverPath);

        List<Map<String, Object>> items = new ArrayList<Map<String, Object>>();
        Item[] serverItems = itemSet == null ? null : itemSet.getItems();
        if (serverItems != null) {
            for (Item item : serverItems) {
                if (serverPath.equals(item.getServerItem())) {
                    continue;
                }
                Map<String, Object> node = new LinkedHashMap<String, Object>();
                node.put("path", item.getServerItem());
                node.put("name", item.getServerItem().substring(item.getServerItem().lastIndexOf('/') + 1));
                node.put("folder", ItemType.FOLDER.equals(item.getItemType()));
                items.add(node);
            }
        }

        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("path", serverPath);
        data.put("items", items);
        return CliActionResult.success("Server path loaded", logs.toString(), data);
    }

    /**
     * 查询或创建远端 Workspace，供桌面端在保存配置时即时落库到 TFS。
     */
    public CliActionResult ensureWorkspace(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        TFSConfigurationServer configurationServer = connectConfigurationServer(merged);
        TFSTeamProjectCollection collection = connectProjectCollection(configurationServer, merged);
        VersionControlClient versionControlClient = collection.getVersionControlClient();
        String workspaceName = required(merged, "workspace");
        String ownerName = collection.getAuthorizedAccountName();
        String computerName = resolveComputerName();
        Workspace workspace = findRepositoryWorkspace(versionControlClient, workspaceName, ownerName);
        boolean created = workspace == null;
        if (created) {
            workspace = createWorkspace(versionControlClient, merged, workspaceName, computerName);
        }

        StringBuilder logs = new StringBuilder();
        appendLog(logs, logSink, "Login success");
        appendLog(logs, logSink, "Collection: " + required(merged, "collection"));
        appendLog(logs, logSink, created ? "Workspace created: " + workspace.getName() : "Workspace reused: " + workspace.getName());

        merged.setProperty("workspace", workspace.getName());
        saveConfig(merged, configStore);

        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("workspaceName", workspace.getName());
        data.put("ownerName", workspace.getOwnerName());
        data.put("computer", workspace.getComputer());
        data.put("comment", workspace.getComment());
        data.put("created", Boolean.valueOf(created));
        return CliActionResult.success(created ? "Workspace created" : "Workspace exists", logs.toString(), data);
    }

    /**
     * 执行完整同步动作，覆盖 Workspace 查询/创建、映射保存和 Get Latest。
     */
    public CliActionResult sync(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        TFSConfigurationServer configurationServer = connectConfigurationServer(merged);
        ProjectCollectionEntity[] collections = loadServerEntity(configurationServer).getProjectCollections();

        StringBuilder logs = new StringBuilder();
        appendLog(logs, logSink, "Login success");
        appendLog(logs, logSink, "Server URI: " + required(merged, "server-uri"));
        appendLog(logs, logSink, "Collections:");
        for (ProjectCollectionEntity entity : collections) {
            appendLog(logs, logSink, " - " + entity.getDisplayName());
        }

        if (isTrue(merged.getProperty("list-only"))) {
            saveConfig(merged, configStore);
            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("collectionCount", Integer.valueOf(collections.length));
            return CliActionResult.success("Collections loaded", logs.toString(), data);
        }

        ProjectCollectionEntity selectedCollection = resolveCollection(collections, required(merged, "collection"));
        TFSTeamProjectCollection collection = configurationServer.getTeamProjectCollection(selectedCollection.getInstanceID());
        collection.connect(ConnectOptions.INCLUDE_SERVICES);
        collection.ensureAuthenticated();

        VersionControlClient versionControlClient = collection.getVersionControlClient();
        String workspaceName = required(merged, "workspace");
        String ownerName = collection.getAuthorizedAccountName();
        String computerName = resolveComputerName();

        Workspace workspace = findRepositoryWorkspace(versionControlClient, workspaceName, ownerName);
        appendLog(logs, logSink, "Workspace query result count: " + (workspace == null ? 0 : 1));
        if (workspace == null) {
            workspace = createWorkspace(versionControlClient, merged, workspaceName, computerName);
        }

        appendLog(logs, logSink, "Workspace: " + workspace.getName());
        appendLog(logs, logSink, "Workspace owner: " + workspace.getOwnerName());

        String serverPath = normalizeServerPath(required(merged, "server-path"));
        String localPath = new File(required(merged, "local-path")).getAbsolutePath();
        ensureLocalDirectory(localPath);

        workspace.update(workspace.getName(), workspace.getComment(), new WorkingFolder[]{new WorkingFolder(serverPath, localPath)}, true);
        appendLog(logs, logSink, "Mapping saved: " + serverPath + " -> " + localPath);

        ItemSpec itemSpec = new ItemSpec(serverPath, RecursionType.FULL);
        GetRequest getRequest = new GetRequest(itemSpec, LatestVersionSpec.INSTANCE);
        GetStatus getStatus = workspace.get(new GetRequest[]{getRequest}, GetOptions.GET_ALL.combine(GetOptions.OVERWRITE));
        appendLog(logs, logSink, "Get latest finished");
        appendLog(logs, logSink, "Updated files: " + getStatus.getNumUpdated());
        appendLog(logs, logSink, "Operations: " + getStatus.getNumOperations());
        appendLog(logs, logSink, "Conflicts: " + getStatus.getNumConflicts());
        appendLog(logs, logSink, "Failures: " + getStatus.getNumFailures());

        merged.setProperty("collection", selectedCollection.getDisplayName());
        merged.setProperty("workspace", workspace.getName());
        merged.setProperty("server-path", serverPath);
        merged.setProperty("local-path", localPath);
        saveConfig(merged, configStore);

        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("workspaceName", workspace.getName());
        data.put("workspaceOwner", workspace.getOwnerName());
        data.put("serverPath", serverPath);
        data.put("localPath", localPath);
        data.put("updatedFiles", Integer.valueOf(getStatus.getNumUpdated()));
        data.put("operations", Integer.valueOf(getStatus.getNumOperations()));
        data.put("conflicts", Integer.valueOf(getStatus.getNumConflicts()));
        data.put("failures", Integer.valueOf(getStatus.getNumFailures()));
        return CliActionResult.success("Sync finished", logs.toString(), data);
    }

    /**
     * 兼容原第一阶段 CLI 的同步执行入口。
     */
    public ExecutionResult execute(CliArguments arguments, LocalConfigStore configStore) throws Exception {
        CliActionResult result = sync(arguments, configStore, null);
        boolean getLatestExecuted = result.getData().containsKey("updatedFiles");
        return new ExecutionResult(result.getLogs(), getLatestExecuted);
    }

    /**
     * 将本次输入覆盖到本地配置上，保证 CLI 可以按最近一次成功配置继续执行。
     */
    private Properties mergeArguments(CliArguments arguments, Properties saved) {
        Properties merged = new Properties();
        merged.putAll(saved);
        if (arguments.getBoolean("reuse-config")) {
            return merged;
        }

        copy(arguments, merged, "server-uri");
        copy(arguments, merged, "auth-type");
        copy(arguments, merged, "username");
        copy(arguments, merged, "domain");
        copy(arguments, merged, "password");
        copy(arguments, merged, "collection");
        copy(arguments, merged, "workspace");
        copy(arguments, merged, "comment");
        copy(arguments, merged, "server-path");
        copy(arguments, merged, "local-path");
        if (arguments.has("list-only")) {
            copy(arguments, merged, "list-only");
        } else {
            merged.remove("list-only");
        }
        return merged;
    }

    /**
     * 建立配置服务器连接，复用显式凭证和 URI 处理逻辑。
     */
    private TFSConfigurationServer connectConfigurationServer(Properties properties) throws Exception {
        Credentials credentials = createCredentials(properties);
        URI serverUri = new URI(required(properties, "server-uri"));
        TFSConfigurationServer configurationServer = new TFSConfigurationServer(serverUri, credentials);
        configurationServer.connect(ConnectOptions.INCLUDE_SERVICES);
        configurationServer.ensureAuthenticated();
        return configurationServer;
    }

    /**
     * 第一阶段只支持文档建议的显式凭证和默认 NTLM 两种认证口径。
     */
    private Credentials createCredentials(Properties properties) {
        String authType = properties.getProperty("auth-type", "ntlm-explicit").trim().toLowerCase();
        if ("ntlm-native".equals(authType)) {
            return new DefaultNTCredentials();
        }

        String username = required(properties, "username");
        String domain = properties.getProperty("domain");
        String qualifiedUser = domain == null || domain.trim().isEmpty() ? username : domain.trim() + "\\" + username;
        return new UsernamePasswordCredentials(qualifiedUser, required(properties, "password"));
    }

    private TeamFoundationServerEntity loadServerEntity(TFSConfigurationServer configurationServer) {
        TFSEntitySession session = configurationServer.getConfigurationSession(false);
        OrganizationalRootEntity root = session.getOrganizationalRoot();
        return root.getTeamFoundationServer();
    }

    /**
     * 连接指定 Collection，供工作区查询和同步动作复用。
     */
    private TFSTeamProjectCollection connectProjectCollection(TFSConfigurationServer configurationServer, Properties properties) {
        ProjectCollectionEntity selectedCollection = resolveCollection(
            loadServerEntity(configurationServer).getProjectCollections(),
            required(properties, "collection")
        );
        TFSTeamProjectCollection collection = configurationServer.getTeamProjectCollection(selectedCollection.getInstanceID());
        collection.connect(ConnectOptions.INCLUDE_SERVICES);
        collection.ensureAuthenticated();
        return collection;
    }

    private ProjectCollectionEntity resolveCollection(ProjectCollectionEntity[] collections, String targetName) {
        for (ProjectCollectionEntity collection : collections) {
            if (collection.getDisplayName().equalsIgnoreCase(targetName)) {
                return collection;
            }
        }
        throw new IllegalArgumentException("Collection not found: " + targetName);
    }

    /**
     * 仅在目标 workspace 不存在时创建新的 server workspace，满足第一阶段最小闭环。
     */
    private Workspace createWorkspace(VersionControlClient versionControlClient,
                                      Properties properties,
                                      String workspaceName,
                                      String computerName) {
        WorkingFolder[] folders = new WorkingFolder[0];
        String comment = properties.getProperty("comment", "mactfs phase one workspace");
        return versionControlClient.createWorkspace(
            folders,
            workspaceName,
            versionControlClient.getConnection().getAuthorizedAccountName(),
            computerName,
            comment,
            WorkspaceLocation.SERVER,
            WorkspaceOptions.NONE
        );
    }

    /**
     * 直接按名称和 owner 查询服务端工作区，避免依赖不稳定的本地缓存查询。
     */
    private Workspace findRepositoryWorkspace(VersionControlClient versionControlClient,
                                              String workspaceName,
                                              String ownerName) {
        try {
            return versionControlClient.getRepositoryWorkspace(workspaceName, ownerName);
        } catch (WorkspaceNotFoundException exception) {
            return null;
        }
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

    private void saveConfig(Properties properties, LocalConfigStore configStore) throws Exception {
        configStore.save(properties);
    }

    /**
     * 统一拼装日志文本，并在需要时同步推送到实时日志接收方。
     */
    private void appendLog(StringBuilder logs, CliLogSink logSink, String message) {
        logs.append(message).append('\n');
        if (logSink != null) {
            logSink.log(message);
        }
    }

    private void copy(CliArguments arguments, Properties target, String key) {
        String value = arguments.get(key);
        if (value != null && value.trim().length() > 0) {
            target.setProperty(key, value.trim());
        }
    }

    private boolean isTrue(String value) {
        return value != null && "true".equalsIgnoreCase(value.trim());
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

    private String required(Properties properties, String key) {
        String value = properties.getProperty(key);
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Missing required argument --" + key);
        }
        return value.trim();
    }

    public static class ExecutionResult {
        private final String logs;
        private final boolean getLatestExecuted;

        public ExecutionResult(String logs, boolean getLatestExecuted) {
            this.logs = logs;
            this.getLatestExecuted = getLatestExecuted;
        }

        public String getLogs() {
            return logs;
        }

        public boolean isGetLatestExecuted() {
            return getLatestExecuted;
        }
    }
}
