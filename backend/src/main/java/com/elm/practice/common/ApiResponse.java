package com.elm.practice.common;

import java.util.Map;

public final class ApiResponse<T> {
    private final int code;
    private final String message;
    private final T data;
    private final Map<String, Object> details;

    private ApiResponse(int code, String message, T data, Map<String, Object> details) {
        this.code=code; this.message=message; this.data=data; this.details=details;
    }
    public static <T> ApiResponse<T> success(T data) { return new ApiResponse<>(0, "success", data, null); }
    public static <T> ApiResponse<T> error(int code, String message, Map<String, Object> details) {
        return new ApiResponse<>(code, message, null, details);
    }
    public int getCode() { return code; }
    public String getMessage() { return message; }
    public T getData() { return data; }
    public Map<String, Object> getDetails() { return details; }
}
