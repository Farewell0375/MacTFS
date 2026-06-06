package com.mydev.mactfs;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.PrintStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 第一阶段 CLI 入口，串联参数解析、核心执行和日志输出。
 */
public class MacTfsCli {

    private static final String DEFAULT_API_BASE_URL = "http://127.0.0.1:38765";

    public static void main(String[] args) throws Exception {
        configureNativeDirectory();
        if (args.length == 0) {
            printUsage();
            return;
        }

        if (!args[0].startsWith("--")) {
            try {
                int exitCode = executeDebugCommand(args);
                if (exitCode < 0) {
                    printUsage();
                    System.err.println("Unsupported command: " + args[0]);
                    System.exit(1);
                }
                if (exitCode > 0) {
                    System.exit(exitCode);
                }
                return;
            } catch (Throwable exception) {
                printDebugFailure(args, exception);
                System.exit(1);
                return;
            }
        }

        CliArguments arguments = CliArguments.parse(args);
        LocalConfigStore configStore = new LocalConfigStore();
        String action = arguments.getOrDefault("action", "sync");
        String output = arguments.getOrDefault("output", "text");
        TfsPhaseOneService service = new TfsPhaseOneService();

        if ("json".equalsIgnoreCase(output)) {
            executeJson(service, action, arguments, configStore, output);
            return;
        }

        try {
            CliActionResult result = executeAction(service, action, arguments, configStore, output);
            printResult(result, output, configStore);
            if (!result.isSuccess()) {
                System.exit(1);
            }
        } catch (Throwable exception) {
            CliActionResult result = CliActionResult.failure(exception.getMessage(), "");
            printResult(result, output, configStore);
            System.exit(1);
        }
    }

    /**
     * 自动指向发行包内 native 目录，满足 TFS SDK 加载 JNI 库的运行约束。
     */
    private static void configureNativeDirectory() {
        String property = "com.microsoft.tfs.jni.native.base-directory";
        if (System.getProperty(property) != null) {
            return;
        }
        File nativeDirectory = resolveNativeDirectory();
        if (nativeDirectory != null && nativeDirectory.exists()) {
            System.setProperty(property, nativeDirectory.getAbsolutePath());
        }
    }

    private static File resolveNativeDirectory() {
        try {
            File codeSource = new File(MacTfsCli.class.getProtectionDomain().getCodeSource().getLocation().toURI());
            File libDirectory = codeSource.isFile() ? codeSource.getParentFile() : codeSource;
            File installNativeDirectory = new File(libDirectory, "native");
            if (installNativeDirectory.exists()) {
                return installNativeDirectory;
            }
            File projectNativeDirectory = new File(libDirectory, "../../tfsIntegration/lib/native").getCanonicalFile();
            if (projectNativeDirectory.exists()) {
                return projectNativeDirectory;
            }
        } catch (Exception exception) {
            return null;
        }
        return null;
    }

    /**
     * 执行第三阶段新增的本地 API 调试命令，和旧版 --action 入口分开处理。
     */
    private static int executeDebugCommand(String[] args) throws Exception {
        if ("token".equalsIgnoreCase(args[0])) {
            return executeTokenCommand(args);
        }
        if ("health".equalsIgnoreCase(args[0])) {
            return executeHealthCommand(args);
        }
        if ("api".equalsIgnoreCase(args[0])) {
            return executeApiCommand(args);
        }
        if ("curl".equalsIgnoreCase(args[0])) {
            return executeCurlCommand(args);
        }
        return -1;
    }

    /**
     * 读取本地服务 token，供用户显式执行 mactfs token --show 时使用。
     */
    private static int executeTokenCommand(String[] args) throws Exception {
        CliArguments arguments = CliArguments.parse(copyArguments(args, 1));
        if (!arguments.getBoolean("show")) {
            throw new IllegalArgumentException("Missing required argument --show");
        }
        System.out.println(readServerToken());
        return 0;
    }

    /**
     * 调用本地 API health 接口，用于确认服务和 Bearer token 是否可用。
     */
    private static int executeHealthCommand(String[] args) throws Exception {
        CliArguments arguments = CliArguments.parse(copyArguments(args, 1));
        HttpApiResponse response = requestApi(
            arguments.getOrDefault("base-url", DEFAULT_API_BASE_URL),
            "GET",
            "/api/health",
            null
        );
        printApiResponse(response, arguments.getOrDefault("output", "text"));
        return response.isSuccess() ? 0 : 1;
    }

