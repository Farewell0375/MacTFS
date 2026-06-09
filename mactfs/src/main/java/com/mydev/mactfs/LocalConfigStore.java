package com.mydev.mactfs;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Properties;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 保存最近一次成功连接与映射结果，供第一阶段 CLI 复用输入。
 */
public class LocalConfigStore {

    private final File configFile;
    private final File serverConfigFile;

    public LocalConfigStore() {
        File configDirectory = new File(System.getProperty("user.home"), ".mactfs");
        if (!configDirectory.exists()) {
            configDirectory.mkdirs();
        }
        this.configFile = new File(configDirectory, "phase-one.properties");
        this.serverConfigFile = new File(configDirectory, "config.json");
    }

    /**
     * 读取第一阶段配置；本地 API 配置存在时优先使用 config.json 的当前连接上下文。
     */
    public Properties load() throws IOException {
        Properties properties = new Properties();
        if (configFile.exists()) {
            FileInputStream inputStream = new FileInputStream(configFile);
            try {
                properties.load(inputStream);
            } finally {
                inputStream.close();
            }
        }

        if (serverConfigFile.exists()) {
            mergeServerConfig(properties);
        }
        return properties;
    }

    public void save(Properties properties) throws IOException {
        FileOutputStream outputStream = new FileOutputStream(configFile);
        try {
            properties.store(outputStream, "mactfs phase one config");
        } finally {
            outputStream.close();
        }
    }

    public File getConfigFile() {
        return configFile;
    }

    /**
     * 将第二阶段本地 API 配置转换为旧 CLI 可复用的属性名。
     */
    private void mergeServerConfig(Properties properties) throws IOException {
        String json = new String(Files.readAllBytes(serverConfigFile.toPath()), StandardCharsets.UTF_8);
        copyJsonString(json, properties, "serverUri", "server-uri");
        copyJsonString(json, properties, "authType", "auth-type");
        copyJsonString(json, properties, "domain", "domain");
        copyJsonString(json, properties, "username", "username");
        copyJsonString(json, properties, "password", "password");
        copyJsonString(json, properties, "collection", "collection");
        copyJsonString(json, properties, "workspace", "workspace");
        copyJsonString(json, properties, "serverPath", "server-path");
        copyJsonString(json, properties, "localPath", "local-path");
    }

    /**
     * 复制 JSON 字符串字段，保持旧 CLI 配置读取逻辑不依赖服务端模块。
     */
    private void copyJsonString(String json, Properties properties, String jsonKey, String propertyKey) {
        String value = jsonString(json, jsonKey);
        if (!isBlank(value)) {
            properties.setProperty(propertyKey, value);
        }
    }

    /**
     * 从简单配置 JSON 中提取字符串字段。
     */
    private String jsonString(String json, String key) {
        Pattern pattern = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*\"((?:\\\\.|[^\"])*)\"");
        Matcher matcher = pattern.matcher(json);
        return matcher.find() ? matcher.group(1).replace("\\\"", "\"") : null;
    }

    /**
     * 判断字符串是否为空。
     */
    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
