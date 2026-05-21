package com.mydev.mactfs;

import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * 以最小依赖方式输出 JSON，避免为第一阶段 CLI 额外引入序列化库。
 */
public class CliJsonWriter {

    /**
     * 将对象结构序列化为 JSON 字符串。
     */
    public String toJson(Object value) {
        StringBuilder builder = new StringBuilder();
        appendJson(builder, value);
        return builder.toString();
    }

    /**
     * 递归写入 JSON 内容，支持当前 CLI 需要的 Map、List 和基础类型。
     */
    private void appendJson(StringBuilder builder, Object value) {
        if (value == null) {
            builder.append("null");
            return;
        }

        if (value instanceof String) {
            appendString(builder, (String) value);
            return;
        }

        if (value instanceof Number || value instanceof Boolean) {
            builder.append(value);
            return;
        }

        if (value instanceof Map) {
            appendMap(builder, (Map<?, ?>) value);
            return;
        }

        if (value instanceof List) {
            appendList(builder, (List<?>) value);
            return;
        }

        appendString(builder, String.valueOf(value));
    }

    /**
     * 输出 JSON 对象结构。
     */
    private void appendMap(StringBuilder builder, Map<?, ?> map) {
        builder.append('{');
        Iterator<? extends Map.Entry<?, ?>> iterator = map.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<?, ?> entry = iterator.next();
            appendString(builder, String.valueOf(entry.getKey()));
            builder.append(':');
            appendJson(builder, entry.getValue());
            if (iterator.hasNext()) {
                builder.append(',');
            }
        }
        builder.append('}');
    }

    /**
     * 输出 JSON 数组结构。
     */
    private void appendList(StringBuilder builder, List<?> list) {
        builder.append('[');
        for (int index = 0; index < list.size(); index++) {
            appendJson(builder, list.get(index));
            if (index < list.size() - 1) {
                builder.append(',');
            }
        }
        builder.append(']');
    }

    /**
     * 按 JSON 规则转义字符串内容。
     */
    private void appendString(StringBuilder builder, String value) {
        builder.append('"');
        for (int index = 0; index < value.length(); index++) {
            char current = value.charAt(index);
            switch (current) {
                case '\\':
                    builder.append("\\\\");
                    break;
                case '"':
                    builder.append("\\\"");
                    break;
                case '\n':
                    builder.append("\\n");
                    break;
                case '\r':
                    builder.append("\\r");
                    break;
                case '\t':
                    builder.append("\\t");
                    break;
                default:
                    builder.append(current);
                    break;
            }
        }
        builder.append('"');
    }
}
