package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.IdGenerator;
import com.elm.practice.common.JsonLists;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.common.Times;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.domain.Domain;
import com.elm.practice.dto.Requests;
import com.elm.practice.mapper.ConversationMapper;
import com.elm.practice.mapper.MessageMapper;
import com.elm.practice.mapper.PromotionMapper;
import com.elm.practice.mapper.ReviewMapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Set;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Optional P1 endpoints kept small and deterministic for the course demo. */
@Service
public class ExtensionService {
    private final ReviewMapper reviews; private final ConversationMapper conversations; private final MessageMapper messages;
    private final PromotionMapper promotions;
    private final com.elm.practice.mapper.OrderMapper orderMapper;
    private final com.elm.practice.mapper.ProductMapper productMapper;
    private final OrderService orders; private final StoreService stores; private final IdGenerator ids;

    public ExtensionService(ReviewMapper reviews, ConversationMapper conversations, MessageMapper messages,
                            PromotionMapper promotions, com.elm.practice.mapper.OrderMapper orderMapper,
                            com.elm.practice.mapper.ProductMapper productMapper,
                            OrderService orders, StoreService stores, IdGenerator ids) {
        this.reviews = reviews; this.conversations = conversations; this.messages = messages;
        this.promotions = promotions; this.orderMapper = orderMapper; this.productMapper = productMapper;
        this.orders = orders; this.stores = stores; this.ids = ids;
    }

    /** 评价聚合与筛选（Wave3，契约 §6.2）：summary 不随筛选变化；filter ∈ 全部/有图/最新/好评/差评，非法 400。 */
    public Map<String,Object> storeReviews(String storeId, Integer rating, String filter) {
        stores.get(storeId);
        String f = (filter == null || filter.isBlank()) ? "全部" : filter.trim();
        if (!Set.of("全部","有图","最新","好评","差评").contains(f))
            throw ApiException.badRequest("filter 只支持 全部/有图/最新/好评/差评");
        Map<String,Object> summary = reviews.summarizeByStore(storeId);
        var out = new LinkedHashMap<String,Object>();
        out.put("summary", summary == null ? Map.of("averageRating", 0.0, "totalCount", 0L) : summary);
        out.put("list", reviews.findByStore(storeId, rating, f).stream().map(ViewMapper::review).toList());
        return out;
    }

    @Transactional
    public Domain.Review review(Domain.User user, String orderId, Requests.ReviewCreate req) {
        Domain.Order order = orders.get(user, orderId);
        if (order.status != Domain.OrderStatus.COMPLETED) throw ApiException.conflict("仅已完成订单可以评价");
        if (req == null || req.rating == null || req.rating < 1 || req.rating > 5) throw ApiException.badRequest("rating 必须在 1-5 之间");
        String content = RequestUtil.required(req.content, "content");
        if (content.length() > 500) throw ApiException.badRequest("评价内容不能超过 500 字");
        Domain.Review r = new Domain.Review(ids.nextId("rv"), orderId, order.storeId, user.id, content, req.rating, Times.now());
        r.userNickname = user.nickname;
        r.tagsJson = JsonLists.toJson(validateTags(req.tags));
        r.imagesJson = JsonLists.toJson(validateReviewImages(req.images));
        try { reviews.insert(r); }
        catch (DuplicateKeyException e) { throw ApiException.conflict("同一订单只能评价一次"); }
        return r;
    }

    public List<Map<String,Object>> merchantReviews(Domain.Merchant merchant) {
        return reviews.findByStore(merchant.storeId, null, "全部").stream().map(ViewMapper::review).toList();
    }

    @Transactional
    public Domain.Review reply(Domain.Merchant merchant, String id, Requests.ReplyPatch req) {
        Domain.Review r = reviews.findById(id);
        if (r == null || !r.storeId.equals(merchant.storeId)) throw ApiException.notFound("评价不存在");
        String reply = RequestUtil.required(req == null ? null : req.reply, "reply");
        if (reply.length() > 500) throw ApiException.badRequest("回复不能超过 500 字");
        r.reply = reply; r.repliedAt = Times.now();
        reviews.updateReply(id, reply, r.repliedAt);
        return r;
    }

    public List<Map<String,Object>> conversations(Domain.Principal principal, String orderId) {
        List<Domain.Conversation> list = principal.role() == Domain.Role.USER
                ? conversations.listForUser(principal.id())
                : conversations.listForMerchant(principal.id());
        return list.stream()
                .filter(c -> orderId == null || orderId.isBlank() || orderId.equals(c.orderId))
                .map(c -> conversationView(c, principal))
                .toList();
    }

