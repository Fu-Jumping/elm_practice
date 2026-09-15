package com.elm.practice.controller;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlConfig;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** 批次⑥ 商家收藏（契约 §3.7）集成测试。 */
@SpringBootTest @AutoConfigureMockMvc @SqlConfig(encoding="UTF-8")
@Sql(scripts="/reset.sql", executionPhase=Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class FavoriteIntegrationTest {
    @Autowired MockMvc mvc;

    private MockHttpSession userLogin() throws Exception {
        return (MockHttpSession)mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"13800000001\",\"password\":\"123456\",\"role\":\"user\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    private MockHttpSession newUserSession() throws Exception {
        String acct = "136" + String.format("%08d", java.util.concurrent.ThreadLocalRandom.current().nextInt(100000000));
        mvc.perform(post("/api/v1/users").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"" + acct + "\",\"password\":\"123456\",\"nickname\":\"藏友\"}"))
                .andExpect(status().isOk());
        return (MockHttpSession)mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"" + acct + "\",\"password\":\"123456\",\"role\":\"user\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    private String addFavorite(MockHttpSession s, String storeId) throws Exception {
        return mvc.perform(post("/api/v1/me/favorites").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"" + storeId + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    @Test void tcFav001_addAndListReturnsStoreCardFields() throws Exception {
        var s = userLogin();
        String body = addFavorite(s, "m002");
        String favoriteId = JsonPath.read(body, "$.data.favoriteId");
        org.junit.jupiter.api.Assertions.assertNotNull(favoriteId);
        org.junit.jupiter.api.Assertions.assertEquals("m002", JsonPath.read(body, "$.data.storeId"));
        org.junit.jupiter.api.Assertions.assertEquals("肯德基宅急送", JsonPath.read(body, "$.data.storeName"));
        org.junit.jupiter.api.Assertions.assertEquals("OPEN", JsonPath.read(body, "$.data.storeStatus"));
        org.junit.jupiter.api.Assertions.assertEquals(5.0, ((Number) JsonPath.read(body, "$.data.deliveryFee")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(25, ((Number) JsonPath.read(body, "$.data.deliveryMinutes")).intValue());
        org.junit.jupiter.api.Assertions.assertNotNull(JsonPath.read(body, "$.data.createdAt"));
        // m002 启用满减两档，促销标签按门槛升序
        java.util.List<String> tags = JsonPath.read(body, "$.data.couponTags");
        org.junit.jupiter.api.Assertions.assertTrue(tags.contains("满20减2"), "应含满20减2标签：" + tags);
        org.junit.jupiter.api.Assertions.assertTrue(tags.contains("满40减5"), "应含满40减5标签：" + tags);

        String list = mvc.perform(get("/api/v1/me/favorites").session(s))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].storeId").value("m002"))
                .andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertTrue(list.contains("肯德基宅急送"));
    }

    @Test void tcFav002_duplicateFavoriteIsIdempotent() throws Exception {
        var s = userLogin();
        String first = addFavorite(s, "m002");
        String firstId = JsonPath.read(first, "$.data.favoriteId");
        String second = addFavorite(s, "m002");
        String secondId = JsonPath.read(second, "$.data.favoriteId");
        org.junit.jupiter.api.Assertions.assertEquals(firstId, secondId, "重复收藏必须返回同一条收藏");
        mvc.perform(get("/api/v1/me/favorites").session(s))
                .andExpect(jsonPath("$.data.length()").value(1));
    }

    @Test void tcFav003_cancelFavoriteAndCancelAgainIsIdempotent() throws Exception {
        var s = userLogin();
        addFavorite(s, "m002");
        mvc.perform(delete("/api/v1/me/favorites/m002").session(s))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/me/favorites").session(s))
                .andExpect(jsonPath("$.data.length()").value(0));
        // 取消未被收藏的店：幂等 200，不报错
        mvc.perform(delete("/api/v1/me/favorites/m002").session(s))
                .andExpect(status().isOk());
    }

    @Test void tcFav004_unknownStoreReturns404OnAddAndCancel() throws Exception {
        var s = userLogin();
        mvc.perform(post("/api/v1/me/favorites").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m999\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/me/favorites/m999").session(s))
                .andExpect(status().isNotFound());
    }

    @Test void tcFav005_blankStoreIdReturns400() throws Exception {
        var s = userLogin();
        mvc.perform(post("/api/v1/me/favorites").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"  \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test void tcFav006_favoritesAreIsolatedBetweenUsers() throws Exception {
        var a = userLogin();
        addFavorite(a, "m002");
        var b = newUserSession();
        mvc.perform(get("/api/v1/me/favorites").session(b))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
        // B 取消 A 的收藏不影响 A 的数据（未被 B 收藏 → 幂等 200，但 A 仍在）
        mvc.perform(delete("/api/v1/me/favorites/m002").session(b)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/me/favorites").session(a))
                .andExpect(jsonPath("$.data.length()").value(1));
    }

    @Test void tcFav007_listOrderedByCreatedAtDescAndKeepsClosedStore() throws Exception {
        var s = userLogin();
        addFavorite(s, "m002");
        Thread.sleep(1100); // 保证 created_at 秒级时间戳可区分
        addFavorite(s, "m001");
        mvc.perform(get("/api/v1/me/favorites").session(s))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].storeId").value("m001"))
                .andExpect(jsonPath("$.data[1].storeId").value("m002"));
        // 暂停营业的店铺可收藏且回显最新状态
        String body = addFavorite(s, "m004");
        org.junit.jupiter.api.Assertions.assertEquals("TEMPORARILY_CLOSED", JsonPath.read(body, "$.data.storeStatus"));
    }

    @Test void tcFav008_anonymousGets401() throws Exception {
        mvc.perform(get("/api/v1/me/favorites")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/me/favorites").contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m002\"}")).andExpect(status().isUnauthorized());
    }
}
