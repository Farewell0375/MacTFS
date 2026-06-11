package com.mydev.mactfs;

import com.mydev.mactfs.core.MacTfsCoreService;
import com.mydev.mactfs.core.MacTfsCoreService.ConnectionSummary;
import com.mydev.mactfs.core.MacTfsCoreService.CoreOperationResult;
import com.mydev.mactfs.core.MacTfsCoreService.TfsCheckinResult;
import com.mydev.mactfs.core.MacTfsCoreService.TfsCollectionInfo;
import com.mydev.mactfs.core.MacTfsCoreService.TfsConnectionConfig;
import com.mydev.mactfs.core.MacTfsCoreService.TfsFileContent;
import com.mydev.mactfs.core.MacTfsCoreService.TfsFileOperationResult;
import com.mydev.mactfs.core.MacTfsCoreService.TfsFolderDiffItem;
import com.mydev.mactfs.core.MacTfsCoreService.TfsGetLatestResult;
import com.mydev.mactfs.core.MacTfsCoreService.TfsHistoryEntry;
import com.mydev.mactfs.core.MacTfsCoreService.TfsMappingInfo;
import com.mydev.mactfs.core.MacTfsCoreService.TfsPendingChangeInfo;
import com.mydev.mactfs.core.MacTfsCoreService.TfsServerItem;
import com.mydev.mactfs.core.MacTfsCoreService.TfsTextDiff;
import com.mydev.mactfs.core.MacTfsCoreService.TfsWorkspaceInfo;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

/**
 * CLI 适配服务，负责把命令行参数转换为可复用 core 层调用。
 */
public class TfsPhaseOneService {

    private final MacTfsCoreService coreService = new MacTfsCoreService();