    public Map<String,Object> conversation(Domain.Principal principal, String id) {
        Domain.Conversation c = conversations.findById(id);
        if (c == null || !visible(c, principal)) throw ApiException.notFound("会话不存在");
        return conversationView(c, principal);
    }

    @Transactional
    public Map<String,Object> send(Domain.Principal principal, String id, Requests.MessageCreate req) {
        Domain.Conversation c = conversations.findById(id);
        if (c == null || !visible(c, principal)) throw ApiException.notFound("会话不存在");
        String content = RequestUtil.required(req == null ? null : req.content, "content");
        if (content.length() > 1000) throw ApiException.badRequest("消息不能超过 1000 字");
        Domain.Message m = new Domain.Message(ids.nextId("msg"), principal.id(), principal.role().name(), content, Times.now());
        m.conversationId = id;
        messages.insert(m);
        c.userRead = principal.role() == Domain.Role.USER;
        c.merchantRead = principal.role() == Domain.Role.MERCHANT;
        conversations.updateReadFlags(id, c.userRead, c.merchantRead);
        return conversationView(c, principal);
    }

    @Transactional
    public Map<String,Object> markRead(Domain.Principal principal, String id) {
        Domain.Conversation c = conversations.findById(id);
        if (c == null || !visible(c, principal)) throw ApiException.notFound("会话不存在");
        if (principal.role() == Domain.Role.USER) c.userRead = true; else c.merchantRead = true;
        conversations.updateReadFlags(id, c.userRead, c.merchantRead);
        return conversationView(c, principal);
    }

    /** 优惠配置视图（契约 §6.3 字段映射）；deliveryFee 只读来自店铺。 */
    public Map<String,Object> promotion(Domain.Merchant m) {
        var store = stores.requireMerchantStore(m);
        Domain.PromoConfig cfg = promotions.findConfig(m.storeId);
        var v = new LinkedHashMap<String,Object>();
        boolean enabled = cfg != null && cfg.enabled;
        v.put("enabled", enabled);
        v.put("fullReductions", promotions.findTiers(m.storeId).stream()
                .map(t -> Map.of("threshold", t.threshold, "amount", t.amount)).toList());
        BigDecimal newUser = cfg == null ? BigDecimal.ZERO : cfg.newUserAmount;
        v.put("newCustomerAmount", newUser.setScale(2));
        v.put("newCustomerEnabled", newUser.signum() > 0);
        BigDecimal freeThr = cfg == null ? BigDecimal.ZERO : cfg.freeDeliveryThreshold;
        v.put("freeDeliveryThreshold", freeThr.setScale(2));
        BigDecimal rate = cfg == null ? BigDecimal.ONE : cfg.memberDiscountRate;
        v.put("memberDiscountRate", rate.setScale(2));
        v.put("memberDiscountEnabled", rate.signum() > 0 && rate.compareTo(BigDecimal.ONE) < 0);
        v.put("deliveryFee", store.deliveryFee.setScale(2));
        return v;
    }

