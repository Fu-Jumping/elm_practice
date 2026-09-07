package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.domain.Domain;
import com.elm.practice.dto.Requests;
import com.elm.practice.repository.InMemoryRepository;
import org.springframework.stereotype.Service;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Optional P1 endpoints kept small and deterministic for the course demo. */
@Service
public class ExtensionService {
    private final InMemoryRepository repo; private final OrderService orders; private final StoreService stores;
    public ExtensionService(InMemoryRepository repo, OrderService orders, StoreService stores){this.repo=repo;this.orders=orders;this.stores=stores;}
    public List<Map<String,Object>> storeReviews(String storeId, Integer rating){synchronized(repo){stores.get(storeId);return repo.reviews.values().stream().filter(r->r.storeId.equals(storeId)&&(rating==null||r.rating==rating)).sorted(Comparator.comparing((Domain.Review r)->r.createdAt).reversed()).map(ViewMapper::review).toList();}}
    public Domain.Review review(Domain.User user,String orderId,Requests.ReviewCreate req){synchronized(repo){Domain.Order order=orders.get(user,orderId);if(order.status!=Domain.OrderStatus.COMPLETED)throw ApiException.conflict("仅已完成订单可以评价");if(repo.reviews.values().stream().anyMatch(r->r.orderId.equals(orderId)))throw ApiException.conflict("同一订单只能评价一次");if(req==null||req.rating==null||req.rating<1||req.rating>5)throw ApiException.badRequest("rating 必须在 1-5 之间");String content=RequestUtil.required(req.content,"content");if(content.length()>500)throw ApiException.badRequest("评价内容不能超过 500 字");Domain.Review r=new Domain.Review(repo.nextId("rv"),orderId,order.storeId,user.id,content,req.rating,repo.now());repo.reviews.put(r.id,r);return r;}}
    public List<Map<String,Object>> merchantReviews(Domain.Merchant merchant){synchronized(repo){return repo.reviews.values().stream().filter(r->r.storeId.equals(merchant.storeId)).sorted(Comparator.comparing((Domain.Review r)->r.createdAt).reversed()).map(ViewMapper::review).toList();}}
    public Domain.Review reply(Domain.Merchant merchant,String id,Requests.ReplyPatch req){synchronized(repo){Domain.Review r=repo.reviews.get(id);if(r==null||!r.storeId.equals(merchant.storeId))throw ApiException.notFound("评价不存在");String reply=RequestUtil.required(req==null?null:req.reply,"reply");if(reply.length()>500)throw ApiException.badRequest("回复不能超过 500 字");r.reply=reply;r.repliedAt=repo.now();return r;}}
    public List<Map<String,Object>> conversations(Domain.Principal principal){synchronized(repo){return repo.conversations.values().stream().filter(c->principal.role()==Domain.Role.USER?c.userId.equals(principal.id()):c.merchantId.equals(principal.id())).map(this::conversationView).toList();}}
    public Map<String,Object> conversation(Domain.Principal principal,String id){synchronized(repo){Domain.Conversation c=repo.conversations.get(id);if(c==null||!visible(c,principal))throw ApiException.notFound("会话不存在");return conversationView(c);}}
    public Map<String,Object> send(Domain.Principal principal,String id,Requests.MessageCreate req){synchronized(repo){Domain.Conversation c=repo.conversations.get(id);if(c==null||!visible(c,principal))throw ApiException.notFound("会话不存在");String content=RequestUtil.required(req==null?null:req.content,"content");if(content.length()>1000)throw ApiException.badRequest("消息不能超过 1000 字");Domain.Message m=new Domain.Message(repo.nextId("msg"),principal.id(),principal.role().name(),content,repo.now());c.messages.add(m);c.userRead=principal.role()==Domain.Role.USER;c.merchantRead=principal.role()==Domain.Role.MERCHANT;return conversationView(c);}}
    public Map<String,Object> markRead(Domain.Principal principal,String id){synchronized(repo){Domain.Conversation c=repo.conversations.get(id);if(c==null||!visible(c,principal))throw ApiException.notFound("会话不存在");if(principal.role()==Domain.Role.USER)c.userRead=true;else c.merchantRead=true;return conversationView(c);}}
    public Map<String,Object> promotion(Domain.Merchant m){synchronized(repo){stores.requireMerchantStore(m);return repo.promotions.computeIfAbsent(m.storeId,k->{var v=new LinkedHashMap<String,Object>();v.put("enabled",false);v.put("threshold",BigDecimalValue.zero());v.put("amount",BigDecimalValue.zero());return v;});}}
    public Map<String,Object> savePromotion(Domain.Merchant m,Requests.PromotionPatch req){synchronized(repo){stores.requireMerchantStore(m);if(req==null)throw ApiException.badRequest("请求体不能为空");if(req.threshold==null||req.amount==null)throw ApiException.badRequest("threshold 和 amount 不能为空");if(req.threshold.signum()<0||req.amount.signum()<0)throw ApiException.badRequest("优惠金额不能为负");if(req.amount.compareTo(req.threshold)>0&&req.threshold.signum()>0)throw ApiException.badRequest("优惠金额不能超过门槛");var v=promotion(m);v.put("enabled",Boolean.TRUE.equals(req.enabled));v.put("threshold",req.threshold.setScale(2));v.put("amount",req.amount.setScale(2));return v;}}
    public Map<String,Object> overview(Domain.Merchant m){synchronized(repo){stores.requireMerchantStore(m);
        // 概览只统计已支付订单（PENDING_PAYMENT 不计入营收口径）。
        long count=repo.orders.values().stream().filter(o->o.storeId.equals(m.storeId)&&o.status!=Domain.OrderStatus.PENDING_PAYMENT).count();
        BigDecimalValue total=new BigDecimalValue();repo.orders.values().stream().filter(o->o.storeId.equals(m.storeId)&&o.status!=Domain.OrderStatus.PENDING_PAYMENT).forEach(o->total.value=total.value.add(o.total));
        var v=new LinkedHashMap<String,Object>();v.put("orderCount",count);v.put("salesAmount",total.value.setScale(2));v.put("productCount",repo.products.values().stream().filter(p->p.storeId.equals(m.storeId)).count());return v;}}
    public Map<String,Object> analytics(Domain.Merchant m,String range){var v=overview(m);v.put("range",range==null||range.isBlank()?"7d":range);v.put("daily",List.of());return v;}
    private boolean visible(Domain.Conversation c,Domain.Principal p){return p.role()==Domain.Role.USER?c.userId.equals(p.id()):c.merchantId.equals(p.id());}
    private Map<String,Object> conversationView(Domain.Conversation c){var v=new LinkedHashMap<String,Object>();v.put("conversationId",c.id);v.put("orderId",c.orderId);v.put("userId",c.userId);v.put("merchantId",c.merchantId);v.put("userRead",c.userRead);v.put("merchantRead",c.merchantRead);v.put("messages",c.messages);return v;}
    private static final class BigDecimalValue { java.math.BigDecimal value; BigDecimalValue(){value=java.math.BigDecimal.ZERO;} static java.math.BigDecimal zero(){return java.math.BigDecimal.ZERO.setScale(2);} }
}
