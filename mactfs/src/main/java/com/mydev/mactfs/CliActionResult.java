package com.mydev.mactfs;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 统一描述 CLI 动作执行结果，兼容文本输出和 JSON 输出。
 */
public class CliActionResult {

    private final boolean success;
    private final String message;
    private final String logs;
    private final Map<String, Object> data;

    public CliActionResult(boolean success, String message, String logs, Map<String, Object> data) {
        this.success = success;
        this.message = message;
        this.logs = logs;
        this.data = data == null ? new LinkedHashMap<String, Object>() : data;
    }

    /**
     * 构造成功结果，供动作式命令输出结构化结果。
     */
    public static CliActionResult success(String message, String logs, Map<String, Object> data) {
        return new CliActionResult(true, message, logs, data);
    }

    /**
     * 构造失败结果，统一错误输出形态。
     */
    public static CliActionResult failure(String message, String logs) {
        return new CliActionResult(false, message, logs, new LinkedHashMap<String, Object>());
    }

    /**
     * 将结果转换为 JSON 模式需要的 Map 结构。
     */
    public Map<String, Object> toMap() {
        Map<String, Object> payload = new LinkedHashMap<String, Object>();
        payload.put("success", success);
        payload.put("message", message);
        payload.put("logs", logs);
        payload.put("data", data);
        return payload;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public String getLogs() {
        return logs;
    }

    public Map<String, Object> getData() {
        return data;
    }
}