    /** 保存校验（TC-PRV-008 / 契约 §6.3）：门槛与减额非负、阶梯门槛不重复、折扣率 (0,1]、免配送费门槛非负；非法 400 不落库。 */
    @Transactional
    public Map<String,Object> savePromotion(Domain.Merchant m, Requests.PromotionPatch req) {
        stores.requireMerchantStore(m);
        if (req == null) throw ApiException.badRequest("请求体不能为空");
        boolean enabled = Boolean.TRUE.equals(req.enabled);
        // 满减阶梯：非负、减额不超门槛、门槛不重复（按门槛取最大满足档的语义要求档位有序）。
        var tiers = new java.util.ArrayList<Domain.PromoTier>();
        if (req.fullReductions != null) {
            for (var t : req.fullReductions) {
                if (t == null || t.threshold == null || t.amount == null) throw ApiException.badRequest("满减档位不完整");
                if (t.threshold.signum() < 0 || t.amount.signum() < 0) throw ApiException.badRequest("满减门槛与金额不能为负");
                if (t.amount.compareTo(t.threshold) > 0) throw ApiException.badRequest("满减金额不能超过门槛");
                if (tiers.stream().anyMatch(x -> x.threshold.compareTo(t.threshold) == 0))
                    throw ApiException.badRequest("满减门槛不能重复");
                tiers.add(new Domain.PromoTier(t.threshold.setScale(2), t.amount.setScale(2)));
            }
            tiers.sort(java.util.Comparator.comparing(x -> x.threshold));
        }
        // 新客立减：enabled 才生效，金额非负。
        BigDecimal newUser = BigDecimal.ZERO;
        if (Boolean.TRUE.equals(req.newCustomerEnabled) && req.newCustomerAmount != null) {
            if (req.newCustomerAmount.signum() < 0) throw ApiException.badRequest("新客立减金额不能为负");
            newUser = req.newCustomerAmount.setScale(2);
        }
        // 免配送费门槛：非负，0=不启用。
        BigDecimal freeThr = BigDecimal.ZERO;
        if (req.freeDeliveryThreshold != null) {
            if (req.freeDeliveryThreshold.signum() < 0) throw ApiException.badRequest("免配送费门槛不能为负");
            freeThr = req.freeDeliveryThreshold.setScale(2);
        }
        // 会员折扣率：合法范围 (0,1]；0 折等同免单、越界非法，均拒绝；disabled 写 1.00。
        BigDecimal rate = BigDecimal.ONE;
        if (Boolean.TRUE.equals(req.memberDiscountEnabled) && req.memberDiscountRate != null) {
            if (req.memberDiscountRate.signum() <= 0 || req.memberDiscountRate.compareTo(BigDecimal.ONE) > 0)
                throw ApiException.badRequest("会员折扣率必须在 0 与 1 之间");
            rate = req.memberDiscountRate.setScale(2);
        }
        promotions.upsert(m.storeId, enabled, newUser, freeThr, rate);
        promotions.deleteTiers(m.storeId);
        for (int i = 0; i < tiers.size(); i++)
            promotions.insertTier(m.storeId, tiers.get(i).threshold, tiers.get(i).amount, i + 1);
        return promotion(m);
    }

    public Map<String,Object> overview(Domain.Merchant m) {
        stores.requireMerchantStore(m);
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        Map<String,Object> agg = orderMapper.statisticsSummary(m.storeId, startOfDay(today));
        Map<String,Object> allTime = orderMapper.statisticsSummary(m.storeId, "1970-01-01 00:00:00");
        BigDecimal sales = decimal(agg.get("salesAmount"));
        var v = new LinkedHashMap<String,Object>();
        v.put("range", "today");
        v.put("startDate", today.toString());
        v.put("endDate", today.toString());
        v.put("todaySalesAmount", sales);
        v.put("validOrderCount", number(agg.get("orderCount")));
        v.put("expectedIncome", sales);
        v.put("pendingOrderCount", number(agg.get("pendingOrderCount")));
        v.put("unrepliedReviewCount", reviews.countUnrepliedByStore(m.storeId));
        v.put("unreadMessageCount", messages.countUnreadForMerchant(m.id));
        // 保留 P0 概览字段，避免旧调用在迁移期间中断；二阶段页面读取上面的 today* 字段。
        v.put("orderCount", number(allTime.get("orderCount")));
        v.put("salesAmount", decimal(allTime.get("salesAmount")));
        v.put("productCount", productMapper.countByStore(m.storeId));
        return v;
    }

    public Map<String,Object> analytics(Domain.Merchant m, String requestedRange) {
        stores.requireMerchantStore(m);
        String range = requestedRange == null || requestedRange.isBlank() ? "7d" : requestedRange;
        if (!Set.of("today", "7d", "30d").contains(range))
            throw ApiException.badRequest("range 只支持 today、7d 或 30d");

        int days = "today".equals(range) ? 1 : Integer.parseInt(range.substring(0, range.length() - 1));
        LocalDate endDate = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        LocalDate startDate = endDate.minusDays(days - 1L);
        String startAt = startOfDay(startDate);
        Map<String,Object> agg = orderMapper.statisticsSummary(m.storeId, startAt);
        long orderCount = number(agg.get("orderCount"));

        Map<String,Map<String,Object>> daily = new HashMap<>();
        for (Map<String,Object> row : orderMapper.statisticsTrend(m.storeId, startAt))
            daily.put(row.get("date").toString(), row);
        var trend = new ArrayList<Map<String,Object>>();
        for (int index = 0; index < days; index++) {
            String date = startDate.plusDays(index).toString();
            Map<String,Object> row = daily.get(date);
            var item = new LinkedHashMap<String,Object>();
            item.put("date", date);
            item.put("salesAmount", row == null ? BigDecimal.ZERO.setScale(2) : decimal(row.get("salesAmount")));
            item.put("orderCount", row == null ? 0L : number(row.get("orderCount")));
            trend.add(item);
        }

        var statusDistribution = orderMapper.statisticsByStatus(m.storeId, startAt).stream().map(row -> {
            var item = new LinkedHashMap<String,Object>();
            item.put("name", row.get("name").toString());
            item.put("value", number(row.get("value")));
            return item;
        }).toList();
        List<Map<String,Object>> channelDistribution = orderCount == 0 ? List.of()
                : List.of(Map.of("name", "外卖", "value", orderCount));

        var v = new LinkedHashMap<String,Object>();
        v.put("range", range);
        v.put("startDate", startDate.toString());
        v.put("endDate", endDate.toString());
        v.put("salesAmount", decimal(agg.get("salesAmount")));
        v.put("orderCount", orderCount);
        v.put("avgOrderAmount", decimal(agg.get("avgOrderAmount")));
        v.put("trend", trend);
        v.put("channelDistribution", channelDistribution);
        v.put("statusDistribution", statusDistribution);
        return v;
    }

