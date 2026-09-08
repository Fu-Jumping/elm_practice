package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.IdGenerator;
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

    public Map<String,Object> promotion(Domain.Merchant m) {
        stores.requireMerchantStore(m);
        Map<String,Object> row = promotions.findByStore(m.storeId);
        if (row != null) return row;
        var v = new LinkedHashMap<String,Object>();
        v.put("enabled", false);
        v.put("threshold", BigDecimal.ZERO.setScale(2));
        v.put("amount", BigDecimal.ZERO.setScale(2));
        return v;
    }

    @Transactional
    public Map<String,Object> savePromotion(Domain.Merchant m, Requests.PromotionPatch req) {
        stores.requireMerchantStore(m);
        if (req == null) throw ApiException.badRequest("请求体不能为空");
        if (req.threshold == null || req.amount == null) throw ApiException.badRequest("threshold 和 amount 不能为空");
        if (req.threshold.signum() < 0 || req.amount.signum() < 0) throw ApiException.badRequest("优惠金额不能为负");
        if (req.amount.compareTo(req.threshold) > 0 && req.threshold.signum() > 0) throw ApiException.badRequest("优惠金额不能超过门槛");
        boolean enabled = Boolean.TRUE.equals(req.enabled);
        promotions.upsert(m.storeId, enabled, req.threshold.setScale(2), req.amount.setScale(2));
        var v = new LinkedHashMap<String,Object>();
        v.put("enabled", enabled);
        v.put("threshold", req.threshold.setScale(2));
        v.put("amount", req.amount.setScale(2));
        return v;
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
