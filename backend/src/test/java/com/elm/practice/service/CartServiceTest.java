package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.domain.Domain;
import com.elm.practice.dto.Requests;
import com.elm.practice.mapper.CartLineMapper;
import com.elm.practice.mapper.UserMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlConfig;

import static org.junit.jupiter.api.Assertions.*;

/** 购物车服务测试：合并加购、超库存 40901、改 0 数量 400（场景与原内存测试一致，载体换为 DB+mapper）。 */
@SpringBootTest
@SqlConfig(encoding = "UTF-8")
@Sql(scripts = "/reset.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class CartServiceTest {
    @Autowired CartService carts;
    @Autowired UserMapper userMapper;
    @Autowired CartLineMapper cartLineMapper;

    private Domain.User user() { return userMapper.findById("u001"); }

    private Requests.CartAdd add(String productId, int quantity) {
        Requests.CartAdd r = new Requests.CartAdd();
        r.storeId = "m002"; r.productId = productId; r.quantity = quantity;
        return r;
    }

    @Test void duplicateAddsMergeQuantityIntoOneLine() {
        Domain.User u = user();
        carts.add(u, add("p101", 2));
        Domain.CartLine line = carts.add(u, add("p101", 3));
        assertEquals(5, line.quantity);
        assertEquals(1, carts.list(u, "m002").size());
        assertEquals(1, cartLineMapper.findByUserAndStore("u001", "m002").size());
    }

    @Test void exceedingStockIsRejectedWithConflictCode40901() {
        ApiException ex = assertThrows(ApiException.class, () -> carts.add(user(), add("p101", 21)));
        assertEquals(409, ex.getStatus().value());
        assertEquals(40901, ex.getCode());
    }

    @Test void patchToZeroQuantityIsRejected() {
        Domain.CartLine line = carts.add(user(), add("p101", 1));
        ApiException ex = assertThrows(ApiException.class, () -> carts.patch(user(), line.id, 0));
        assertEquals(400, ex.getStatus().value());
    }
}