    /**
     * 执行连接测试动作，只验证认证和服务可达性。
     */
    public CliActionResult testConnection(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, loadReusableConfig(arguments, configStore));
        CoreOperationResult<ConnectionSummary> result = coreService.testConnection(toConfig(merged));
        return toCliResult(result, connectionSummaryToMap(result.getData()), logSink);
    }

    /**
     * 查询当前连接下可见的 Collection 列表，供桌面端下拉选择。
     */
    public CliActionResult listCollections(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, loadReusableConfig(arguments, configStore));
        CoreOperationResult<List<TfsCollectionInfo>> result = coreService.listCollections(toConfig(merged));
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("collections", collectionsToMaps(result.getData()));
        return toCliResult(result, data, logSink);
    }

    /**
     * 查询指定 Collection 下当前用户在本机可见的 Workspace。
     */
    public CliActionResult listWorkspaces(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        CoreOperationResult<TfsWorkspaceInfo> result = coreService.ensureWorkspace(
            toConfig(merged),
            required(merged, "collection"),
            merged.getProperty("workspace"),
            merged.getProperty("comment")
        );
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        List<Map<String, Object>> workspaces = new ArrayList<Map<String, Object>>();
        if (result.getData() != null) {
            workspaces.add(workspaceToMap(result.getData()));
        }
        data.put("collection", required(merged, "collection"));
        data.put("workspaces", workspaces);
        return toCliResult(result, data, logSink);
    }

    /**
     * 浏览指定 Collection 下的服务端目录结构，供桌面端资源管理页展示。
     */
    public CliActionResult browseServerPath(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        String serverPath = arguments.has("server-path") ? required(merged, "server-path") : "$/";
        CoreOperationResult<List<TfsServerItem>> result = coreService.browseServerPath(
            toConfig(merged),
            required(merged, "collection"),
            serverPath
        );
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("path", serverPath);
        data.put("items", serverItemsToMaps(result.getData()));
        return toCliResult(result, data, logSink);
    }

    /**
     * 查询或创建远端 Workspace，供桌面端在保存配置时即时落库到 TFS。
     */
    public CliActionResult ensureWorkspace(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        CoreOperationResult<TfsWorkspaceInfo> result = coreService.ensureWorkspace(
            toConfig(merged),
            required(merged, "collection"),
            merged.getProperty("workspace"),
            merged.getProperty("comment")
        );
        if (result.isSuccess()) {
            merged.setProperty("workspace", result.getData().getName());
            saveConfig(merged, configStore);
        }
        return toCliResult(result, workspaceToMap(result.getData()), logSink);
    }

    /**
     * 查询 Workspace 当前 Mapping 列表。
     */
    public CliActionResult listMappings(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        CoreOperationResult<List<TfsMappingInfo>> result = coreService.listMappings(
            toConfig(merged),
            required(merged, "collection"),
            required(merged, "workspace")
        );
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("mappings", mappingsToMaps(result.getData()));
        return toCliResult(result, data, logSink);
    }

    /**
     * 添加 Workspace Mapping，并保存最近一次 CLI 配置。
     */
    public CliActionResult addMapping(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        CoreOperationResult<TfsMappingInfo> result = coreService.addMapping(
            toConfig(merged),
            required(merged, "collection"),
            required(merged, "workspace"),
            required(merged, "server-path"),
            required(merged, "local-path")
        );
        if (result.isSuccess()) {
            saveConfig(merged, configStore);
        }
        return toCliResult(result, mappingToMap(result.getData()), logSink);
    }

    /**
     * 删除 Workspace Mapping。
     */
    public CliActionResult deleteMapping(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        CoreOperationResult<List<TfsMappingInfo>> result = coreService.deleteMapping(
            toConfig(merged),
            required(merged, "collection"),
            required(merged, "workspace"),
            merged.getProperty("server-path"),
            merged.getProperty("local-path")
        );
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("mappings", mappingsToMaps(result.getData()));
        return toCliResult(result, data, logSink);
    }

    /**
     * 对文件、目录或整个 Mapping 执行 Get Latest。
     */
    public CliActionResult getLatest(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        CoreOperationResult<TfsGetLatestResult> result = coreService.getLatest(
            toConfig(merged),
            required(merged, "collection"),
            required(merged, "workspace"),
            merged.getProperty("server-path"),
            !"false".equalsIgnoreCase(merged.getProperty("recursive"))
        );
        return toCliResult(result, getLatestToMap(result.getData()), logSink);
    }

    /**
     * 查询 Workspace 挂起更改。
     */
    public CliActionResult listPendingChanges(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        CoreOperationResult<List<TfsPendingChangeInfo>> result = coreService.listPendingChanges(
            toConfig(merged),
            required(merged, "collection"),
            required(merged, "workspace"),
            splitPaths(merged.getProperty("server-path"))
        );
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("pendingChanges", pendingChangesToMaps(result.getData()));
        return toCliResult(result, data, logSink);
    }

    /**
     * 执行 checkout、add、delete 或 undo 文件操作。
     */
    public CliActionResult fileOperation(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink, String operation) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        List<String> paths = splitPaths(required(merged, "path"));
        boolean recursive = "true".equalsIgnoreCase(merged.getProperty("recursive"));
        CoreOperationResult<TfsFileOperationResult> result;
        if ("checkout".equals(operation)) {
            result = coreService.checkout(toConfig(merged), required(merged, "collection"), required(merged, "workspace"), paths, recursive);
        } else if ("add".equals(operation)) {
            result = coreService.add(toConfig(merged), required(merged, "collection"), required(merged, "workspace"), paths);
        } else if ("delete".equals(operation)) {
            result = coreService.delete(toConfig(merged), required(merged, "collection"), required(merged, "workspace"), paths, recursive);
        } else {
            result = coreService.undo(toConfig(merged), required(merged, "collection"), required(merged, "workspace"), paths, recursive);
        }
        return toCliResult(result, fileOperationToMap(result.getData()), logSink);
    }

    /**
     * 按选中的 pending changes 执行 checkin。
     */
    public CliActionResult checkin(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        CoreOperationResult<TfsCheckinResult> result = coreService.checkin(
            toConfig(merged),
            required(merged, "collection"),
            required(merged, "workspace"),
            splitPaths(required(merged, "server-path")),
            required(merged, "comment")
        );
        return toCliResult(result, checkinToMap(result.getData()), logSink);
    }

    /**
     * 执行已映射目录的递归对比。
     */
    public CliActionResult compareFolder(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        CoreOperationResult<List<TfsFolderDiffItem>> result = coreService.compareFolder(
            toConfig(merged),
            required(merged, "collection"),
            required(merged, "workspace"),
            required(merged, "server-path"),
            merged.getProperty("local-path"),
            !"false".equalsIgnoreCase(merged.getProperty("recursive")),
            !"false".equalsIgnoreCase(merged.getProperty("include-local-only"))
        );
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("diffs", folderDiffsToMaps(result.getData()));
        return toCliResult(result, data, logSink);
    }

    /**
     * 查询历史记录或 changeset 文件列表。
     */
    public CliActionResult history(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        CoreOperationResult<List<TfsHistoryEntry>> result;
        if (merged.getProperty("changeset") != null) {
            result = coreService.queryChangesetFiles(toConfig(merged), required(merged, "collection"), Integer.parseInt(required(merged, "changeset")));
        } else {
            result = coreService.queryHistory(
                toConfig(merged),
                required(merged, "collection"),
                required(merged, "server-path"),
                "true".equalsIgnoreCase(merged.getProperty("folder"))
            );
        }
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("history", historyToMaps(result.getData()));
        return toCliResult(result, data, logSink);
    }

    /**
     * 获取服务端文件内容。
     */
    public CliActionResult fileContent(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        Integer changeset = merged.getProperty("changeset") == null ? null : Integer.valueOf(required(merged, "changeset"));
        CoreOperationResult<TfsFileContent> result = coreService.getFileContent(
            toConfig(merged),
            required(merged, "collection"),
            required(merged, "server-path"),
            changeset
        );
        return toCliResult(result, fileContentToMap(result.getData()), logSink);
    }

    /**
     * 生成本地/latest 或两个历史版本的文本 diff。
     */
    public CliActionResult diff(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        CoreOperationResult<TfsTextDiff> result;
        if (merged.getProperty("source-changeset") != null && merged.getProperty("target-changeset") != null) {
            result = coreService.diffRevisions(
                toConfig(merged),
                required(merged, "collection"),
                required(merged, "server-path"),
                Integer.parseInt(required(merged, "source-changeset")),
                Integer.parseInt(required(merged, "target-changeset"))
            );
        } else {
            result = coreService.diffLocalLatest(
                toConfig(merged),
                required(merged, "collection"),
                required(merged, "server-path"),
                required(merged, "local-path")
            );
        }
        return toCliResult(result, diffToMap(result.getData()), logSink);
    }

    /**
     * 执行完整同步动作，覆盖 Workspace 查询/创建、映射保存和 Get Latest。
     */
    public CliActionResult sync(CliArguments arguments, LocalConfigStore configStore, CliLogSink logSink) throws Exception {
        Properties merged = mergeArguments(arguments, configStore.load());
        if (isTrue(merged.getProperty("list-only"))) {
            return listCollections(arguments, configStore, logSink);
        }

        CoreOperationResult<TfsWorkspaceInfo> workspaceResult = coreService.ensureWorkspace(
            toConfig(merged),
            required(merged, "collection"),
            merged.getProperty("workspace"),
            merged.getProperty("comment")
        );
        if (!workspaceResult.isSuccess()) {
            return toCliResult(workspaceResult, workspaceToMap(workspaceResult.getData()), logSink);
        }

        merged.setProperty("workspace", workspaceResult.getData().getName());
        CoreOperationResult<TfsMappingInfo> mappingResult = coreService.addMapping(
            toConfig(merged),
            required(merged, "collection"),
            required(merged, "workspace"),
            required(merged, "server-path"),
            new File(required(merged, "local-path")).getAbsolutePath()
        );
        if (!mappingResult.isSuccess()) {
            return toCliResult(mappingResult, mappingToMap(mappingResult.getData()), logSink);
        }

        CoreOperationResult<TfsGetLatestResult> latestResult = coreService.getLatest(
            toConfig(merged),
            required(merged, "collection"),
            required(merged, "workspace"),
            required(merged, "server-path"),
            true
        );
        if (latestResult.isSuccess()) {
            saveConfig(merged, configStore);
        }
        Map<String, Object> data = getLatestToMap(latestResult.getData());
        data.put("workspaceName", workspaceResult.getData().getName());
        data.put("workspaceOwner", workspaceResult.getData().getOwnerName());
        data.put("serverPath", mappingResult.getData().getServerPath());
        data.put("localPath", mappingResult.getData().getLocalPath());
        return toCliResult(latestResult, data, logSink);
    }

    /**
     * 兼容原第一阶段 CLI 的同步执行入口。
     */
    public ExecutionResult execute(CliArguments arguments, LocalConfigStore configStore) throws Exception {
        CliActionResult result = sync(arguments, configStore, null);
        boolean getLatestExecuted = result.getData().containsKey("updated");
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
        copy(arguments, merged, "path");
        copy(arguments, merged, "recursive");
        copy(arguments, merged, "folder");
        copy(arguments, merged, "changeset");
        copy(arguments, merged, "source-changeset");
        copy(arguments, merged, "target-changeset");
        if (arguments.has("list-only")) {
            copy(arguments, merged, "list-only");
        } else {
            merged.remove("list-only");
        }
        return merged;
    }

    private TfsConnectionConfig toConfig(Properties properties) {
        return new TfsConnectionConfig(
            required(properties, "server-uri"),
            properties.getProperty("auth-type", "ntlm-explicit"),
            properties.getProperty("domain"),
            properties.getProperty("username"),
            properties.getProperty("password")
        );
    }

    /**
     * 连接类动作只有显式 reuse-config 时读取本地配置，保留缺参时的清晰失败。
     */
    private Properties loadReusableConfig(CliArguments arguments, LocalConfigStore configStore) throws Exception {
        if (arguments.getBoolean("reuse-config")) {
            return configStore.load();
        }
        return new Properties();
    }

    private CliActionResult toCliResult(CoreOperationResult<?> result, Map<String, Object> data, CliLogSink logSink) {
        String logs = logsToString(result.getLogs(), logSink);
        Map<String, Object> payload = data == null ? new LinkedHashMap<String, Object>() : data;
        payload.put("operation", result.getOperation());
        payload.put("startedAt", Long.valueOf(result.getStartedAt()));
        payload.put("endedAt", Long.valueOf(result.getEndedAt()));
        payload.put("durationMillis", Long.valueOf(result.getDurationMillis()));
        if (result.isSuccess()) {
            return CliActionResult.success(result.getMessage(), logs, payload);
        }
        return CliActionResult.failure(result.getErrorMessage(), logs, payload);
    }

    private String logsToString(List<String> logs, CliLogSink logSink) {
        StringBuilder builder = new StringBuilder();
        if (logs == null) {
            return "";
        }
        for (String log : logs) {
            builder.append(log).append('\n');
            if (logSink != null) {
                logSink.log(log);
            }
        }
        return builder.toString();
    }

    private Map<String, Object> connectionSummaryToMap(ConnectionSummary summary) {
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        if (summary != null) {
            data.put("serverUri", summary.getServerUri());
            data.put("collectionCount", Integer.valueOf(summary.getCollectionCount()));
        }
        return data;
    }

    private List<Map<String, Object>> collectionsToMaps(List<TfsCollectionInfo> collections) {
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();
        if (collections == null) {
            return result;
        }
        for (TfsCollectionInfo collection : collections) {
            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("name", collection.getName());
            item.put("id", collection.getId());
            result.add(item);
        }
        return result;
    }

    private List<Map<String, Object>> serverItemsToMaps(List<TfsServerItem> items) {
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();
        if (items == null) {
            return result;
        }
        for (TfsServerItem item : items) {
            Map<String, Object> node = new LinkedHashMap<String, Object>();
            node.put("name", item.getName());
            node.put("path", item.getServerPath());
            node.put("serverPath", item.getServerPath());
            node.put("folder", Boolean.valueOf(item.isFolder()));
            node.put("latestVersion", Integer.valueOf(item.getLatestVersion()));
            node.put("checkinDate", item.getCheckinDate());
            result.add(node);
        }
        return result;
    }

    private Map<String, Object> workspaceToMap(TfsWorkspaceInfo workspace) {
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        if (workspace != null) {
            data.put("workspaceName", workspace.getName());
            data.put("name", workspace.getName());
            data.put("ownerName", workspace.getOwnerName());
            data.put("computer", workspace.getComputer());
            data.put("comment", workspace.getComment());
            data.put("created", Boolean.valueOf(workspace.isCreated()));
            data.put("mappings", mappingsToMaps(workspace.getMappings()));
        }
        return data;
    }

    private List<Map<String, Object>> mappingsToMaps(List<TfsMappingInfo> mappings) {
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();
        if (mappings == null) {
            return result;
        }
        for (TfsMappingInfo mapping : mappings) {
            result.add(mappingToMap(mapping));
        }
        return result;
    }

    private Map<String, Object> mappingToMap(TfsMappingInfo mapping) {
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        if (mapping != null) {
            data.put("serverPath", mapping.getServerPath());
            data.put("localPath", mapping.getLocalPath());
        }
        return data;
    }

    private Map<String, Object> getLatestToMap(TfsGetLatestResult latest) {
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        if (latest != null) {
            data.put("updated", Integer.valueOf(latest.getUpdated()));
            data.put("updatedFiles", Integer.valueOf(latest.getUpdated()));
            data.put("operations", Integer.valueOf(latest.getOperations()));
            data.put("conflicts", Integer.valueOf(latest.getConflicts()));
            data.put("failures", Integer.valueOf(latest.getFailures()));
        }
        return data;
    }

    private List<Map<String, Object>> pendingChangesToMaps(List<TfsPendingChangeInfo> changes) {
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();
        if (changes == null) {
            return result;
        }
        for (TfsPendingChangeInfo change : changes) {
            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("serverPath", change.getServerPath());
            item.put("localPath", change.getLocalPath());
            item.put("name", change.getName());
            item.put("folder", Boolean.valueOf(change.isFolder()));
            item.put("status", change.getStatus());
            item.put("changeType", change.getChangeType());
            item.put("version", Integer.valueOf(change.getVersion()));
            result.add(item);
        }
        return result;
    }

    private Map<String, Object> fileOperationToMap(TfsFileOperationResult operation) {
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        if (operation != null) {
            data.put("operation", operation.getOperation());
            data.put("affected", Integer.valueOf(operation.getAffected()));
            data.put("failures", operation.getFailures());
        }
        return data;
    }

    private Map<String, Object> checkinToMap(TfsCheckinResult checkin) {
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        if (checkin != null) {
            data.put("changeset", Integer.valueOf(checkin.getChangeset()));
            data.put("submittedChanges", Integer.valueOf(checkin.getSubmittedChanges()));
        }
        return data;
    }

    private List<Map<String, Object>> folderDiffsToMaps(List<TfsFolderDiffItem> diffs) {
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();
        if (diffs == null) {
            return result;
        }
        for (TfsFolderDiffItem diff : diffs) {
            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("serverPath", diff.getServerPath());
            item.put("localPath", diff.getLocalPath());
            item.put("name", diff.getName());
            item.put("folder", Boolean.valueOf(diff.isFolder()));
            item.put("status", diff.getStatus());
            item.put("localVersion", Integer.valueOf(diff.getLocalVersion()));
            item.put("latestVersion", Integer.valueOf(diff.getLatestVersion()));
            result.add(item);
        }
        return result;
    }

    private List<Map<String, Object>> historyToMaps(List<TfsHistoryEntry> history) {
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();
        if (history == null) {
            return result;
        }
        for (TfsHistoryEntry entry : history) {
            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("serverPath", entry.getServerPath());
            item.put("path", entry.getServerPath());
            item.put("name", entry.getName());
            item.put("changeType", entry.getChangeType());
            item.put("itemType", entry.getItemType());
            item.put("changeset", Integer.valueOf(entry.getChangeset()));
            item.put("author", entry.getAuthor());
            item.put("date", entry.getDate());
            item.put("comment", entry.getComment());
            result.add(item);
        }
        return result;
    }

    private Map<String, Object> fileContentToMap(TfsFileContent content) {
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        if (content != null) {
            data.put("serverPath", content.getServerPath());
            data.put("changeset", Integer.valueOf(content.getChangeset()));
            data.put("content", content.getContent());
            data.put("binary", Boolean.valueOf(content.isBinary()));
        }
        return data;
    }

    private Map<String, Object> diffToMap(TfsTextDiff diff) {
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        if (diff != null) {
            data.put("sourceLabel", diff.getSourceLabel());
            data.put("targetLabel", diff.getTargetLabel());
            data.put("lines", diff.getLines());
        }
        return data;
    }

    private List<String> splitPaths(String value) {
        if (value == null || value.trim().isEmpty()) {
            return new ArrayList<String>();
        }
        return Arrays.asList(value.split(","));
    }

    private void saveConfig(Properties properties, LocalConfigStore configStore) throws Exception {
        configStore.save(properties);
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