    /**
     * 按用户传入的 method、path 和 body 调用本地 API，作为 CLI 通用调试入口。
     */
    private static int executeApiCommand(String[] args) throws Exception {
        CliArguments arguments = CliArguments.parse(copyArguments(args, 1));
        String path = arguments.get("path");
        if (path == null || path.trim().isEmpty()) {
            path = arguments.get("api-path");
        }
        if (path == null || path.trim().isEmpty()) {
            throw new IllegalArgumentException("Missing required argument --path");
        }

        HttpApiResponse response = requestApi(
            arguments.getOrDefault("base-url", DEFAULT_API_BASE_URL),
            arguments.getOrDefault("method", "GET"),
            path,
            arguments.get("body")
        );
        printApiResponse(response, arguments.getOrDefault("output", "text"));
        return response.isSuccess() ? 0 : 1;
    }

    /**
     * 输出可复制的 curl 示例，默认通过 token 命令替换，避免在日志中直接打印 token。
     */
    private static int executeCurlCommand(String[] args) {
        if (args.length < 2 || !"health".equalsIgnoreCase(args[1])) {
            throw new IllegalArgumentException("Unsupported curl command. Usage: curl health");
        }
        CliArguments arguments = CliArguments.parse(copyArguments(args, 2));
        String baseUrl = trimTrailingSlash(arguments.getOrDefault("base-url", DEFAULT_API_BASE_URL));
        System.out.println("curl -H \"Authorization: Bearer $(mactfs token --show)\" \"" + baseUrl + "/api/health\"");
        return 0;
    }

    /**
     * 调用本地 API 并自动携带 server-token 文件中的 Bearer token。
     */
    private static HttpApiResponse requestApi(String baseUrl, String method, String path, String body) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(buildApiUrl(baseUrl, path)).openConnection();
        connection.setRequestMethod(method.toUpperCase());
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(120000);
        connection.setRequestProperty("Authorization", "Bearer " + readServerToken());
        connection.setRequestProperty("Accept", "application/json");
        if (body != null && body.trim().length() > 0) {
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json;charset=utf-8");
            byte[] bodyBytes = body.getBytes(Charset.forName("UTF-8"));
            OutputStream outputStream = connection.getOutputStream();
            outputStream.write(bodyBytes);
            outputStream.close();
        }

