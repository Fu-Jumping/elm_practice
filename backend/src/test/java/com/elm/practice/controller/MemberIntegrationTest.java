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

/** 批次⑥ 会员标识与会员价（契约 §3.8）集成测试。 */
@SpringBootTest @AutoConfigureMockMvc @SqlConfig(encoding="UTF-8")
@Sql(scripts="/reset.sql", executionPhase=Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class MemberIntegrationTest {
    @Autowired MockMvc mvc;

    private MockHttpSession login(String account) throws Exception {
        return (MockHttpSession)mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"" + account + "\",\"password\":\"123456\",\"role\":\"user\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    private String newAddress(MockHttpSession s) throws Exception {
        String body = mvc.perform(post("/api/v1/me/addresses").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"contactName\":\"会员用户\",\"contactSex\":\"先生\",\"contactPhone\":\"13800000003\","
                        + "\"region\":\"天津大学北洋园校区\",\"detail\":\"12号楼 305室\",\"label\":\"学校\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.data.addressId").toString();
    }

    @Test void tcMbr001_nonMemberView() throws Exception {
        var s = login("13800000001"); // u001 非会员
        mvc.perform(get("/api/v1/me/member").session(s))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.memberOpened").value(false))
                .andExpect(jsonPath("$.data.discountRate").value(0.95));
        String body = mvc.perform(get("/api/v1/me/member").session(s)).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertTrue(
                body.contains("\"activatedAt\":null") || !body.contains("activatedAt"),
                "非会员 activatedAt 应为空：" + body);
    }

    @Test void tcMbr002_memberView() throws Exception {
        var s = login("13800000003"); // u002 会员
        String body = mvc.perform(get("/api/v1/me/member").session(s))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.memberOpened").value(true))
                .andExpect(jsonPath("$.data.discountRate").value(0.95))
                .andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertNotNull(JsonPath.read(body, "$.data.activatedAt"));
    }

    @Test void tcMbr003_memberOrderEnjoysDiscount() throws Exception {
        var s = login("13800000003"); // u002 会员，m002 首单（同时享新客立减）
        String addr = newAddress(s);
        mvc.perform(post("/api/v1/cart/items").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m002\",\"productId\":\"p104\",\"quantity\":2}"))
                .andExpect(status().isOk());
        String body = mvc.perform(post("/api/v1/orders").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m002\",\"addressId\":\"" + addr + "\",\"idempotencyKey\":\"mbr-order-1\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        // 小计 23.00；会员折扣 = 23 × (1-0.95) = 1.15；满减 2；新客 3；配送 5（<30 不免）；打包 2
        org.junit.jupiter.api.Assertions.assertEquals(1.15,
                ((Number) JsonPath.read(body, "$.data.memberDiscountAmount")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(3.0,
                ((Number) JsonPath.read(body, "$.data.newCustomerAmount")).doubleValue(), 0.0001);
        // 23 - 2 - 3 - 1.15 + 5 + 2 = 23.85
        org.junit.jupiter.api.Assertions.assertEquals(23.85,
                ((Number) JsonPath.read(body, "$.data.total")).doubleValue(), 0.0001);
    }

    @Test void tcMbr004_nonMemberOrderHasNoDiscount() throws Exception {
        var s = login("13800000001"); // u001 非会员
        mvc.perform(post("/api/v1/cart/items").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m002\",\"productId\":\"p104\",\"quantity\":2}"))
                .andExpect(status().isOk());
        String body = mvc.perform(post("/api/v1/orders").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m002\",\"addressId\":\"da001\",\"idempotencyKey\":\"mbr-order-2\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertEquals(0.0,
                ((Number) JsonPath.read(body, "$.data.memberDiscountAmount")).doubleValue(), 0.0001);
        // 23 - 2 满减 + 5 配送 + 2 打包 = 28（u001 非新客）
        org.junit.jupiter.api.Assertions.assertEquals(28.0,
                ((Number) JsonPath.read(body, "$.data.total")).doubleValue(), 0.0001);
    }

    @Test void tcMbr005_memberPriceEchoedOnProducts() throws Exception {
        var s = login("13800000001");
        String m002 = mvc.perform(get("/api/v1/stores/m002/products").session(s))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        java.util.List<?> m002Products = JsonPath.read(m002, "$.data");
        Object p101 = m002Products.stream()
                .filter(p -> "p101".equals(((java.util.Map<?,?>) p).get("productId"))).findFirst().orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(18.50,
                ((Number) ((java.util.Map<?,?>) p101).get("memberPrice")).doubleValue(), 0.0001);
        // 非会员店商品 memberPrice 为 null
        String m001 = mvc.perform(get("/api/v1/stores/m001/products").session(s))
                .andReturn().getResponse().getContentAsString();
        java.util.List<?> m001Products = JsonPath.read(m001, "$.data");
        Object p201 = m001Products.stream()
                .filter(p -> "p201".equals(((java.util.Map<?,?>) p).get("productId"))).findFirst().orElseThrow();
        org.junit.jupiter.api.Assertions.assertNull(((java.util.Map<?,?>) p201).get("memberPrice"));
    }

    @Test void tcMbr006_anonymousGets401() throws Exception {
        mvc.perform(get("/api/v1/me/member")).andExpect(status().isUnauthorized());
    }
}
