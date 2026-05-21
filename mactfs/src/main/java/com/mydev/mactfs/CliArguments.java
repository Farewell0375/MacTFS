package com.mydev.mactfs;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 第一阶段命令行参数对象，负责承接连接、workspace 和映射所需输入。
 */
public class CliArguments {

    private final Map<String, String> values;

    private CliArguments(Map<String, String> values) {
        this.values = values;
    }

    public static CliArguments parse(String[] args) {
        Map<String, String> values = new LinkedHashMap<String, String>();
        for (int index = 0; index < args.length; index++) {
            String current = args[index];
            if (!current.startsWith("--")) {
                throw new IllegalArgumentException("Unsupported argument: " + current);
            }

            String key = current.substring(2);
            String value = "true";
            if (index + 1 < args.length && !args[index + 1].startsWith("--")) {
                value = args[index + 1];
                index++;
            }
            values.put(key, value);
        }
        return new CliArguments(values);
    }

    public String get(String key) {
        return values.get(key);
    }

    /**
     * 判断当前命令行是否显式传入了指定参数。
     */
    public boolean has(String key) {
        return values.containsKey(key);
    }

    public String getRequired(String key) {
        String value = get(key);
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Missing required argument --" + key);
        }
        return value.trim();
    }

    public String getOrDefault(String key, String defaultValue) {
        String value = get(key);
        return value == null || value.trim().isEmpty() ? defaultValue : value.trim();
    }

    public boolean getBoolean(String key) {
        String value = get(key);
        return value != null && "true".equalsIgnoreCase(value.trim());
    }
}
