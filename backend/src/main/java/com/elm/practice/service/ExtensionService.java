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

    public List<Map<String,Object>> storeReviews(String storeId, Integer rating) {
        stores.get(storeId);
        return reviews.findByStore(storeId, rating).stream().map(ViewMapper::review).toList();
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
        return reviews.findByStore(merchant.storeId, null).stream().map(ViewMapper::review).toList();
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

    public List<Map<String,Object>> conversations(Domain.Principal principal) {
        List<Domain.Conversation> list = principal.role() == Domain.Role.USER
                ? conversations.listForUser(principal.id())
                : conversations.listForMerchant(principal.id());
        return list.stream().map(this::conversationView).toList();
    }

    public Map<String,Object> conversation(Domain.Principal principal, String id) {
        Domain.Conversation c = conversations.findById(id);
        if (c == null || !visible(c, principal)) throw ApiException.notFound("会话不存在");
        return conversationView(c);
    }

    @Transactional
    public Map<String,Object> send(Domain.Principal principal, String id, Requests.MessageCreate req) {
        Domain.Conversation c = conversations.findById(id);
        if (c == null || !visible(c, principal)) throw ApiException.notFound("会话不存在");
        String content = RequestUtil.required(req == null ? null : req.content, "content");
        if (content.length() > 1000) throw ApiException.badRequest("消息不能超过 1000 字");
        Domain.Message m = new Domain.Message(ids.nextId("msg"), principal.id(), principal.role().name(), content, Times.now());
        messages.insert(m);
        c.messages.add(m);
        c.userRead = principal.role() == Domain.Role.USER;
        c.merchantRead = principal.role() == Domain.Role.MERCHANT;
        conversations.updateReadFlags(id, c.userRead, c.merchantRead);
        return conversationView(c);
    }

    @Transactional
    public Map<String,Object> markRead(Domain.Principal principal, String id) {
        Domain.Conversation c = conversations.findById(id);
        if (c == null || !visible(c, principal)) throw ApiException.notFound("会话不存在");
        if (principal.role() == Domain.Role.USER) c.userRead = true; else c.merchantRead = true;
        conversations.updateReadFlags(id, c.userRead, c.merchantRead);
        return conversationView(c);
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
        // 概览只统计已支付订单（PENDING_PAYMENT 不计入营收口径）。
        Map<String,Object> agg = orderMapper.overviewByStore(m.storeId);
        var v = new LinkedHashMap<String,Object>();
        v.put("orderCount", ((Number) agg.get("orderCount")).longValue());
        v.put("salesAmount", new BigDecimal(agg.get("salesAmount").toString()).setScale(2));
        v.put("productCount", productMapper.countByStore(m.storeId));
        return v;
    }

    public Map<String,Object> analytics(Domain.Merchant m, String range) {
        var v = overview(m);
        v.put("range", range == null || range.isBlank() ? "7d" : range);
        v.put("daily", List.of());
        return v;
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

    private Map<String,Object> conversationView(Domain.Conversation c) {
        var v = new LinkedHashMap<String,Object>();
        v.put("conversationId", c.id); v.put("orderId", c.orderId); v.put("userId", c.userId);
        v.put("merchantId", c.merchantId); v.put("userRead", c.userRead); v.put("merchantRead", c.merchantRead);
        v.put("messages", c.messages.isEmpty() ? messages.findByConversation(c.id) : c.messages);
        return v;
    }
}
