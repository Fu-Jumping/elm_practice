package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.domain.Domain;
import com.elm.practice.dto.Requests;
import com.elm.practice.repository.InMemoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CartServiceTest {
    private InMemoryRepository repo;
    private CartService carts;
    private Domain.User user;

    @BeforeEach void setUp() {
        repo = new InMemoryRepository(); repo.seed();
        carts = new CartService(repo, new StoreService(repo));
        user = repo.users.get("u001");
    }

    private Requests.CartAdd add(String productId, int quantity) {
        Requests.CartAdd r = new Requests.CartAdd();
        r.storeId = "m002"; r.productId = productId; r.quantity = quantity;
        return r;
    }

    @Test void duplicateAddsMergeQuantityIntoOneLine() {
        carts.add(user, add("p101", 2));
        Domain.CartLine line = carts.add(user, add("p101", 3));
        assertEquals(5, line.quantity);
        assertEquals(1, carts.list(user, "m002").size());
    }

    @Test void exceedingStockIsRejectedWithConflictCode40901() {
        ApiException ex = assertThrows(ApiException.class, () -> carts.add(user, add("p101", 21)));
        assertEquals(409, ex.getStatus().value());
        assertEquals(40901, ex.getCode());
    }

    @Test void patchToZeroQuantityIsRejected() {
        Domain.CartLine line = carts.add(user, add("p101", 1));
        ApiException ex = assertThrows(ApiException.class, () -> carts.patch(user, line.id, 0));
        assertEquals(400, ex.getStatus().value());
    }
}
