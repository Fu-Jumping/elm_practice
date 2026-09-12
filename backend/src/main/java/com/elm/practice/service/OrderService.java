package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.IdGenerator;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.common.Times;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.domain.Domain;
import com.elm.practice.dto.Requests;
import com.elm.practice.mapper.CartLineMapper;
import com.elm.practice.mapper.ConversationMapper;
import com.elm.practice.mapper.OrderItemMapper;
import com.elm.practice.mapper.OrderMapper;
import com.elm.practice.mapper.ProductMapper;
import com.elm.practice.mapper.PromotionMapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class OrderService {
    private static final BigDecimal PACKAGING_FEE = new BigDecimal("2.00");
    private final OrderMapper orders; private final OrderItemMapper orderItems;
    private final CartLineMapper cartLines; private final ProductMapper products;
    private final ConversationMapper conversations; private final PromotionMapper promotions;
    private final StoreService stores; private final AddressService addresses; private final IdGenerator ids;
    private final PricingService pricing;

    public OrderService(OrderMapper orders, OrderItemMapper orderItems, CartLineMapper cartLines,
                        ProductMapper products, ConversationMapper conversations, PromotionMapper promotions,
                        StoreService stores, AddressService addresses, IdGenerator ids, PricingService pricing) {
        this.orders = orders; this.orderItems = orderItems; this.cartLines = cartLines;
        this.products = products; this.conversations = conversations; this.promotions = promotions;
        this.stores = stores; this.addresses = addresses; this.ids = ids; this.pricing = pricing;
    }

    /** @Transactional 即真实 DB 事务：任何一步抛错整体回滚（扣库存、清购物车、订单/明细/会话插入原子）。 */
    @Transactional
    public Domain.Order create(Domain.User u, Requests.OrderCreate r) {
        if (r == null) throw ApiException.badRequest("请求体不能为空");
        String sid = RequestUtil.required(r.storeId, "storeId"), aid = RequestUtil.required(r.addressId, "addressId");
        if (r.idempotencyKey != null && !r.idempotencyKey.isBlank()) {
            Domain.Order old = orders.findByIdempotent(u.id, r.idempotencyKey);
            if (old != null) return withItems(old);
        }
        Domain.Store store = stores.get(sid);
        if (store.status != Domain.StoreStatus.OPEN) throw ApiException.conflict("店铺当前未营业");
        Domain.Address address = addresses.get(u, aid);
        // 购物车行 FOR UPDATE：并发下单对同一购物车串行化。
        List<Domain.CartLine> lines = cartLines.findByUserAndStoreForUpdate(u.id, sid);
        if (lines.isEmpty()) throw ApiException.badRequest("购物车为空");
        BigDecimal subtotal = BigDecimal.ZERO;
        var snapshots = new java.util.ArrayList<Domain.OrderItem>();
        for (Domain.CartLine line : lines) {
            Domain.Product p = products.findById(line.productId);
            if (p == null || !p.onSale) throw ApiException.conflict("商品已下架");
            if (line.quantity > p.stock) throw new ApiException(org.springframework.http.HttpStatus.CONFLICT, 40901,
                    "商品库存不足", Map.of("productId", p.id, "reason", "库存最多为 " + p.stock));
            BigDecimal unit = p.price.setScale(2);
            subtotal = subtotal.add(unit.multiply(BigDecimal.valueOf(line.quantity)));
            snapshots.add(new Domain.OrderItem(p.id, p.name, p.image, p.categoryId, unit, line.quantity));
        }
        subtotal = subtotal.setScale(2);
        if (subtotal.compareTo(store.startPrice) < 0) throw ApiException.conflict("未达到起送金额 " + store.startPrice);
        // 优惠计价七步（批次①，PRD 7.4）：满减/新客/免配送费随 promotions 配置；会员与红包批次⑥接入，当前非会员、红包 0。
        var promo = promotions.findConfig(sid);
        if (promo == null) promo = new Domain.PromoConfig();
        promo.tiers.addAll(promotions.findTiers(sid));
        boolean isNewCustomer = orders.countByUserAndStore(u.id, sid) == 0;
        var pr = pricing.price(subtotal, store.deliveryFee, promo, isNewCustomer, false, BigDecimal.ZERO);
        BigDecimal total = pr.total;
        String id = ids.nextId("o");
        // 支付扩展已选定：订单创建即待支付，15 分钟内支付成功后进入待接单（契约 3.5；状态机修正 BE-002）。
        Domain.Order order = new Domain.Order(id, u.id, sid, aid, r.remark == null ? "" : r.remark.trim(), Times.now(),
                Domain.OrderStatus.PENDING_PAYMENT, pr.itemSubtotal, pr.packagingFee, total,
                address.copy(), r.idempotencyKey);
        order.deliveryFee = pr.deliveryFee; order.fullReductionAmount = pr.fullReductionAmount;
        order.newCustomerAmount = pr.newCustomerAmount; order.memberDiscountAmount = pr.memberDiscountAmount;
        order.couponAmount = pr.couponAmount; order.deliveryFeeDiscount = pr.deliveryFeeDiscount;
        try { orders.insert(order); }
        catch (DuplicateKeyException e) {
            // 幂等键并发兜底：唯一约束命中则返回既有订单。
            Domain.Order existing = orders.findByIdempotent(u.id, r.idempotencyKey);
            if (existing != null) return withItems(existing);
            throw e;
        }
        // 会话随订单创建，"联系商家"仅限该订单用户与商家之间。
        if (store.merchantId != null) {
            conversations.insert(new Domain.Conversation(ids.nextId("cv"), id, u.id, store.merchantId));
        }
        // 订单明细落库（价格/名称快照，不受后续商品改价影响）。
        for (Domain.OrderItem item : snapshots) orderItems.insert(id, item);
        for (Domain.CartLine line : lines) {
            int updated = products.decreaseStock(line.productId, line.quantity);
            if (updated == 0) throw new ApiException(org.springframework.http.HttpStatus.CONFLICT, 40901,
                    "商品库存不足", Map.of("productId", line.productId, "reason", "库存不足，请刷新后重试"));
        }
        cartLines.deleteByUserAndStore(u.id, sid);
        order.items.addAll(snapshots);
        return order;
    }

    public List<Map<String,Object>> list(Domain.User u, String status) {
        return orders.listByUser(u.id, status).stream().map(o -> ViewMapper.order(o, false)).toList();
    }

    public Domain.Order get(Domain.User u, String id) {
        Domain.Order o = orders.findById(id);
        if (o == null || !o.userId.equals(u.id)) throw ApiException.notFound("订单不存在");
        return withItems(o);
    }

    public List<Map<String,Object>> merchantList(Domain.Merchant m, String status) {
        return orders.listForMerchant(m.storeId, status).stream().map(o -> ViewMapper.order(o, false)).toList();
    }

    public Domain.Order merchantGet(Domain.Merchant m, String id) {
        Domain.Order o = orders.findById(id);
        if (o == null || !m.storeId.equals(o.storeId) || o.status == Domain.OrderStatus.PENDING_PAYMENT)
            throw ApiException.notFound("订单不存在");
        return withItems(o);
    }

    @Transactional
    public Domain.Order pay(Domain.User u, String id, boolean success) {
        Domain.Order o = get(u, id);
        if (o.status != Domain.OrderStatus.PENDING_PAYMENT) return o;
        if (LocalDateTime.now().minusMinutes(15).isAfter(LocalDateTime.parse(o.createdAt, Times.TIME)))
            throw ApiException.conflict("支付已超时");
        if (success) {
            String paidAt = Times.now();
            if (orders.markPaid(id, paidAt) > 0) { o.status = Domain.OrderStatus.PROCESSING; o.paidAt = paidAt; }
        }
        return o;
    }

    @Transactional
    public Domain.Order advance(Domain.Merchant m, String id, String next) {
        Domain.Order o = merchantGet(m, id);
        Domain.OrderStatus target;
        try { target = Domain.OrderStatus.valueOf(RequestUtil.required(next, "status")); }
        catch (IllegalArgumentException e) { throw ApiException.badRequest("非法订单状态"); }
        if (o.status == target) return o;
        boolean valid = (o.status == Domain.OrderStatus.PROCESSING && target == Domain.OrderStatus.PENDING)
                || (o.status == Domain.OrderStatus.PENDING && target == Domain.OrderStatus.COOKING)
                || (o.status == Domain.OrderStatus.COOKING && target == Domain.OrderStatus.DELIVERING)
                || (o.status == Domain.OrderStatus.DELIVERING && target == Domain.OrderStatus.COMPLETED);
        if (!valid) throw ApiException.conflict("订单状态不能跳级");
        if (orders.updateStatusConditional(id, o.status, target) == 0) {
            Domain.Order current = orders.findById(id);
            if (current == null || current.status != target) throw ApiException.conflict("订单状态已变化，请刷新后重试");
            return withItems(current);
        }
        o.status = target;
        return o;
    }

    private Domain.Order withItems(Domain.Order o) {
        o.items.addAll(orderItems.findByOrder(o.id));
        return o;
    }
}
