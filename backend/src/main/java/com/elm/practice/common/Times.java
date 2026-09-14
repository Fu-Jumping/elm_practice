package com.elm.practice.common;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** 统一 "yyyy-MM-dd HH:mm:ss" 文本口径（与原 InMemoryRepository.TIME 一致），SQL 侧经 DATE_FORMAT/STR_TO_DATE 转换。 */
public final class Times {
    public static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    public static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    /** 爆红包口径（契约 §3.10/§10.5）：免费爆 0 点重置、爆出券当天 23:59:59 到期，统一按东八区计算。 */
    public static final ZoneId CN = ZoneId.of("Asia/Shanghai");
    private Times() {}
    public static String now() { return LocalDateTime.now().format(TIME); }

    /** 东八区当前时刻文本。 */
    public static String nowCn() { return LocalDateTime.now(CN).format(TIME); }
    /** 东八区今天（yyyy-MM-dd）。 */
    public static String todayCn() { return LocalDate.now(CN).format(DATE); }
    /** 东八区今天 23:59:59（爆出券有效期终点，不可跨天）。 */
    public static String endOfTodayCn() { return LocalDate.now(CN).atTime(23, 59, 59).format(TIME); }
    /** 东八区当前时刻 + n 天的同时刻（购买所得券 7 天有效）。 */
    public static String plusDaysCn(int days) { return LocalDateTime.now(CN).plusDays(days).format(TIME); }

    /**
     * 给定时刻文本 + n 分钟（同一文本口径）。
     * 用途：契约 §3.5 待支付倒计时 `payDeadline` = `createdAt` + 15 分钟；`createdAt` 已由 SQL
     * 按 `DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s')` 取为文本（库连接时区为东八区），此处只做加法，不改时区。
     */
    public static String plusMinutes(String time, int minutes) {
        return LocalDateTime.parse(time, TIME).plusMinutes(minutes).format(TIME);
    }
}
