package com.mydev.mactfs;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Properties;

/**
 * 保存最近一次成功连接与映射结果，供第一阶段 CLI 复用输入。
 */
public class LocalConfigStore {

    private final File configFile;

    public LocalConfigStore() {
        File configDirectory = new File(System.getProperty("user.home"), ".mactfs");
        if (!configDirectory.exists()) {
            configDirectory.mkdirs();
        }
        this.configFile = new File(configDirectory, "phase-one.properties");
    }

    public Properties load() throws IOException {
        Properties properties = new Properties();
        if (!configFile.exists()) {
            return properties;
        }

        FileInputStream inputStream = new FileInputStream(configFile);
        try {
            properties.load(inputStream);
        } finally {
            inputStream.close();
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
}
