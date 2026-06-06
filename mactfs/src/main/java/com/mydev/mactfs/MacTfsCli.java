package com.mydev.mactfs;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.PrintStream;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 第一阶段 CLI 入口，串联参数解析、核心执行和日志输出。
 */
public class MacTfsCli {

    public static void main(String[] args) throws Exception {
        configureNativeDirectory();
        if (args.length == 0) {
            printUsage();
            return;
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
}