    private String startOfDay(LocalDate date) {
        return date + " 00:00:00";
    }

    private BigDecimal decimal(Object value) {
        if (value == null) return BigDecimal.ZERO.setScale(2);
        return new BigDecimal(value.toString()).setScale(2, RoundingMode.HALF_UP);
    }

    private long number(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }

    private List<String> validateTags(List<String> tags) {
        if (tags == null) return List.of();
        var result = new java.util.ArrayList<String>();
        var seen = new java.util.HashSet<String>();
        for (String raw : tags) {
            String value = RequestUtil.required(raw, "tag");
            if (value.length() > 20) throw ApiException.badRequest("单个标签不能超过20个字符");
            if (seen.add(value)) result.add(value);
        }
        if (result.size() > 10) throw ApiException.badRequest("标签最多10个");
        return result;
    }

    private List<String> validateReviewImages(List<String> images) {
        if (images == null) return List.of();
        if (images.size() > 3) throw ApiException.badRequest("评价图片最多3张");
        var result = new java.util.ArrayList<String>();
        for (String raw : images) {
            String value = RequestUtil.required(raw, "image");
            String lower = value.toLowerCase(java.util.Locale.ROOT);
            if (!value.startsWith("/uploads/") ||
                    !(lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp")))
                throw ApiException.badRequest("评价图片必须来自平台上传接口且类型为jpg/jpeg/png/webp");
            result.add(value);
        }
        return result;
    }

    private boolean visible(Domain.Conversation c, Domain.Principal p) {
        return p.role() == Domain.Role.USER ? c.userId.equals(p.id()) : c.merchantId.equals(p.id());
    }

    private Map<String,Object> conversationView(Domain.Conversation c, Domain.Principal principal) {
        List<Domain.Message> allMessages = messages.findByConversation(c.id);
        var messageViews = allMessages.stream().map(message -> {
            var item = new LinkedHashMap<String,Object>();
            item.put("messageId", message.id);
            item.put("senderId", message.senderId);
            item.put("senderRole", message.senderRole);
            item.put("content", message.content);
            item.put("createdAt", message.createdAt);
            return item;
        }).toList();
        Domain.Message last = allMessages.isEmpty() ? null : allMessages.get(allMessages.size() - 1);
        boolean read = principal.role() == Domain.Role.USER ? c.userRead : c.merchantRead;
        String peerRole = principal.role() == Domain.Role.USER ? Domain.Role.MERCHANT.name() : Domain.Role.USER.name();
        long unreadCount = read ? 0 : allMessages.stream().filter(message -> peerRole.equals(message.senderRole)).count();

        var v = new LinkedHashMap<String,Object>();
        v.put("conversationId", c.id);
        v.put("orderId", c.orderId);
        v.put("storeId", c.storeId);
        v.put("storeName", c.storeName);
        v.put("userId", c.userId);
        v.put("userNickname", maskNickname(c.userNickname));
        v.put("merchantId", c.merchantId);
        v.put("userRead", c.userRead);
        v.put("merchantRead", c.merchantRead);
        v.put("unreadCount", unreadCount);
        v.put("lastMessage", last == null ? "" : last.content);
        v.put("updatedAt", last == null ? "" : last.createdAt);
        v.put("messages", messageViews);
        return v;
    }

    private String maskNickname(String nickname) {
        if (nickname == null || nickname.isBlank()) return "匿名用户";
        return nickname.substring(0, 1) + "**";
    }
}
