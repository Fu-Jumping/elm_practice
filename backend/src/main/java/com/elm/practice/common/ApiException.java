package com.elm.practice.common;

import org.springframework.http.HttpStatus;
import java.util.Map;

public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final int code;
    private final Map<String, Object> details;
    public ApiException(HttpStatus status, int code, String message) { this(status, code, message, null); }
    public ApiException(HttpStatus status, int code, String message, Map<String, Object> details) {
        super(message); this.status=status; this.code=code; this.details=details;
    }
    public HttpStatus getStatus() { return status; }
    public int getCode() { return code; }
    public Map<String, Object> getDetails() { return details; }
    public static ApiException badRequest(String message) { return new ApiException(HttpStatus.BAD_REQUEST, 40001, message); }
    public static ApiException unauthorized(String message) { return new ApiException(HttpStatus.UNAUTHORIZED, 40101, message); }
    public static ApiException forbidden(String message) { return new ApiException(HttpStatus.FORBIDDEN, 40301, message); }
    public static ApiException notFound(String message) { return new ApiException(HttpStatus.NOT_FOUND, 40401, message); }
    public static ApiException conflict(String message) { return new ApiException(HttpStatus.CONFLICT, 40901, message); }
}
