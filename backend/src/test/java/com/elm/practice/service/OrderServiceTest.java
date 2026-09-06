package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.domain.Domain;
import com.elm.practice.dto.Requests;
import com.elm.practice.repository.InMemoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class OrderServiceTest {
    private InMemoryRepository repo;
    private OrderService orders;
    private Domain.User user;
    private Domain.Merchant merchant;

    @BeforeEach void setUp() {
        repo = new InMemoryRepository(); repo.seed();
        var stores = new StoreService(repo);
        var addresses = new AddressService(repo);
        orders = new OrderService(repo, stores, addresses);
        user = repo.users.get("u001");
        merchant = repo.merchants.get("ma001");
    }

    private Domain.Order createFromCart() {
        repo.cartLines.put("cl-test", new Domain.CartLine("cl-test", "u001", "m002", "p101", 2,
                new java.math.BigDecimal("29.00"), java.time.LocalDateTime.now()));
        Requests.OrderCreate request = new Requests.OrderCreate(); request.storeId="m002"; request.addressId="da001";
        return orders.create(user, request);
    }

    @Test void createOrderSnapshotsPriceAddsPackagingFeeAndClearsCart() {
        repo.cartLines.put("cl-test", new Domain.CartLine("cl-test", "u001", "m002", "p101", 2,
                new java.math.BigDecimal("29.00"), java.time.LocalDateTime.now()));
        Requests.OrderCreate request = new Requests.OrderCreate(); request.storeId="m002"; request.addressId="da001"; request.expectedTotal=new java.math.BigDecimal("999");
        Domain.Order order = orders.create(user, request);
        assertEquals(new java.math.BigDecimal("58.00"), order.itemSubtotal);
        assertEquals(new java.math.BigDecimal("2.00"), order.packagingFee);
        assertEquals(new java.math.BigDecimal("60.00"), order.total);
        assertEquals(Domain.OrderStatus.PENDING_PAYMENT, order.status);
        assertTrue(repo.cartLines.isEmpty());
        assertEquals(18, repo.products.get("p101").stock);
        assertEquals("吮指原味鸡", order.items.get(0).name);
    }

    @Test void insufficientStockDoesNotCreateOrderOrClearCart() {
        repo.cartLines.put("cl-test", new Domain.CartLine("cl-test", "u001", "m002", "p101", 999,
                new java.math.BigDecimal("29.00"), java.time.LocalDateTime.now()));
        Requests.OrderCreate request = new Requests.OrderCreate(); request.storeId="m002"; request.addressId="da001";
        ApiException ex = assertThrows(ApiException.class, () -> orders.create(user, request));
        assertEquals(409, ex.getStatus().value());
        assertEquals(40901, ex.getCode());
        assertTrue(repo.orders.keySet().containsAll(java.util.List.of("o1001", "o1002")));
        assertTrue(repo.cartLines.containsKey("cl-test"));
    }

    @Test void unpaidOrderBecomesProcessingAfterPaymentAndRepeatPayIsIdempotent() {
        Domain.Order order = createFromCart();
        assertEquals(Domain.OrderStatus.PENDING_PAYMENT, order.status);
        assertNull(order.paidAt);
        assertEquals(Domain.OrderStatus.PROCESSING, orders.pay(user, order.id, true).status);
        assertNotNull(repo.orders.get(order.id).paidAt);
        assertEquals(Domain.OrderStatus.PROCESSING, orders.pay(user, order.id, true).status);
    }

    @Test void expiredPendingPaymentReturnsConflict() {
        Domain.Order order = createFromCart();
        repo.orders.get(order.id).createdAt = "2020-01-01 00:00:00";
        ApiException ex = assertThrows(ApiException.class, () -> orders.pay(user, order.id, true));
        assertEquals(409, ex.getStatus().value());
        assertEquals(40901, ex.getCode());
    }

    @Test void merchantSeesOrderOnlyAfterPayment() {
        Domain.Order order = createFromCart();
        ApiException unseen = assertThrows(ApiException.class, () -> orders.merchantGet(merchant, order.id));
        assertEquals(404, unseen.getStatus().value());
        orders.pay(user, order.id, true);
        assertEquals(order.id, orders.merchantGet(merchant, order.id).id);
    }

    @Test void otherUserCannotReadSomeoneElsesOrder() {
        Domain.Order order = createFromCart();
        Domain.User stranger = new Domain.User("u002", "13800000002", "hash", "陌生人", "2026-01-01 00:00:00");
        ApiException ex = assertThrows(ApiException.class, () -> orders.get(stranger, order.id));
        assertEquals(404, ex.getStatus().value());
    }

    @Test void merchantStatusCannotJumpAndRepeatedTargetIsIdempotent() {
        assertThrows(ApiException.class, () -> orders.advance(merchant, "o1001", "COMPLETED"));
        assertEquals(Domain.OrderStatus.PENDING, orders.advance(merchant, "o1001", "PENDING").status);
        assertEquals(Domain.OrderStatus.PENDING, orders.advance(merchant, "o1001", "PENDING").status);
    }
}
