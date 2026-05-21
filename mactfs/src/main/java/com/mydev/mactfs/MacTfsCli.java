package com.mydev.mactfs;

/**
 * 第一阶段 CLI 入口，串联参数解析、核心执行和日志输出。
 */
public class MacTfsCli {

    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            printUsage();
            return;
        }

        CliArguments arguments = CliArguments.parse(args);
        LocalConfigStore configStore = new LocalConfigStore();
        String action = arguments.getOrDefault("action", "sync");
        String output = arguments.getOrDefault("output", "text");
        TfsPhaseOneService service = new TfsPhaseOneService();

        try {
            CliActionResult result = executeAction(service, action, arguments, configStore, output);
            printResult(result, output, configStore);
            if (!result.isSuccess()) {
                System.exit(1);
            }
        } catch (Exception exception) {
            CliActionResult result = CliActionResult.failure(exception.getMessage(), "");
            printResult(result, output, configStore);
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
        if ("sync".equalsIgnoreCase(action)) {
            return service.sync(arguments, configStore, logSink);
        }
        throw new IllegalArgumentException("Unsupported action: " + action);
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
        System.out.println("  --action <test-connection|list-collections|list-workspaces|browse-server-path|ensure-workspace|sync>");
        System.out.println("  --output <text|json>");
        System.out.println("  --server-uri <uri>");
        System.out.println("  --auth-type <ntlm-explicit|ntlm-native>");
        System.out.println("  --username <name>");
        System.out.println("  --password <password>");
        System.out.println("  --collection <collectionName>");
        System.out.println("  --workspace <workspaceName>");
        System.out.println("  --server-path <$/path>");
        System.out.println("  --local-path <localDir>");
        System.out.println("Optional:");
        System.out.println("  --domain <domain>");
        System.out.println("  --comment <workspace comment>");
        System.out.println("  --list-only true");
        System.out.println("  --reuse-config true");
    }
}
