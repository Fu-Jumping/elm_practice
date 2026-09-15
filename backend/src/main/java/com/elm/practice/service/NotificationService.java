package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.IdGenerator;
import com.elm.practice.common.Times;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.domain.Domain;
import com.elm.practice.mapper.NotificationMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 站内通知（契约 §3.9）：只返回当前用户通知，按时间倒序；标记已读幂等，不存在的通知 404。
 * 触发时机：订单状态更新（支付成功进 PENDING、接单、出餐配送、完成、用户取消）写 ORDER；
 * 红包到账写 COUPON；会员权益提醒写 MEMBER。
 */
@Service
public class NotificationService {
    public static final String TYPE_ORDER = "ORDER";
    public static final String TYPE_COUPON = "COUPON";
    public static final String TYPE_MEMBER = "MEMBER";

    private final NotificationMapper notifications;
    private final IdGenerator ids;

    public NotificationService(NotificationMapper notifications, IdGenerator ids) {
        this.notifications = notifications; this.ids = ids;
    }

    public List<Map<String, Object>> list(Domain.User u) {
        return notifications.listByUser(u.id).stream().map(ViewMapper::notification).toList();
    }

    public int unreadCount(Domain.User u) {
        return notifications.countUnread(u.id);
    }

    /** 标记单条已读（幂等）：不存在或不属于当前用户一律 404。 */
    @Transactional
    public void markRead(Domain.User u, String notificationId) {
        if (notifications.findOwned(notificationId, u.id) == null) throw ApiException.notFound("通知不存在");
        notifications.markRead(notificationId, u.id);
    }

    @Transactional
    public void markAllRead(Domain.User u) {
        notifications.markAllRead(u.id);
    }

    /** 订单状态更新通知；relatedId 为订单号。 */
    @Transactional
    public void orderStatus(String userId, String orderId, Domain.OrderStatus status, String cancelReason) {
        String content = switch (status) {
            case PENDING -> "订单已支付成功，等待商家接单";
            case COOKING -> "商家已接单，正在备餐";
            case DELIVERING -> "订单已出餐，正在配送中";
            case COMPLETED -> "订单已完成，感谢惠顾";
            case CANCELLED -> cancelReason == null || cancelReason.isBlank()
                    ? "订单已取消" : "订单已取消：" + cancelReason;
            default -> "订单状态已更新为 " + status.name();
        };
        write(userId, TYPE_ORDER, "订单状态更新", content, orderId);
    }

    /** 红包到账通知；relatedId 为红包编号（契约 §3.9）。 */
    @Transactional
    public void couponArrived(String userId, String couponId, String name, BigDecimal threshold, BigDecimal amount) {
        String scope = threshold != null && threshold.signum() > 0
                ? "满" + plain(threshold) + "减" + plain(amount) : "无门槛减" + plain(amount);
        write(userId, TYPE_COUPON, "红包到账", "您获得一张红包「" + name + "」（" + scope + "）", couponId);
    }

    /** 会员权益提醒通知（开通/标记由种子数据或后台完成，本契约无开通接口）。 */
    @Transactional
    public void memberBenefit(String userId) {
        write(userId, TYPE_MEMBER, "会员权益提醒", "您已开通会员，全店商品享 95 折（与商品会员价不叠加）", null);
    }

    private void write(String userId, String type, String title, String content, String relatedId) {
        notifications.insert(new Domain.Notification(ids.nextId("nt"), userId, type, title, content, relatedId,
                false, Times.now()));
    }

    private static String plain(BigDecimal value) {
        return value == null ? "0" : value.stripTrailingZeros().toPlainString();
    }
}