        int status = connection.getResponseCode();
        InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        return new HttpApiResponse(status, readStream(stream));
    }

    /**
     * 从 ~/.mactfs/server-token 读取 token，文件缺失时给出明确启动提示。
     */
    private static String readServerToken() throws Exception {
        File tokenFile = serverTokenFile();
        if (!tokenFile.exists()) {
            throw new IllegalArgumentException("Token file not found: " + tokenFile.getAbsolutePath() + ". Start macTFS API server first.");
        }
        String token = new String(java.nio.file.Files.readAllBytes(tokenFile.toPath()), Charset.forName("UTF-8")).trim();
        if (token.length() == 0) {
            throw new IllegalArgumentException("Token file is empty: " + tokenFile.getAbsolutePath());
        }
        return token;
    }

    /**
     * 返回第二阶段服务约定的本地 token 文件路径。
     */
    private static File serverTokenFile() {
        return new File(new File(System.getProperty("user.home"), ".mactfs"), "server-token");
    }

    /**
     * 拼接本地 API 地址，允许 path 直接传入完整 http 地址便于临时调试。
     */
    private static String buildApiUrl(String baseUrl, String path) {
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return path;
        }
        String normalizedPath = path.startsWith("/") ? path : "/" + path;
        return trimTrailingSlash(baseUrl) + normalizedPath;
    }

    /**
     * 输出 API 调用结果，JSON 模式保持服务端响应体不被额外包装。
     */
    private static void printApiResponse(HttpApiResponse response, String output) {
        if ("json".equalsIgnoreCase(output)) {
            if (response.body.trim().length() > 0) {
                System.out.println(response.body);
                return;
            }
            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("status", Integer.valueOf(response.status));
            System.out.println(new CliJsonWriter().toJson(data));
            return;
        }

        System.out.println("HTTP " + response.status);
        if (response.body.trim().length() > 0) {
            System.out.println(response.body);
        }
    }

    /**
     * API 调试命令异常时按输出模式返回错误，便于脚本判断失败原因。
     */
    private static void printDebugFailure(String[] args, Throwable exception) {
        if ("json".equalsIgnoreCase(optionValue(args, "output", "text"))) {
            System.out.println(new CliJsonWriter().toJson(CliActionResult.failure(exception.getMessage(), "").toMap()));
            return;
        }
        System.err.println("Error: " + exception.getMessage());
    }

    /**
     * 读取输入流为字符串，兼容 HTTP 错误响应没有 body 的情况。
     */
    private static String readStream(InputStream stream) throws Exception {
        if (stream == null) {
            return "";
        }
        BufferedReader reader = new BufferedReader(new InputStreamReader(stream, Charset.forName("UTF-8")));
        StringBuilder builder = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            if (builder.length() > 0) {
                builder.append('\n');
            }
            builder.append(line);
        }
        reader.close();
        return builder.toString();
    }

    /**
     * 复制子命令参数，复用已有 CliArguments 参数解析规则。
     */
    private static String[] copyArguments(String[] args, int startIndex) {
        String[] result = new String[Math.max(args.length - startIndex, 0)];
        for (int index = startIndex; index < args.length; index++) {
            result[index - startIndex] = args[index];
        }
        return result;
    }

    /**
     * 从原始命令行中读取指定选项，用于错误输出前判断输出模式。
     */
    private static String optionValue(String[] args, String key, String defaultValue) {
        String option = "--" + key;
        for (int index = 0; index < args.length; index++) {
            if (option.equals(args[index]) && index + 1 < args.length) {
                return args[index + 1];
            }
        }
        return defaultValue;
    }

    /**
     * 去掉 base-url 末尾多余斜杠，避免拼接 API path 时出现双斜杠。
     */
    private static String trimTrailingSlash(String value) {
        if (value.endsWith("/")) {
            return value.substring(0, value.length() - 1);
        }
        return value;
    }

    /**
     * JSON 模式隔离第三方 SDK 输出，确保 stdout 只有最终结构化结果。
     */
    private static void executeJson(TfsPhaseOneService service,
                                    String action,
                                    CliArguments arguments,
                                    LocalConfigStore configStore,
                                    String output) {
        PrintStream originalOut = System.out;
        PrintStream originalErr = System.err;
        ByteArrayOutputStream capturedOut = new ByteArrayOutputStream();
        ByteArrayOutputStream capturedErr = new ByteArrayOutputStream();
        CliActionResult result;
        System.setOut(new PrintStream(capturedOut));
        System.setErr(new PrintStream(capturedErr));
        try {
            result = executeAction(service, action, arguments, configStore, output);
        } catch (Throwable exception) {
            result = CliActionResult.failure(exception.getMessage(), "");
        } finally {
            System.setOut(originalOut);
            System.setErr(originalErr);
        }

        result = withCapturedOutput(result, capturedOut.toString(), capturedErr.toString());
        printResult(result, output, configStore);
        if (!result.isSuccess()) {
            System.exit(1);
        }
    }

    /**
     * 根据命令动作分发到对应的 TFS 能力，兼容 CLI 和桌面端调用。
     */
    private static CliActionResult executeAction(TfsPhaseOneService service,
                                                 String action,
                                                 CliArguments arguments,
                                                 LocalConfigStore configStore,
                                                 String output) throws Exception {
        CliLogSink logSink = "json".equalsIgnoreCase(output) ? new CliLogSink() {
            @Override
            public void log(String message) {
                // JSON 模式下不直接输出过程日志，统一放入结果对象并由桌面端消费。
            }
        } : null;

        if ("test-connection".equalsIgnoreCase(action)) {
            return service.testConnection(arguments, configStore, logSink);
        }
        if ("list-collections".equalsIgnoreCase(action)) {
            return service.listCollections(arguments, configStore, logSink);
        }
        if ("list-workspaces".equalsIgnoreCase(action)) {
            return service.listWorkspaces(arguments, configStore, logSink);
        }
        if ("browse-server-path".equalsIgnoreCase(action)) {
            return service.browseServerPath(arguments, configStore, logSink);
        }
        if ("ensure-workspace".equalsIgnoreCase(action)) {
            return service.ensureWorkspace(arguments, configStore, logSink);
        }
        if ("list-mappings".equalsIgnoreCase(action)) {
            return service.listMappings(arguments, configStore, logSink);
        }
        if ("add-mapping".equalsIgnoreCase(action)) {
            return service.addMapping(arguments, configStore, logSink);
        }
        if ("delete-mapping".equalsIgnoreCase(action)) {
            return service.deleteMapping(arguments, configStore, logSink);
        }
        if ("get-latest".equalsIgnoreCase(action)) {
            return service.getLatest(arguments, configStore, logSink);
        }
        if ("pending-changes".equalsIgnoreCase(action)) {
            return service.listPendingChanges(arguments, configStore, logSink);
        }
        if ("checkout".equalsIgnoreCase(action) || "add".equalsIgnoreCase(action) || "delete".equalsIgnoreCase(action) || "undo".equalsIgnoreCase(action)) {
            return service.fileOperation(arguments, configStore, logSink, action.toLowerCase());
        }
        if ("checkin".equalsIgnoreCase(action)) {
            return service.checkin(arguments, configStore, logSink);
        }
        if ("compare-folder".equalsIgnoreCase(action)) {
            return service.compareFolder(arguments, configStore, logSink);
        }
        if ("history".equalsIgnoreCase(action)) {
            return service.history(arguments, configStore, logSink);
        }
        if ("file-content".equalsIgnoreCase(action)) {
            return service.fileContent(arguments, configStore, logSink);
        }
        if ("diff".equalsIgnoreCase(action)) {
            return service.diff(arguments, configStore, logSink);
        }
        if ("sync".equalsIgnoreCase(action)) {
            return service.sync(arguments, configStore, logSink);
        }
        throw new IllegalArgumentException("Unsupported action: " + action);
    }

    /**
     * 把 JSON 模式下拦截到的第三方输出放入 data，避免污染 stdout。
     */
    private static CliActionResult withCapturedOutput(CliActionResult result, String capturedOut, String capturedErr) {
        if (capturedOut.trim().isEmpty() && capturedErr.trim().isEmpty()) {
            return result;
        }
        Map<String, Object> data = new LinkedHashMap<String, Object>(result.getData());
        if (!capturedOut.trim().isEmpty()) {
            data.put("capturedStdout", capturedOut);
        }
        if (!capturedErr.trim().isEmpty()) {
            data.put("capturedStderr", capturedErr);
        }
        if (result.isSuccess()) {
            return CliActionResult.success(result.getMessage(), result.getLogs(), data);
        }
        return CliActionResult.failure(result.getMessage(), result.getLogs(), data);
    }

    /**
     * 按输出模式打印 CLI 结果，文本模式保留人工可读性，JSON 模式供 Electron 消费。
     */
    private static void printResult(CliActionResult result, String output, LocalConfigStore configStore) {
        if ("json".equalsIgnoreCase(output)) {
            System.out.println(new CliJsonWriter().toJson(result.toMap()));
            return;
        }

        if (result.getLogs() != null && result.getLogs().trim().length() > 0) {
            System.out.println(result.getLogs());
        }
        System.out.println("Local config: " + configStore.getConfigFile().getAbsolutePath());
        if (!result.isSuccess()) {
            System.err.println("Error: " + result.getMessage());
        }
    }

    private static void printUsage() {
        System.out.println("Usage:");
        System.out.println("  token --show");
        System.out.println("  health [--output text|json] [--base-url <url>]");
        System.out.println("  api --method <GET|POST|PUT|DELETE> --path </api/path> [--body <json>] [--output text|json] [--base-url <url>]");
        System.out.println("  curl health [--base-url <url>]");
        System.out.println("Legacy actions:");
        System.out.println("  --action <test-connection|list-collections|list-workspaces|browse-server-path|ensure-workspace|list-mappings|add-mapping|delete-mapping|get-latest|pending-changes|checkout|add|delete|undo|checkin|compare-folder|history|file-content|diff|sync>");
        System.out.println("  --output <text|json>");
        System.out.println("  --server-uri <uri>");
        System.out.println("  --auth-type <ntlm-explicit|ntlm-native>");
        System.out.println("  --username <name>");
        System.out.println("  --password <password>");
        System.out.println("  --collection <collectionName>");
        System.out.println("  --workspace <workspaceName>");
        System.out.println("  --server-path <$/path>");
        System.out.println("  --local-path <localDir>");
        System.out.println("  --path <localOrServerPath[,path2]>");
        System.out.println("Optional:");
        System.out.println("  --domain <domain>");
        System.out.println("  --comment <workspace comment>");
        System.out.println("  --recursive <true|false>");
        System.out.println("  --changeset <id>");
        System.out.println("  --source-changeset <id>");
        System.out.println("  --target-changeset <id>");
        System.out.println("  --list-only true");
        System.out.println("  --reuse-config true");
    }

    private static class HttpApiResponse {

        private final int status;
        private final String body;

        private HttpApiResponse(int status, String body) {
            this.status = status;
            this.body = body == null ? "" : body;
        }

        /**
         * 判断 HTTP 状态码是否属于成功响应。
         */
        private boolean isSuccess() {
            return status >= 200 && status < 300;
        }
    }
}
