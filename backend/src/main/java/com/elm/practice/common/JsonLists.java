package com.elm.practice.common;

import com.elm.practice.domain.Domain;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;

public final class JsonLists {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private JsonLists() {}

    public static String toJson(Object value) {
        try { return MAPPER.writeValueAsString(value == null ? List.of() : value); }
        catch (Exception e) { throw new IllegalStateException("JSON 序列化失败", e); }
    }

    public static List<String> tags(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return MAPPER.readValue(json, new TypeReference<List<String>>() {}); }
        catch (Exception e) { throw new IllegalStateException("标签数据损坏", e); }
    }

    public static List<Domain.SpecOption> specs(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return MAPPER.readValue(json, new TypeReference<List<Domain.SpecOption>>() {}); }
        catch (Exception e) { throw new IllegalStateException("规格数据损坏", e); }
    }
}
