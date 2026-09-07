package com.elm.practice.service;

import com.elm.practice.domain.Domain;
import com.elm.practice.repository.InMemoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class StoreServiceTest {
    private InMemoryRepository repo;
    private StoreService stores;

    @BeforeEach void setUp() { repo = new InMemoryRepository(); repo.seed(); stores = new StoreService(repo); }

    @Test void closedStoresAreHiddenWhileTemporarilyClosedStayVisible() {
        List<Map<String,Object>> list = stores.list(null, null, null);
        assertEquals(5, list.size());
        assertTrue(list.stream().noneMatch(s -> "CLOSED".equals(s.get("status"))));
        assertEquals("TEMPORARILY_CLOSED", list.stream().filter(s -> "m004".equals(s.get("storeId")))
                .findFirst().orElseThrow().get("status"));
        repo.stores.get("m001").status = Domain.StoreStatus.CLOSED;
        assertEquals(4, stores.list(null, null, null).size());
    }

    @Test void keywordStillFiltersVisibleStores() {
        assertEquals(1, stores.list("肯德基", null, null).size());
        assertTrue(stores.list("不存在的店铺", null, null).isEmpty());
    }
}
