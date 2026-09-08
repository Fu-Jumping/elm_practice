package com.elm.practice.common;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/** 统一 "yyyy-MM-dd HH:mm:ss" 文本口径（与原 InMemoryRepository.TIME 一致），SQL 侧经 DATE_FORMAT/STR_TO_DATE 转换。 */
public final class Times {
    public static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private Times() {}
    public static String now() { return LocalDateTime.now().format(TIME); }
}
