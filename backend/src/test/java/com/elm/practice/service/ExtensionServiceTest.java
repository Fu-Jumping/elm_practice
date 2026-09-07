package com.elm.practice.service;

import com.elm.practice.repository.InMemoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class ExtensionServiceTest {
    private InMemoryRepository repo;
    private ExtensionService extension;

    @BeforeEach void setUp() {
        repo = new InMemoryRepository(); repo.seed();
        var stores = new StoreService(repo);
        var addresses = new AddressService(repo);
        extension = new ExtensionService(repo, new OrderService(repo, stores, addresses), stores);
    }

    @Test void overviewExcludesUnpaidOrders() {
        var view = extension.overview(repo.merchants.get("ma001"));
        // o1001 PROCESSING 31.00 + o1002 COMPLETED 21.00；种子待支付订单 o1003 不计入。
        assertEquals(2L, ((Number) view.get("orderCount")).longValue());
        assertEquals(0, new BigDecimal("52.00").compareTo((BigDecimal) view.get("salesAmount")));
    }
}
