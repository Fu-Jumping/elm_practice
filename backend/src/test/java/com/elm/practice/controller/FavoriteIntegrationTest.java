package com.elm.practice.controller;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Assertions;
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

/**
 * TC-FAV 集成层：契约 §3.7 商家收藏（TODO-BE-008 收藏部分）。
 * 基线（reset.sql 种子）：u001 已收藏 m002（f001，2026-09-10）与 m001（f002，2026-09-09）；
 * m002 有促销配置（满20减2/满40减5/新客立减3/满30免配送费）→ couponTags 非空；m003 无配置 → 空数组。
 */
@SpringBootTest @AutoConfigureMockMvc @SqlConfig(encoding="UTF-8")
@Sql(scripts="/reset.sql", executionPhase=Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class FavoriteIntegrationTest {
    @Autowired MockMvc mvc;

    private MockHttpSession userLogin() throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"13800000001\",\"password\":\"123456\",\"role\":\"user\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    private MockHttpSession merchantLogin() throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/v1/merchant/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"merchant-a\",\"password\":\"123456\",\"role\":\"merchant\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    private String list(MockHttpSession s) throws Exception {
        return mvc.perform(get("/api/v1/me/favorites").session(s))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    /** TC-FAV-001：列表按收藏时间倒序，且含契约 §3.7 全部展示字段（含配送时长/距离/促销标签）。 */
    @Test void tcFav001_listDescendingWithAllFields() throws Exception {
        var s = userLogin();
        String body = list(s);
        Assertions.assertEquals(2, ((Number) JsonPath.read(body, "$.data.length()")).intValue());
        Assertions.assertEquals("fv001", JsonPath.read(body, "$.data[0].favoriteId"));
        Assertions.assertEquals("m002", JsonPath.read(body, "$.data[0].storeId"));
        Assertions.assertEquals("fv002", JsonPath.read(body, "$.data[1].favoriteId"));
        Assertions.assertEquals("肯德基宅急送", JsonPath.read(body, "$.data[0].storeName"));
        Assertions.assertEquals("/demo-images/store-m002.jpg", JsonPath.read(body, "$.data[0].image"));
        Assertions.assertEquals(4.8, ((Number) JsonPath.read(body, "$.data[0].rating")).doubleValue(), 0.001);
        Assertions.assertEquals(3500, ((Number) JsonPath.read(body, "$.data[0].monthlySales")).intValue());
        Assertions.assertEquals(5.0, ((Number) JsonPath.read(body, "$.data[0].deliveryFee")).doubleValue(), 0.001);
        Assertions.assertEquals("OPEN", JsonPath.read(body, "$.data[0].storeStatus"));
        Assertions.assertEquals(25, ((Number) JsonPath.read(body, "$.data[0].deliveryMinutes")).intValue());
        Assertions.assertEquals("2.4km", JsonPath.read(body, "$.data[0].distanceText"));
        Assertions.assertTrue(((java.util.List<?>) JsonPath.read(body, "$.data[0].couponTags")).contains("满20减2"),
                "m002 配置了满20减2，couponTags 必须来自真实促销配置：" + body);
    }

    /** TC-FAV-002：收藏成功返回完整对象；重复收藏幂等返回同一条，不产生重复记录。 */
    @Test void tcFav002_createAndIdempotentRepeat() throws Exception {
        var s = userLogin();
        String first = mvc.perform(post("/api/v1/me/favorites").session(s).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"storeId\":\"m003\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.storeName").value("麦当劳"))
                .andExpect(jsonPath("$.data.storeStatus").value("OPEN"))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(first, "$.data.favoriteId");
        Assertions.assertNotNull(id);
        Assertions.assertTrue(((java.util.List<?>) JsonPath.read(first, "$.data.couponTags")).isEmpty(),
                "m003 无促销配置，couponTags 必须为空数组，不得补演示值");

        String again = mvc.perform(post("/api/v1/me/favorites").session(s).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"storeId\":\"m003\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        Assertions.assertEquals(id, JsonPath.read(again, "$.data.favoriteId"));
        Assertions.assertEquals(3, ((Number) JsonPath.read(list(s), "$.data.length()")).intValue());
    }

    /** TC-FAV-003：取消收藏；取消未被收藏的商店按幂等 200 返回空对象；storeId 本身不存在 404。 */
    @Test void tcFav003_deleteIdempotentAndUnknownStore() throws Exception {
        var s = userLogin();
        mvc.perform(delete("/api/v1/me/favorites/m003").session(s))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
        // 幂等：再删一次仍 200 空对象
        mvc.perform(delete("/api/v1/me/favorites/m003").session(s))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
        // storeId 本身不存在 → 404
        mvc.perform(delete("/api/v1/me/favorites/m999").session(s)).andExpect(status().isNotFound());

        mvc.perform(delete("/api/v1/me/favorites/m002").session(s)).andExpect(status().isOk());
        String remaining = list(s);
        Assertions.assertEquals(1, ((Number) JsonPath.read(remaining, "$.data.length()")).intValue());
        Assertions.assertEquals("m001", JsonPath.read(remaining, "$.data[0].storeId"));
    }

    /** TC-FAV-004：storeId 不存在 404、缺 storeId 400。 */
    @Test void tcFav004_createValidation() throws Exception {
        var s = userLogin();
        mvc.perform(post("/api/v1/me/favorites").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m999\"}")).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/me/favorites").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().isBadRequest());
    }

    /** TC-FAV-005：未登录 401；商家会话 403；只能读写本人收藏。 */
    @Test void tcFav005_permissionAndIsolation() throws Exception {
        mvc.perform(get("/api/v1/me/favorites")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/me/favorites").contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m003\"}")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/v1/me/favorites/m003")).andExpect(status().isUnauthorized());
        var m = merchantLogin();
        mvc.perform(get("/api/v1/me/favorites").session(m)).andExpect(status().isForbidden());

        // 新用户看不到 u001 的收藏
        String acct = "139" + String.format("%08d", java.util.concurrent.ThreadLocalRandom.current().nextInt(100000000));
        mvc.perform(post("/api/v1/users").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"" + acct + "\",\"password\":\"123456\",\"nickname\":\"收藏测试\"}"))
                .andExpect(status().isOk());
        var other = (MockHttpSession) mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"account\":\"" + acct + "\",\"password\":\"123456\",\"role\":\"user\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
        Assertions.assertEquals(0, ((Number) JsonPath.read(list(other), "$.data.length()")).intValue());
    }

    /** TC-FAV-006：商家关闭后收藏项保留并回显最新 storeStatus。 */
    @Test void tcFav006_closedStoreKeptWithLatestStatus() throws Exception {
        var m = merchantLogin();
        mvc.perform(patch("/api/v1/merchant/store/status").session(m).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CLOSED\"}")).andExpect(status().isOk());
        String body = list(userLogin());
        Assertions.assertEquals(2, ((Number) JsonPath.read(body, "$.data.length()")).intValue());
        Assertions.assertEquals("m002", JsonPath.read(body, "$.data[0].storeId"));
        Assertions.assertEquals("CLOSED", JsonPath.read(body, "$.data[0].storeStatus"));
    }
}
