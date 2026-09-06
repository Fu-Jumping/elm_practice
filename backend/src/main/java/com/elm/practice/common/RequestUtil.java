package com.elm.practice.common;

import jakarta.servlet.http.HttpSession;
import com.elm.practice.domain.Domain;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;

public final class RequestUtil {
    public static final String SESSION_PRINCIPAL = "ELM_AUTH_PRINCIPAL";
    private RequestUtil() {}
    public static String required(String value, String field) {
        if (value == null || value.trim().isEmpty()) throw ApiException.badRequest(field + "不能为空");
        return value.trim();
    }
    public static BigDecimal money(BigDecimal value, String field) {
        if (value == null || value.signum() < 0) throw ApiException.badRequest(field + "必须为非负金额");
        return value.setScale(2, RoundingMode.HALF_UP);
    }
    public static Domain.Principal principal(HttpSession session) {
        Object value = session.getAttribute(SESSION_PRINCIPAL);
        if (!(value instanceof Domain.Principal p)) throw ApiException.unauthorized("请先登录");
        return p;
    }
    public static Domain.Principal requireRole(HttpSession session, Domain.Role role) {
        Domain.Principal p = principal(session);
        if (p.role() != role) throw ApiException.forbidden("当前会话角色无权访问该资源");
        return p;
    }
    public static String normalizedRole(String role) {
        return role == null ? "" : role.trim().toLowerCase(Locale.ROOT);
    }
}
