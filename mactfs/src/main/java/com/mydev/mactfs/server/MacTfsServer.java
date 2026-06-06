package com.mydev.mactfs.server;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mydev.mactfs.core.MacTfsCoreService;
import com.mydev.mactfs.core.MacTfsCoreService.ConnectionSummary;
import com.mydev.mactfs.core.MacTfsCoreService.CoreOperationResult;
import com.mydev.mactfs.core.MacTfsCoreService.TfsCheckinResult;
import com.mydev.mactfs.core.MacTfsCoreService.TfsCollectionInfo;
import com.mydev.mactfs.core.MacTfsCoreService.TfsConnectionConfig;
import com.mydev.mactfs.core.MacTfsCoreService.TfsFileOperationResult;
import com.mydev.mactfs.core.MacTfsCoreService.TfsFolderDiffItem;
import com.mydev.mactfs.core.MacTfsCoreService.TfsGetLatestResult;
import com.mydev.mactfs.core.MacTfsCoreService.TfsHistoryEntry;
import com.mydev.mactfs.core.MacTfsCoreService.TfsMappingInfo;
import com.mydev.mactfs.core.MacTfsCoreService.TfsPendingChangeInfo;
import com.mydev.mactfs.core.MacTfsCoreService.TfsServerItem;
import com.mydev.mactfs.core.MacTfsCoreService.TfsTextDiff;
import com.mydev.mactfs.core.MacTfsCoreService.TfsWorkspaceInfo;
import spark.Request;
import spark.Response;
import spark.Spark;

import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * macTFS 第二阶段本地 API 服务入口，负责 HTTP 路由、Token 校验、配置、会话、日志和超时控制。
 */
public class MacTfsServer {

    private static final String HOST = "127.0.0.1";
    private static final int PORT = 38765;
    private static final long TIMEOUT_CONNECT_MS = TimeUnit.SECONDS.toMillis(30);
    private static final long TIMEOUT_DIRECTORY_MS = TimeUnit.SECONDS.toMillis(120);
    private static final long TIMEOUT_HISTORY_MS = TimeUnit.SECONDS.toMillis(120);
    private static final long TIMEOUT_COMPARE_MS = TimeUnit.SECONDS.toMillis(120);
    private static final long TIMEOUT_DIFF_MS = TimeUnit.SECONDS.toMillis(60);
    private static final long TIMEOUT_LONG_WRITE_MS = TimeUnit.SECONDS.toMillis(300);
    private static final long TIMEOUT_DEFAULT_MS = TimeUnit.SECONDS.toMillis(120);

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final MacTfsCoreService coreService = new MacTfsCoreService();
    private final ServerConfigStore configStore = new ServerConfigStore(objectMapper);
    private final ServerTokenStore tokenStore = new ServerTokenStore();
    private final OperationLogStore logStore = new OperationLogStore();
    private final SessionManager sessionManager = new SessionManager();
    private final ExecutorService executorService = Executors.newCachedThreadPool();

    /**
     * 启动本地 API 服务，供 Electron、CLI 或 curl 调用。
     */
    public static void main(String[] args) throws Exception {
        new MacTfsServer().start();
    }

    /**
     * 初始化 native 路径、Token 文件和 Spark 路由。
     */
    public void start() throws Exception {
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        configureNativeDirectory();
        tokenStore.loadOrCreate();
        Spark.ipAddress(HOST);
        Spark.port(PORT);
        registerFilters();
        registerRoutes();
        Spark.awaitInitialization();
        System.out.println("macTFS API server listening on http://" + HOST + ":" + PORT);
        System.out.println("macTFS token file: " + tokenStore.getTokenFile().getAbsolutePath());
    }

    /**
     * 停止 Spark 服务，供测试或宿主进程退出时调用。
     */
    public void stop() {
        Spark.stop();
        executorService.shutdownNow();
    }

    /**
     * 自动指向发行包或项目内 native 目录，满足 TFS SDK 加载 JNI 库的运行约束。
     */
    private void configureNativeDirectory() {
        String property = "com.microsoft.tfs.jni.native.base-directory";
        if (System.getProperty(property) != null) {
            return;
        }
        File nativeDirectory = resolveNativeDirectory();
        if (nativeDirectory != null && nativeDirectory.exists()) {
            System.setProperty(property, nativeDirectory.getAbsolutePath());
        }
    }

