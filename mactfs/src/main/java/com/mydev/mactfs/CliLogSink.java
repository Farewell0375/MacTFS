package com.mydev.mactfs;

/**
 * 向外透出 CLI 执行过程中的实时日志，供 JSON 模式下的 Electron 订阅。
 */
public interface CliLogSink {

    /**
     * 推送一条实时日志。
     */
    void log(String message);
}
