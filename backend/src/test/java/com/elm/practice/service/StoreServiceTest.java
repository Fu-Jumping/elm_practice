package com.elm.practice.service;

import com.elm.practice.domain.Domain;
import com.elm.practice.mapper.StoreMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlConfig;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/** 店铺服务测试：CLOSED 隐藏、TEMPORARILY_CLOSED 可见、关键词过滤（断言载体由内存 Map 换为 StoreMapper）。 */
@SpringBootTest
@SqlConfig(encoding = "UTF-8")
@Sql(scripts = "/reset.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class StoreServiceTest {
    @Autowired StoreService stores;
    @Autowired StoreMapper storeMapper;

    @Test void closedStoresAreHiddenWhileTemporarilyClosedStayVisible() {
        List<Map<String,Object>> list = stores.list(null, null, null);
        assertEquals(5, list.size());
        assertTrue(list.stream().noneMatch(s -> "CLOSED".equals(s.get("status"))));
        assertEquals("TEMPORARILY_CLOSED", list.stream().filter(s -> "m004".equals(s.get("storeId")))
                .findFirst().orElseThrow().get("status"));
        // 原 repo.stores.get("m001").status = CLOSED 改为经 mapper 落库后再查。
        Domain.Store m001 = storeMapper.findById("m001");
        m001.status = Domain.StoreStatus.CLOSED;
        storeMapper.updateFull(m001);
        assertEquals(4, stores.list(null, null, null).size());
    }

    @Test void keywordStillFiltersVisibleStores() {
        assertEquals(1, stores.list("肯德基", null, null).size());
        assertTrue(stores.list("不存在的店铺", null, null).isEmpty());
    }
}