    /**
     * 按安装包、源码目录两种运行方式查找 TFS native 库。
     */
    private File resolveNativeDirectory() {
        try {
            File codeSource = new File(MacTfsServer.class.getProtectionDomain().getCodeSource().getLocation().toURI());
            File libDirectory = codeSource.isFile() ? codeSource.getParentFile() : codeSource;
            File installNativeDirectory = new File(libDirectory, "native");
            if (installNativeDirectory.exists()) {
                return installNativeDirectory;
            }
            File cliProjectNativeDirectory = new File(libDirectory, "../../tfsIntegration/lib/native").getCanonicalFile();
            if (cliProjectNativeDirectory.exists()) {
                return cliProjectNativeDirectory;
            }
            File workingProjectNativeDirectory = new File(System.getProperty("user.dir"), "../tfsIntegration/lib/native").getCanonicalFile();
            if (workingProjectNativeDirectory.exists()) {
                return workingProjectNativeDirectory;
            }
        } catch (Exception exception) {
            return null;
        }
        return null;
    }

    /**
     * 注册跨域头和 Bearer Token 认证过滤器。
     */
    private void registerFilters() {
        Spark.before((request, response) -> {
            response.header("Access-Control-Allow-Origin", "*");
            response.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
            response.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            if ("OPTIONS".equalsIgnoreCase(request.requestMethod())) {
                throw Spark.halt(204, "");
            }
            if (request.pathInfo().startsWith("/api/") && !tokenStore.matches(request.headers("Authorization"))) {
                response.type("application/json;charset=utf-8");
                throw Spark.halt(401, objectMapper.writeValueAsString(ApiResult.failure("Unauthorized", 401)));
            }
        });
        Spark.after((request, response) -> response.type("application/json;charset=utf-8"));
    }

