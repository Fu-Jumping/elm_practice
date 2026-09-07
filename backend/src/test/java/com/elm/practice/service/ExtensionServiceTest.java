package com.elm.practice.service;

import com.elm.practice.mapper.MerchantMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlConfig;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/** 商家概览测试：营收口径只算已支付订单（o1001 PROCESSING 31.00 + o1002 COMPLETED 21.00，o1003 待支付不计）。 */
@SpringBootTest
@SqlConfig(encoding = "UTF-8")
@Sql(scripts = "/reset.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class ExtensionServiceTest {
    @Autowired ExtensionService extension;
    @Autowired MerchantMapper merchantMapper;

    @Test void overviewExcludesUnpaidOrders() {
        Map<String,Object> view = extension.overview(merchantMapper.findById("ma001"));
        assertEquals(2L, ((Number) view.get("orderCount")).longValue());
        assertEquals(0, new BigDecimal("52.00").compareTo((BigDecimal) view.get("salesAmount")));
    }
}
