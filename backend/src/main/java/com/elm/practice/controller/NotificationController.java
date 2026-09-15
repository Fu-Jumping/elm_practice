package com.elm.practice.controller;

import com.elm.practice.common.ApiResponse;
import com.elm.practice.service.AuthService;
import com.elm.practice.service.NotificationService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

/** 站内通知（契约 §3.9，TODO-BE-006 通知部分）。全部从 Session 取用户，只读写本人通知。 */
@RestController
@RequestMapping("/api/v1")
public class NotificationController {
    private final AuthService auth; private final NotificationService notifications;

    public NotificationController(AuthService auth, NotificationService notifications) {
        this.auth = auth; this.notifications = notifications;
    }

    @GetMapping("/me/notifications")
    public ApiResponse<?> list(HttpSession s) {
        return ApiResponse.success(notifications.list(auth.requireUser(s)));
    }

    /** 全部标记已读。必须声明在 {notificationId} 之前语义上更精确，路径段数不同不会冲突。 */
    @PatchMapping("/me/notifications/read")
    public ApiResponse<?> markAllRead(HttpSession s) {
        notifications.markAllRead(auth.requireUser(s));
        return ApiResponse.success(null);
    }

    @PatchMapping("/me/notifications/{notificationId}/read")
    public ApiResponse<?> markRead(@PathVariable String notificationId, HttpSession s) {
        notifications.markRead(auth.requireUser(s), notificationId);
        return ApiResponse.success(null);
    }

    @GetMapping("/me/notifications/unread-count")
    public ApiResponse<?> unreadCount(HttpSession s) {
        return ApiResponse.success(notifications.unreadCount(auth.requireUser(s)));
    }
}