    /**
     * 注册第二阶段约定的全部 REST API 路由。
     */
    private void registerRoutes() {
        Spark.get("/api/health", (request, response) -> handle(request, response, "health", TIMEOUT_DEFAULT_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) {
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("status", "ok");
                data.put("host", HOST);
                data.put("port", Integer.valueOf(PORT));
                data.put("tokenFile", tokenStore.getTokenFile().getAbsolutePath());
                data.put("configFile", configStore.getConfigFile().getAbsolutePath());
                data.put("connected", Boolean.valueOf(sessionManager.isConnected()));
                return ApiResult.success("ok", data);
            }
        }));

        Spark.get("/api/config", (request, response) -> handle(request, response, "getConfig", TIMEOUT_DEFAULT_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("config", configStore.load());
                return ApiResult.success("success", data);
            }
        }));

        Spark.put("/api/config", (request, response) -> handle(request, response, "saveConfig", TIMEOUT_DEFAULT_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                AppConfig config = objectMapper.readValue(emptyToJson(request.body()), AppConfig.class);
                configStore.save(normalizeConfig(config));
                sessionManager.setConfig(config);
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("config", config);
                return ApiResult.success("success", data);
            }
        }));

        Spark.post("/api/session/connect", (request, response) -> handle(request, response, "connect", TIMEOUT_CONNECT_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                AppConfig config = requestConfig(readBody(request));
                CoreOperationResult<ConnectionSummary> result = coreService.testConnection(toTfsConfig(config));
                if (result.isSuccess()) {
                    configStore.save(config);
                    sessionManager.connect(config, result.getData());
                }
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                if (result.getData() != null) {
                    data.put("serverUri", result.getData().getServerUri());
                    data.put("collectionCount", Integer.valueOf(result.getData().getCollectionCount()));
                }
                return fromCore(result, data);
            }
        }));

        Spark.get("/api/collections", (request, response) -> handle(request, response, "listCollections", TIMEOUT_DIRECTORY_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                AppConfig config = requestConfig(new LinkedHashMap<String, Object>());
                CoreOperationResult<List<TfsCollectionInfo>> result = coreService.listCollections(toTfsConfig(config));
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("collections", result.getData() == null ? Collections.emptyList() : result.getData());
                return fromCore(result, data);
            }
        }));

        Spark.get("/api/server-tree", (request, response) -> handle(request, response, "serverTree", TIMEOUT_DIRECTORY_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                return browseServerItems(request);
            }
        }));

        Spark.get("/api/server-folder/items", (request, response) -> handle(request, response, "serverFolderItems", TIMEOUT_DIRECTORY_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                return browseServerItems(request);
            }
        }));

        Spark.get("/api/workspace", (request, response) -> handle(request, response, "getWorkspace", TIMEOUT_DIRECTORY_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                AppConfig config = requestConfig(new LinkedHashMap<String, Object>());
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                if (isBlank(config.collection) || isBlank(config.workspace)) {
                    data.put("workspace", config.workspace);
                    data.put("mappings", config.mappings);
                    return ApiResult.success("success", data);
                }
                CoreOperationResult<List<TfsMappingInfo>> result = coreService.listMappings(toTfsConfig(config), config.collection, config.workspace);
                data.put("workspace", config.workspace);
                data.put("mappings", result.getData() == null ? Collections.emptyList() : result.getData());
                return fromCore(result, data);
            }
        }));

        Spark.post("/api/workspace/ensure", (request, response) -> handle(request, response, "ensureWorkspace", TIMEOUT_DIRECTORY_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                Map<String, Object> body = readBody(request);
                AppConfig config = requestConfig(body);
                String collection = configValue(body, "collection", config.collection);
                String workspace = configValue(body, "workspace", config.workspace);
                String comment = stringValue(body, "comment");
                CoreOperationResult<TfsWorkspaceInfo> result = coreService.ensureWorkspace(toTfsConfig(config), collection, workspace, comment);
                if (result.isSuccess() && result.getData() != null) {
                    config.collection = collection;
                    config.workspace = result.getData().getName();
                    config.mappings = mappingConfigs(result.getData().getMappings());
                    configStore.save(config);
                    sessionManager.setConfig(config);
                }
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("workspace", result.getData());
                return fromCore(result, data);
            }
        }));

        Spark.get("/api/mappings", (request, response) -> handle(request, response, "listMappings", TIMEOUT_DIRECTORY_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                AppConfig config = requestConfig(new LinkedHashMap<String, Object>());
                CoreOperationResult<List<TfsMappingInfo>> result = coreService.listMappings(toTfsConfig(config), require(config.collection, "collection"), require(config.workspace, "workspace"));
                if (result.isSuccess()) {
                    config.mappings = mappingConfigs(result.getData());
                    configStore.save(config);
                    sessionManager.setConfig(config);
                }
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("mappings", result.getData() == null ? Collections.emptyList() : result.getData());
                return fromCore(result, data);
            }
        }));

        Spark.post("/api/mappings", (request, response) -> handle(request, response, "addMapping", TIMEOUT_LONG_WRITE_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                Map<String, Object> body = readBody(request);
                AppConfig config = requestConfig(body);
                String serverPath = require(stringValue(body, "serverPath"), "serverPath");
                String localPath = require(stringValue(body, "localPath"), "localPath");
                CoreOperationResult<TfsMappingInfo> result = coreService.addMapping(toTfsConfig(config), require(config.collection, "collection"), require(config.workspace, "workspace"), serverPath, localPath);
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("mapping", result.getData());
                if (result.isSuccess()) {
                    CoreOperationResult<List<TfsMappingInfo>> mappings = coreService.listMappings(toTfsConfig(config), config.collection, config.workspace);
                    if (mappings.isSuccess()) {
                        config.mappings = mappingConfigs(mappings.getData());
                    }
                    if (booleanValue(body, "getLatest", false)) {
                        CoreOperationResult<TfsGetLatestResult> latest = coreService.getLatest(toTfsConfig(config), config.collection, config.workspace, serverPath, true);
                        data.put("getLatest", latest.getData());
                        if (!latest.isSuccess()) {
                            return fromCore(latest, data);
                        }
                    }
                    configStore.save(config);
                    sessionManager.setConfig(config);
                }
                return fromCore(result, data);
            }
        }));

        Spark.delete("/api/mappings", (request, response) -> handle(request, response, "deleteMapping", TIMEOUT_DIRECTORY_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                Map<String, Object> body = readBody(request);
                AppConfig config = requestConfig(body);
                String serverPath = firstPresent(stringValue(body, "serverPath"), request.queryParams("serverPath"));
                String localPath = firstPresent(stringValue(body, "localPath"), request.queryParams("localPath"));
                CoreOperationResult<List<TfsMappingInfo>> result = coreService.deleteMapping(toTfsConfig(config), require(config.collection, "collection"), require(config.workspace, "workspace"), serverPath, localPath);
                if (result.isSuccess()) {
                    config.mappings = mappingConfigs(result.getData());
                    configStore.save(config);
                    sessionManager.setConfig(config);
                }
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("mappings", result.getData() == null ? Collections.emptyList() : result.getData());
                return fromCore(result, data);
            }
        }));

        Spark.post("/api/files/get-latest", (request, response) -> handle(request, response, "getLatest", TIMEOUT_LONG_WRITE_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                Map<String, Object> body = readBody(request);
                AppConfig config = requestConfig(body);
                CoreOperationResult<TfsGetLatestResult> result = coreService.getLatest(toTfsConfig(config), require(config.collection, "collection"), require(config.workspace, "workspace"), stringValue(body, "serverPath"), booleanValue(body, "recursive", true));
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("result", result.getData());
                return fromCore(result, data);
            }
        }));

        Spark.post("/api/files/checkout", (request, response) -> handle(request, response, "checkout", TIMEOUT_DEFAULT_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                return fileOperation(request, "checkout");
            }
        }));

        Spark.post("/api/files/add", (request, response) -> handle(request, response, "add", TIMEOUT_DEFAULT_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                return fileOperation(request, "add");
            }
        }));

        Spark.post("/api/files/delete", (request, response) -> handle(request, response, "delete", TIMEOUT_DEFAULT_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                return fileOperation(request, "delete");
            }
        }));

        Spark.post("/api/files/undo", (request, response) -> handle(request, response, "undo", TIMEOUT_DEFAULT_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                return fileOperation(request, "undo");
            }
        }));

        Spark.get("/api/pending-changes", (request, response) -> handle(request, response, "pendingChanges", TIMEOUT_DEFAULT_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                AppConfig config = requestConfig(new LinkedHashMap<String, Object>());
                CoreOperationResult<List<TfsPendingChangeInfo>> result = coreService.listPendingChanges(toTfsConfig(config), require(config.collection, "collection"), require(config.workspace, "workspace"), splitPaths(request.queryParams("serverPath")));
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("pendingChanges", result.getData() == null ? Collections.emptyList() : result.getData());
                return fromCore(result, data);
            }
        }));

        Spark.post("/api/checkin", (request, response) -> handle(request, response, "checkin", TIMEOUT_LONG_WRITE_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                Map<String, Object> body = readBody(request);
                AppConfig config = requestConfig(body);
                List<String> paths = requestPaths(body);
                CoreOperationResult<TfsCheckinResult> result = coreService.checkin(toTfsConfig(config), require(config.collection, "collection"), require(config.workspace, "workspace"), paths, require(stringValue(body, "comment"), "comment"));
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("checkin", result.getData());
                return fromCore(result, data);
            }
        }));

        Spark.post("/api/compare/folder", (request, response) -> handle(request, response, "compareFolder", TIMEOUT_COMPARE_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                Map<String, Object> body = readBody(request);
                AppConfig config = requestConfig(body);
                CoreOperationResult<List<TfsFolderDiffItem>> result = coreService.compareFolder(toTfsConfig(config), require(config.collection, "collection"), require(config.workspace, "workspace"), require(stringValue(body, "serverPath"), "serverPath"), stringValue(body, "localPath"), booleanValue(body, "recursive", true));
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("diffs", result.getData() == null ? Collections.emptyList() : result.getData());
                return fromCore(result, data);
            }
        }));

        Spark.get("/api/history", (request, response) -> handle(request, response, "history", TIMEOUT_HISTORY_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                AppConfig config = requestConfig(new LinkedHashMap<String, Object>());
                CoreOperationResult<List<TfsHistoryEntry>> result = coreService.queryHistory(toTfsConfig(config), require(config.collection, "collection"), require(request.queryParams("path"), "path"), "true".equalsIgnoreCase(request.queryParams("folder")));
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("history", result.getData() == null ? Collections.emptyList() : result.getData());
                return fromCore(result, data);
            }
        }));

        Spark.get("/api/history/changeset", (request, response) -> handle(request, response, "changeset", TIMEOUT_HISTORY_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                AppConfig config = requestConfig(new LinkedHashMap<String, Object>());
                CoreOperationResult<List<TfsHistoryEntry>> result = coreService.queryChangesetFiles(toTfsConfig(config), require(config.collection, "collection"), Integer.parseInt(require(request.queryParams("changeset"), "changeset")));
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("files", result.getData() == null ? Collections.emptyList() : result.getData());
                return fromCore(result, data);
            }
        }));

        Spark.post("/api/diff/local-latest", (request, response) -> handle(request, response, "diffLocalLatest", TIMEOUT_DIFF_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                Map<String, Object> body = readBody(request);
                AppConfig config = requestConfig(body);
                CoreOperationResult<TfsTextDiff> result = coreService.diffLocalLatest(toTfsConfig(config), require(config.collection, "collection"), require(stringValue(body, "serverPath"), "serverPath"), require(stringValue(body, "localPath"), "localPath"));
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("diff", result.getData());
                return fromCore(result, data);
            }
        }));

        Spark.post("/api/diff/revisions", (request, response) -> handle(request, response, "diffRevisions", TIMEOUT_DIFF_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) throws Exception {
                Map<String, Object> body = readBody(request);
                AppConfig config = requestConfig(body);
                CoreOperationResult<TfsTextDiff> result = coreService.diffRevisions(
                    toTfsConfig(config),
                    require(config.collection, "collection"),
                    require(stringValue(body, "serverPath"), "serverPath"),
                    intValue(body, "sourceChangeset"),
                    intValue(body, "targetChangeset")
                );
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("diff", result.getData());
                return fromCore(result, data);
            }
        }));

        Spark.get("/api/logs", (request, response) -> handle(request, response, "operationLogs", TIMEOUT_DEFAULT_MS, new ApiCallable() {
            @Override
            public ApiResult call(Request request) {
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("logs", logStore.recent());
                return ApiResult.success("success", data);
            }
        }));
    }

    /**
     * 浏览服务端目录并补齐 UI 需要的路径和类型字段。
     */
    private ApiResult browseServerItems(Request request) throws Exception {
        AppConfig config = requestConfig(new LinkedHashMap<String, Object>());
        String path = firstPresent(request.queryParams("path"), "$/");
        String collection = firstPresent(request.queryParams("collection"), config.collection);
        CoreOperationResult<List<TfsServerItem>> result = coreService.browseServerPath(toTfsConfig(config), require(collection, "collection"), path);
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("path", path);
        data.put("items", serverItems(result.getData()));
        return fromCore(result, data);
    }

    /**
     * 分发 checkout、add、delete、undo 四类文件操作，保持请求结构一致。
     */
    private ApiResult fileOperation(Request request, String operation) throws Exception {
        Map<String, Object> body = readBody(request);
        AppConfig config = requestConfig(body);
        List<String> paths = requestPaths(body);
        boolean recursive = booleanValue(body, "recursive", false);
        CoreOperationResult<TfsFileOperationResult> result;
        if ("checkout".equals(operation)) {
            result = coreService.checkout(toTfsConfig(config), require(config.collection, "collection"), require(config.workspace, "workspace"), paths, recursive);
        } else if ("add".equals(operation)) {
            result = coreService.add(toTfsConfig(config), require(config.collection, "collection"), require(config.workspace, "workspace"), paths);
        } else if ("delete".equals(operation)) {
            result = coreService.delete(toTfsConfig(config), require(config.collection, "collection"), require(config.workspace, "workspace"), paths, recursive);
        } else {
            result = coreService.undo(toTfsConfig(config), require(config.collection, "collection"), require(config.workspace, "workspace"), paths, recursive);
        }
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("result", result.getData());
        return fromCore(result, data);
    }

    /**
     * 统一执行 API 调用，集中处理耗时统计、超时、异常和操作日志。
     */
    private String handle(Request request, Response response, String operation, long timeoutMs, ApiCallable callable) throws Exception {
        long startedAt = System.currentTimeMillis();
        ApiResult result;
        Future<ApiResult> future = executorService.submit(new Callable<ApiResult>() {
            @Override
            public ApiResult call() throws Exception {
                return callable.call(request);
            }
        });
        try {
            result = future.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException exception) {
            future.cancel(true);
            result = ApiResult.failure("Operation timed out", 504);
        } catch (ExecutionException exception) {
            Throwable cause = exception.getCause() == null ? exception : exception.getCause();
            result = ApiResult.failure(cause.getMessage(), cause instanceof IllegalArgumentException ? 400 : 500);
        }

        long endedAt = System.currentTimeMillis();
        result.operation = operation;
        result.durationMs = endedAt - startedAt;
        result.startedAt = startedAt;
        result.endedAt = endedAt;
        response.status(result.status);
        logStore.add(operation, summarize(request), startedAt, endedAt, result);
        return objectMapper.writeValueAsString(result);
    }

    /**
     * 从当前会话或配置文件读取连接配置，并允许请求体覆盖当前操作相关字段。
     */
    private AppConfig requestConfig(Map<String, Object> body) throws Exception {
        AppConfig base = sessionManager.getConfig();
        if (base == null) {
            base = configStore.load();
        }
        AppConfig config = copyConfig(base);
        copyString(body, config, "serverUri");
        copyString(body, config, "authType");
        copyString(body, config, "domain");
        copyString(body, config, "username");
        copyString(body, config, "password");
        copyString(body, config, "collection");
        copyString(body, config, "workspace");
        return normalizeConfig(config);
    }

    /**
     * 把服务端配置转换为 core 层连接配置。
     */
    private TfsConnectionConfig toTfsConfig(AppConfig config) {
        return new TfsConnectionConfig(config.serverUri, config.authType, config.domain, config.username, config.password);
    }

    /**
     * 将 core 执行结果转换成统一 API 响应。
     */
    private ApiResult fromCore(CoreOperationResult<?> result, Map<String, Object> data) {
        ApiResult apiResult = result.isSuccess()
            ? ApiResult.success(result.getMessage(), data)
            : ApiResult.failure(result.getErrorMessage(), 500);
        if (!result.isSuccess() && data != null) {
            apiResult.data.putAll(data);
        }
        apiResult.logs = result.getLogs();
        apiResult.data.put("coreOperation", result.getOperation());
        apiResult.data.put("coreDurationMs", Long.valueOf(result.getDurationMillis()));
        return apiResult;
    }

    /**
     * 读取 JSON 请求体，空请求体按空对象处理。
     */
    private Map<String, Object> readBody(Request request) throws IOException {
        if (request.body() == null || request.body().trim().isEmpty()) {
            return new LinkedHashMap<String, Object>();
        }
        return objectMapper.readValue(request.body(), new TypeReference<LinkedHashMap<String, Object>>() {
        });
    }

    /**
     * 将空请求体转换为 JSON 空对象，便于 Jackson 反序列化。
     */
    private String emptyToJson(String body) {
        return body == null || body.trim().isEmpty() ? "{}" : body;
    }

    /**
     * 复制配置，避免请求级覆盖污染当前会话对象。
     */
    private AppConfig copyConfig(AppConfig source) {
        AppConfig target = new AppConfig();
        if (source == null) {
            return target;
        }
        target.serverUri = source.serverUri;
        target.authType = source.authType;
        target.domain = source.domain;
        target.username = source.username;
        target.password = source.password;
        target.collection = source.collection;
        target.workspace = source.workspace;
        target.mappings = new ArrayList<MappingConfig>();
        if (source.mappings != null) {
            for (MappingConfig mapping : source.mappings) {
                MappingConfig copied = new MappingConfig();
                copied.serverPath = mapping.serverPath;
                copied.localPath = mapping.localPath;
                target.mappings.add(copied);
            }
        }
        return target;
    }

    /**
     * 补齐默认配置结构，确保空配置也能返回稳定 JSON 字段。
     */
    private AppConfig normalizeConfig(AppConfig config) {
        if (config.authType == null || config.authType.trim().isEmpty()) {
            config.authType = "ntlm-explicit";
        }
        if (config.mappings == null) {
            config.mappings = new ArrayList<MappingConfig>();
        }
        return config;
    }

    /**
     * 将 core Mapping 列表转换为配置文件中的 mappings 字段。
     */
    private List<MappingConfig> mappingConfigs(List<TfsMappingInfo> mappings) {
        List<MappingConfig> result = new ArrayList<MappingConfig>();
        if (mappings == null) {
            return result;
        }
        for (TfsMappingInfo mapping : mappings) {
            MappingConfig config = new MappingConfig();
            config.serverPath = mapping.getServerPath();
            config.localPath = mapping.getLocalPath();
            result.add(config);
        }
        return result;
    }

    /**
     * 将服务端目录项转换为 UI 资源树可直接消费的结构。
     */
    private List<Map<String, Object>> serverItems(List<TfsServerItem> items) {
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();
        if (items == null) {
            return result;
        }
        for (TfsServerItem item : items) {
            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("name", item.getName());
            data.put("path", item.getServerPath());
            data.put("serverPath", item.getServerPath());
            data.put("type", item.isFolder() ? "folder" : "file");
            data.put("folder", Boolean.valueOf(item.isFolder()));
            data.put("latestVersion", Integer.valueOf(item.getLatestVersion()));
            data.put("checkinDate", item.getCheckinDate());
            result.add(data);
        }
        return result;
    }

    /**
     * 从请求体中读取路径数组，兼容 paths、path、serverPaths、serverPath 四种字段。
     */
    private List<String> requestPaths(Map<String, Object> body) {
        List<String> paths = stringList(body.get("paths"));
        if (!paths.isEmpty()) {
            return paths;
        }
        paths = stringList(body.get("path"));
        if (!paths.isEmpty()) {
            return paths;
        }
        paths = stringList(body.get("serverPaths"));
        if (!paths.isEmpty()) {
            return paths;
        }
        return stringList(body.get("serverPath"));
    }

    /**
     * 将数组或逗号分隔字符串转换为路径列表。
     */
    private List<String> stringList(Object value) {
        if (value == null) {
            return new ArrayList<String>();
        }
        if (value instanceof List) {
            List<String> result = new ArrayList<String>();
            for (Object item : (List<?>) value) {
                if (item != null && item.toString().trim().length() > 0) {
                    result.add(item.toString().trim());
                }
            }
            return result;
        }
        return splitPaths(value.toString());
    }

    /**
     * 将逗号分隔路径转换为列表。
     */
    private List<String> splitPaths(String value) {
        List<String> result = new ArrayList<String>();
        if (value == null || value.trim().isEmpty()) {
            return result;
        }
        for (String item : value.split(",")) {
            if (item.trim().length() > 0) {
                result.add(item.trim());
            }
        }
        return result;
    }

    /**
     * 将请求体字符串字段复制到配置对象。
     */
    private void copyString(Map<String, Object> body, AppConfig config, String key) {
        String value = stringValue(body, key);
        if (value != null && value.trim().length() > 0) {
            if ("serverUri".equals(key)) {
                config.serverUri = value;
            } else if ("authType".equals(key)) {
                config.authType = value;
            } else if ("domain".equals(key)) {
                config.domain = value;
            } else if ("username".equals(key)) {
                config.username = value;
            } else if ("password".equals(key)) {
                config.password = value;
            } else if ("collection".equals(key)) {
                config.collection = value;
            } else if ("workspace".equals(key)) {
                config.workspace = value;
            }
        }
    }

    /**
     * 读取请求体中的字符串字段。
     */
    private String stringValue(Map<String, Object> body, String key) {
        Object value = body.get(key);
        return value == null ? null : value.toString().trim();
    }

    /**
     * 读取请求体中的布尔字段。
     */
    private boolean booleanValue(Map<String, Object> body, String key, boolean defaultValue) {
        Object value = body.get(key);
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Boolean) {
            return ((Boolean) value).booleanValue();
        }
        return "true".equalsIgnoreCase(value.toString());
    }

    /**
     * 读取请求体中的整数字段。
     */
    private int intValue(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return Integer.parseInt(require(value == null ? null : value.toString(), key));
    }

    /**
     * 在请求体和默认配置之间选择非空字段。
     */
    private String configValue(Map<String, Object> body, String key, String defaultValue) {
        return firstPresent(stringValue(body, key), defaultValue);
    }

    /**
     * 返回第一个非空字符串。
     */
    private String firstPresent(String first, String second) {
        if (first != null && first.trim().length() > 0) {
            return first.trim();
        }
        return second == null ? null : second.trim();
    }

    /**
     * 校验业务必填字段并返回去空格后的值。
     */
    private String require(String value, String field) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Missing required field: " + field);
        }
        return value.trim();
    }

    /**
     * 判断字符串是否为空。
     */
    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    /**
     * 生成操作日志中的路径摘要。
     */
    private String summarize(Request request) {
        return request.queryString() == null ? request.pathInfo() : request.pathInfo() + "?" + request.queryString();
    }

    private interface ApiCallable {
        /**
         * 执行具体 API 业务逻辑。
         */
        ApiResult call(Request request) throws Exception;
    }

    public static class AppConfig {
        public String serverUri;
        public String authType = "ntlm-explicit";
        public String domain;
        public String username;
        public String password;
        public String collection;
        public String workspace;
        public List<MappingConfig> mappings = new ArrayList<MappingConfig>();
    }

    public static class MappingConfig {
        public String serverPath;
        public String localPath;
    }

    public static class ApiResult {
        public boolean success;
        public String message;
        public String errorMessage;
        public String operation;
        public long startedAt;
        public long endedAt;
        public long durationMs;
        public List<String> logs = new ArrayList<String>();
        public Map<String, Object> data = new LinkedHashMap<String, Object>();

        @JsonIgnore
        public transient int status = 200;

        /**
         * 构造成功 API 响应。
         */
        public static ApiResult success(String message, Map<String, Object> data) {
            ApiResult result = new ApiResult();
            result.success = true;
            result.message = message;
            if (data != null) {
                result.data.putAll(data);
            }
            return result;
        }

        /**
         * 构造失败 API 响应。
         */
        public static ApiResult failure(String message, int status) {
            ApiResult result = new ApiResult();
            result.success = false;
            result.status = status;
            result.message = message == null ? "failure" : message;
            result.errorMessage = result.message;
            return result;
        }
    }

    private static class ServerConfigStore {
        private final ObjectMapper objectMapper;
        private final File configDirectory;
        private final File configFile;

        /**
         * 创建默认配置文件存储，路径固定为 ~/.mactfs/config.json。
         */
        ServerConfigStore(ObjectMapper objectMapper) {
            this.objectMapper = objectMapper;
            this.configDirectory = new File(System.getProperty("user.home"), ".mactfs");
            this.configFile = new File(configDirectory, "config.json");
        }

        /**
         * 读取默认配置，配置不存在时返回空结构。
         */
        AppConfig load() throws IOException {
            if (!configFile.exists()) {
                return new AppConfig();
            }
            AppConfig config = objectMapper.readValue(configFile, AppConfig.class);
            if (config.mappings == null) {
                config.mappings = new ArrayList<MappingConfig>();
            }
            if (config.authType == null || config.authType.trim().isEmpty()) {
                config.authType = "ntlm-explicit";
            }
            return config;
        }

        /**
         * 保存默认配置到 ~/.mactfs/config.json。
         */
        void save(AppConfig config) throws IOException {
            if (!configDirectory.exists()) {
                configDirectory.mkdirs();
            }
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(configFile, config);
        }

        /**
         * 返回配置文件路径，供 health 和日志展示。
         */
        File getConfigFile() {
            return configFile;
        }
    }

    private static class ServerTokenStore {
        private final File tokenDirectory = new File(System.getProperty("user.home"), ".mactfs");
        private final File tokenFile = new File(tokenDirectory, "server-token");
        private String token;

        /**
         * 读取或创建本地 Bearer Token，并确保文件权限按 600 处理。
         */
        void loadOrCreate() throws IOException {
            if (!tokenDirectory.exists()) {
                tokenDirectory.mkdirs();
            }
            if (tokenFile.exists()) {
                token = new String(Files.readAllBytes(tokenFile.toPath()), Charset.forName("UTF-8")).trim();
            }
            if (token == null || token.length() == 0) {
                token = generateToken();
                Files.write(tokenFile.toPath(), Arrays.asList(token), Charset.forName("UTF-8"));
            }
            applyOwnerOnlyPermission(tokenFile.toPath());
        }

        /**
         * 判断 Authorization 头是否匹配本地 Token。
         */
        boolean matches(String authorization) {
            if (authorization == null || !authorization.startsWith("Bearer ")) {
                return false;
            }
            return authorization.substring("Bearer ".length()).trim().equals(token);
        }

        /**
         * 返回 Token 文件路径，不暴露 Token 明文。
         */
        File getTokenFile() {
            return tokenFile;
        }

        /**
         * 生成本机随机 Token。
         */
        private String generateToken() {
            byte[] bytes = new byte[32];
            new SecureRandom().nextBytes(bytes);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        }

        /**
         * 设置 owner read/write 权限，兼容不支持 POSIX 权限的文件系统。
         */
        private void applyOwnerOnlyPermission(Path path) {
            try {
                Set<PosixFilePermission> permissions = EnumSet.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE);
                Files.setPosixFilePermissions(path, permissions);
            } catch (Exception exception) {
                File file = path.toFile();
                file.setReadable(false, false);
                file.setWritable(false, false);
                file.setExecutable(false, false);
                file.setReadable(true, true);
                file.setWritable(true, true);
            }
        }
    }

    private static class SessionManager {
        private AppConfig config;
        private ConnectionSummary connectionSummary;
        private long connectedAt;

        /**
         * 记录连接成功后的当前会话配置。
         */
        synchronized void connect(AppConfig config, ConnectionSummary connectionSummary) {
            this.config = config;
            this.connectionSummary = connectionSummary;
            this.connectedAt = System.currentTimeMillis();
        }

        /**
         * 更新当前配置，保留给配置保存和 workspace/mapping API 复用。
         */
        synchronized void setConfig(AppConfig config) {
            this.config = config;
        }

        /**
         * 返回当前会话配置。
         */
        synchronized AppConfig getConfig() {
            return config;
        }

        /**
         * 判断当前进程是否已有成功连接会话。
         */
        synchronized boolean isConnected() {
            return connectionSummary != null && connectedAt > 0;
        }
    }

    private static class OperationLogStore {
        private static final int MAX_LOGS = 200;
        private final List<OperationLogEntry> logs = new ArrayList<OperationLogEntry>();

        /**
         * 追加一次 API 操作日志，记录开始、结束、耗时和失败原因。
         */
        synchronized void add(String operation, String summary, long startedAt, long endedAt, ApiResult result) {
            OperationLogEntry entry = new OperationLogEntry();
            entry.operation = operation;
            entry.summary = summary;
            entry.startedAt = startedAt;
            entry.endedAt = endedAt;
            entry.durationMs = endedAt - startedAt;
            entry.success = result.success;
            entry.errorMessage = result.errorMessage;
            logs.add(entry);
            while (logs.size() > MAX_LOGS) {
                logs.remove(0);
            }
        }

        /**
         * 返回最近操作日志的快照，避免调用方修改内部列表。
         */
        synchronized List<OperationLogEntry> recent() {
            return new ArrayList<OperationLogEntry>(logs);
        }
    }

    public static class OperationLogEntry {
        public String operation;
        public String summary;
        public long startedAt;
        public long endedAt;
        public long durationMs;
        public boolean success;
        public String errorMessage;
    }
}
