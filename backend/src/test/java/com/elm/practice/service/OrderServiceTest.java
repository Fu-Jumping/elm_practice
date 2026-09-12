package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.domain.Domain;
import com.elm.practice.dto.Requests;
import com.elm.practice.mapper.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlConfig;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 订单服务测试：真事务 + DB 断言（原 repo 状态断言改为注入 mapper 查询，场景与口径不变）。
 * 每用例前 reset.sql 复位：p101 库存 100、种子订单 o1001/o1002/o1003。
 */
@SpringBootTest
@SqlConfig(encoding = "UTF-8")
@Sql(scripts = "/reset.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class OrderServiceTest {
    @Autowired OrderService orders;
    @Autowired UserMapper userMapper;
    @Autowired MerchantMapper merchantMapper;
    @Autowired ProductMapper productMapper;
    @Autowired CartLineMapper cartLineMapper;
    @Autowired OrderMapper orderMapper;
    @Autowired OrderItemMapper orderItemMapper;

    private Domain.User user() { return userMapper.findById("u001"); }
    private Domain.Merchant merchant() { return merchantMapper.findById("ma001"); }

    private void seedCartLine(String productId, int quantity) {
        cartLineMapper.insert(new Domain.CartLine("cl-test", "u001", "m002", productId, quantity,
                new BigDecimal("19.50"), LocalDateTime.now()));
    }

    private Domain.Order createFromCart() {
        seedCartLine("p101", 2);
        Requests.OrderCreate request = new Requests.OrderCreate(); request.storeId="m002"; request.addressId="da001";
        return orders.create(user(), request);
    }

    @Test void createOrderSnapshotsPriceAddsPackagingFeeAndClearsCart() {
        seedCartLine("p101", 2);
        Requests.OrderCreate request = new Requests.OrderCreate(); request.storeId="m002"; request.addressId="da001"; request.expectedTotal=new BigDecimal("999");
        Domain.Order order = orders.create(user(), request);
        assertEquals(new BigDecimal("39.00"), order.itemSubtotal);
        assertEquals(new BigDecimal("2.00"), order.packagingFee);
        // 批次① 计价口径（reset.sql 促销基线：满 20 减 2、满 30 免配送费）：
        // 小计 39 ≥ 20 减 2，≥ 30 免配送费 5，u001 有演示订单非新客 → 实付 = 39 − 2 + 5 − 5 + 2 = 39.00。
        assertEquals(new BigDecimal("2.00"), order.fullReductionAmount);
        assertEquals(new BigDecimal("5.00"), order.deliveryFee);
        assertEquals(new BigDecimal("5.00"), order.deliveryFeeDiscount);
        assertEquals(new BigDecimal("39.00"), order.total);
        assertEquals(Domain.OrderStatus.PENDING_PAYMENT, order.status);
        // 原 repo.cartLines.isEmpty()：购物车行已删除。
        assertTrue(cartLineMapper.findByUserAndStore("u001", "m002").isEmpty());
        // p101 是素材清单中的香辣鸡腿堡，库存扣减落库。
        assertEquals(98, productMapper.findById("p101").stock);
        assertEquals("香辣鸡腿堡", order.items.get(0).name);
        // 明细落库（修复点：create 必须插 order_items）。
        assertEquals(1, orderItemMapper.findByOrder(order.id).size());
    }

    @Test void insufficientStockDoesNotCreateOrderOrClearCart() {
        seedCartLine("p101", 999);
        Requests.OrderCreate request = new Requests.OrderCreate(); request.storeId="m002"; request.addressId="da001";
        ApiException ex = assertThrows(ApiException.class, () -> orders.create(user(), request));
        assertEquals(409, ex.getStatus().value());
        assertEquals(40901, ex.getCode());
        // 原 repo.orders.keySet().containsAll(o1001,o1002)：没有新增订单。
        assertNotNull(orderMapper.findById("o1001"));
        assertNotNull(orderMapper.findById("o1002"));
        // 原 repo.cartLines.containsKey("cl-test")：事务回滚，购物车行保留。
        assertNotNull(cartLineMapper.findById("cl-test"));
        assertEquals(100, productMapper.findById("p101").stock);
    }

    /** 状态机修正（TODO-BE-002）：支付成功即 PENDING（待接单），PROCESSING 仅 P0 历史兼容，不再是支付后状态。 */
    @Test void unpaidOrderBecomesPendingAfterPaymentAndRepeatPayIsIdempotent() {
        Domain.Order order = createFromCart();
        assertEquals(Domain.OrderStatus.PENDING_PAYMENT, order.status);
        assertNull(order.paidAt);
        assertEquals(Domain.OrderStatus.PENDING, orders.pay(user(), order.id, true).status);
        assertNotNull(orderMapper.findById(order.id).paidAt);
        assertEquals(Domain.OrderStatus.PENDING, orders.pay(user(), order.id, true).status);
    }

    @Test void expiredPendingPaymentReturnsConflict() {
        Domain.Order order = createFromCart();
        // 原 repo.orders.get(id).createdAt = "2020-..."：经测试辅助 mapper 改库后支付应超时。
        orderMapper.updateCreatedAt(order.id, "2020-01-01 00:00:00");
        ApiException ex = assertThrows(ApiException.class, () -> orders.pay(user(), order.id, true));
        assertEquals(409, ex.getStatus().value());
        assertEquals(40901, ex.getCode());
    }

    @Test void merchantSeesOrderOnlyAfterPayment() {
        Domain.Order order = createFromCart();
        ApiException unseen = assertThrows(ApiException.class, () -> orders.merchantGet(merchant(), order.id));
        assertEquals(404, unseen.getStatus().value());
        orders.pay(user(), order.id, true);
        assertEquals(order.id, orders.merchantGet(merchant(), order.id).id);
    }

    @Test void otherUserCannotReadSomeoneElsesOrder() {
        Domain.Order order = createFromCart();
        Domain.User stranger = new Domain.User("u002", "13800000002", "hash", "陌生人", "2026-01-01 00:00:00");
        ApiException ex = assertThrows(ApiException.class, () -> orders.get(stranger, order.id));
        assertEquals(404, ex.getStatus().value());
    }

    @Test void merchantStatusCannotJumpAndRepeatedTargetIsIdempotent() {
        assertThrows(ApiException.class, () -> orders.advance(merchant(), "o1001", "COMPLETED"));
        assertEquals(Domain.OrderStatus.PENDING, orders.advance(merchant(), "o1001", "PENDING").status);
        assertEquals(Domain.OrderStatus.PENDING, orders.advance(merchant(), "o1001", "PENDING").status);
    }
}
