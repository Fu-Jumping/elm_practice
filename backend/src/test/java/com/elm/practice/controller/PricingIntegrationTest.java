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

/**
 * TC-PRV-001~011 集成层：优惠计价七步接入下单（PRD 7.4、契约 §3.5/§6.3）。
 * 基线（reset.sql 种子）：m002 起送 20、配送费 5.00；满 20 减 2、满 40 减 5、新客立减 3、
 * 免配送费门槛 30、会员 95 折；u001 在 m002 已有 3 个演示订单（非新客）。
 * 计价公式（定稿）：实付 = 小计 − 满减 − 新客 − 会员折扣 − 红包 + 配送费 − 配送费优惠 + 打包费(2.00)，不小于 0。
 */
@SpringBootTest @AutoConfigureMockMvc @SqlConfig(encoding="UTF-8")
@Sql(scripts="/reset.sql", executionPhase=Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class PricingIntegrationTest {
    @Autowired MockMvc mvc;

    private MockHttpSession userLogin() throws Exception {
        return (MockHttpSession)mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"13800000001\",\"password\":\"123456\",\"role\":\"user\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    private MockHttpSession merchantLogin(String account) throws Exception {
        return (MockHttpSession)mvc.perform(post("/api/v1/merchant/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"" + account + "\",\"password\":\"123456\",\"role\":\"merchant\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    /** 注册并登录一个全新用户（店铺新客），返回其会话。账号必须为 11 位手机号。 */
    private MockHttpSession newUserSession() throws Exception {
        String acct = "139" + String.format("%08d", java.util.concurrent.ThreadLocalRandom.current().nextInt(100000000));
        mvc.perform(post("/api/v1/users").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"" + acct + "\",\"password\":\"123456\",\"nickname\":\"新客\"}"))
                .andExpect(status().isOk());
        return (MockHttpSession)mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"" + acct + "\",\"password\":\"123456\",\"role\":\"user\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    private String newAddress(MockHttpSession s) throws Exception {
        String body = mvc.perform(post("/api/v1/me/addresses").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"contactName\":\"新客\",\"contactSex\":\"先生\",\"contactPhone\":\"13900000000\","
                        + "\"region\":\"天津大学北洋园校区\",\"detail\":\"12号楼 304室\",\"label\":\"学校\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.data.addressId").toString();
    }

    private void addCart(MockHttpSession s, String productId, int qty) throws Exception {
        mvc.perform(post("/api/v1/cart/items").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m002\",\"productId\":\"" + productId + "\",\"quantity\":" + qty + "}"))
                .andExpect(status().isOk());
    }

    private String createOrder(MockHttpSession s, String addr, String idem, String expected) throws Exception {
        return mvc.perform(post("/api/v1/orders").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m002\",\"addressId\":\"" + addr + "\",\"idempotencyKey\":\"" + idem + "\","
                        + "\"expectedTotal\":" + expected + "}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private String putPromotions(MockHttpSession session, String body, int expectedStatus) throws Exception {
        return mvc.perform(put("/api/v1/merchant/promotions").session(session).contentType(MediaType.APPLICATION_JSON)
                .content(body)).andExpect(status().is(expectedStatus)).andReturn().getResponse().getContentAsString();
    }

    /** TC-PRV-001：小计 23 元命中满 20 减 2；配送费 5 计入实付；u001 非新客但**是会员**（批次⑨ 会员折扣真正生效）。
     *  实付 = 23 − 2(满减) − 1.15(会员 95 折) + 5(配送费) + 2(打包费) = 26.85。 */
    @Test void tcPrv001_fullReductionAndDeliveryFeeSnapshot() throws Exception {
        var s = userLogin();
        addCart(s, "p104", 2);
        String body = createOrder(s, "da001", "prv001-" + System.nanoTime(), "26.85");
        org.junit.jupiter.api.Assertions.assertEquals(26.85, ((Number) JsonPath.read(body, "$.data.total")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(1.15, ((Number) JsonPath.read(body, "$.data.memberDiscountAmount")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(2.0, ((Number) JsonPath.read(body, "$.data.fullReductionAmount")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(5.0, ((Number) JsonPath.read(body, "$.data.deliveryFee")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(0.0, ((Number) JsonPath.read(body, "$.data.newCustomerAmount")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(0.0, ((Number) JsonPath.read(body, "$.data.deliveryFeeDiscount")).doubleValue(), 0.0001);
    }

    /** TC-PRV-002 + 005：小计 48 同时命中满 40 减 5（只取最大档，不叠加）与免配送费门槛 30；
     *  实付 = 48 − 5(满减) − 2.40(会员 95 折) + 0(免配送费) + 2(打包费) = 42.60。 */
    @Test void tcPrv002_maxTierOnlyAndFreeDelivery() throws Exception {
        var s = userLogin();
        addCart(s, "p101", 2);
        addCart(s, "p105", 1);
        String body = createOrder(s, "da001", "prv002-" + System.nanoTime(), "42.60");
        org.junit.jupiter.api.Assertions.assertEquals(42.6, ((Number) JsonPath.read(body, "$.data.total")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(5.0, ((Number) JsonPath.read(body, "$.data.fullReductionAmount")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(5.0, ((Number) JsonPath.read(body, "$.data.deliveryFeeDiscount")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(5.0, ((Number) JsonPath.read(body, "$.data.deliveryFee")).doubleValue(), 0.0001);
    }

    /** TC-PRV-004：店铺新用户首单立减 3，同一用户第二单不再享受。小计 28.5 ≥ 20 同时减 2：
     *  首单实付 = 28.5 − 2 − 3 + 5 + 2 = 30.50；第二单 = 28.5 − 2 + 5 + 2 = 33.50。 */
    @Test void tcPrv004_newCustomerOnlyFirstOrder() throws Exception {
        var s = newUserSession();
        var addr = newAddress(s);
        addCart(s, "p101", 1);
        addCart(s, "p105", 1);
        String first = createOrder(s, addr, "prv004a-" + System.nanoTime(), "30.50");
        org.junit.jupiter.api.Assertions.assertEquals(3.0, ((Number) JsonPath.read(first, "$.data.newCustomerAmount")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(2.0, ((Number) JsonPath.read(first, "$.data.fullReductionAmount")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(30.5, ((Number) JsonPath.read(first, "$.data.total")).doubleValue(), 0.0001);
        // 同一用户第二单：首单已占用新客资格（下单即算，含未支付）。
        addCart(s, "p101", 1);
        addCart(s, "p105", 1);
        String second = createOrder(s, addr, "prv004b-" + System.nanoTime(), "33.50");
        org.junit.jupiter.api.Assertions.assertEquals(0.0, ((Number) JsonPath.read(second, "$.data.newCustomerAmount")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(33.5, ((Number) JsonPath.read(second, "$.data.total")).doubleValue(), 0.0001);
    }

    /** TC-PRV-009：前端篡改 expectedTotal 无效，以后端计算结果为准（场景同 TC-PRV-001，实付 26.85）。 */
    @Test void tcPrv009_tamperedExpectedTotalIgnored() throws Exception {
        var s = userLogin();
        addCart(s, "p104", 2);
        String body = createOrder(s, "da001", "prv009-" + System.nanoTime(), "0.01");
        org.junit.jupiter.api.Assertions.assertEquals(26.85, ((Number) JsonPath.read(body, "$.data.total")).doubleValue(), 0.0001);
    }

    /** TC-PRV-008：保存校验——负门槛、折扣率越界、阶梯重复均 400 且不落库。 */
    @Test void tcPrv008_invalidConfigRejected() throws Exception {
        var m = merchantLogin("merchant-a");
        putPromotions(m, "{\"enabled\":true,\"fullReductions\":[{\"threshold\":-5,\"amount\":2}]}", 400);
        putPromotions(m, "{\"enabled\":true,\"memberDiscountRate\":1.5,\"memberDiscountEnabled\":true}", 400);
        putPromotions(m, "{\"enabled\":true,\"fullReductions\":[{\"threshold\":20,\"amount\":2},{\"threshold\":20,\"amount\":5}]}", 400);
        putPromotions(m, "{\"enabled\":true,\"newCustomerAmount\":-1,\"newCustomerEnabled\":true}", 400);
        // 非法请求后配置保持原状：GET 回显不含刚才的非法值
        String get = mvc.perform(get("/api/v1/merchant/promotions").session(m))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        Object tiers = JsonPath.read(get, "$.data.fullReductions.length()");
        org.junit.jupiter.api.Assertions.assertTrue(
                tiers == null || ((Number) tiers).intValue() == 0 || ((Number) tiers).intValue() == 2,
                "非法保存不得写入新阶梯");
    }

    /** TC-PRV-008 合法路径 + 契约 §6.3 字段映射回显：fullReductions/newCustomerAmount/freeDeliveryThreshold/memberDiscountRate/deliveryFee。 */
    @Test void tcPrv008_validConfigSavedAndEchoed() throws Exception {
        var m = merchantLogin("merchant-a");
        putPromotions(m, "{\"enabled\":true,\"fullReductions\":[{\"threshold\":20,\"amount\":2},{\"threshold\":40,\"amount\":5}],"
                + "\"newCustomerAmount\":3,\"newCustomerEnabled\":true,\"freeDeliveryThreshold\":30,"
                + "\"memberDiscountRate\":0.95,\"memberDiscountEnabled\":true}", 200);
        String get = mvc.perform(get("/api/v1/merchant/promotions").session(m))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertEquals(2, ((Number) JsonPath.read(get, "$.data.fullReductions.length()")).intValue());
        org.junit.jupiter.api.Assertions.assertEquals(20.0, ((Number) JsonPath.read(get, "$.data.fullReductions[0].threshold")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(5.0, ((Number) JsonPath.read(get, "$.data.fullReductions[1].amount")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(3.0, ((Number) JsonPath.read(get, "$.data.newCustomerAmount")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(30.0, ((Number) JsonPath.read(get, "$.data.freeDeliveryThreshold")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(0.95, ((Number) JsonPath.read(get, "$.data.memberDiscountRate")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(5.0, ((Number) JsonPath.read(get, "$.data.deliveryFee")).doubleValue(), 0.0001);
    }

    /** TC-PRV-010：未登录 401；用户身份 403；他店商家读到的是自己店铺配置，不串店。 */
    @Test void tcPrv010_permissionAndIsolation() throws Exception {
        mvc.perform(get("/api/v1/merchant/promotions")).andExpect(status().isUnauthorized());
        var u = userLogin();
        mvc.perform(get("/api/v1/merchant/promotions").session(u)).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/merchant/promotions").session(u).contentType(MediaType.APPLICATION_JSON)
                .content("{\"enabled\":true}")).andExpect(status().isForbidden());
        // 商家 B 注册即建店（CLOSED），读到的是自己店的空配置，不是 merchant-a 的 m002 配置
        String acct = "prvB" + System.nanoTime();
        mvc.perform(post("/api/v1/merchants").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"" + acct + "\",\"password\":\"123456\",\"storeName\":\"B店\","
                        + "\"phone\":\"13911112222\",\"contactPhone\":\"13911112222\"}")).andExpect(status().isOk());
        var b = merchantLogin(acct);
        String get = mvc.perform(get("/api/v1/merchant/promotions").session(b))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        Object tiers = JsonPath.read(get, "$.data.fullReductions.length()");
        org.junit.jupiter.api.Assertions.assertTrue(
                tiers == null || ((Number) tiers).intValue() == 0, "他店商家不得读到 m002 的满减阶梯");
    }

    /** TC-PRV-011：保存配置后计价即时生效——改档前后两笔订单分别按新配置计价。 */
    @Test void tcPrv011_configChangeAffectsPricing() throws Exception {
        var m = merchantLogin("merchant-a");
        putPromotions(m, "{\"enabled\":true,\"fullReductions\":[{\"threshold\":50,\"amount\":10}]}", 200);
        var s = userLogin();
        addCart(s, "p104", 2);
        String before = createOrder(s, "da001", "prv011a-" + System.nanoTime(), "30.00");
        org.junit.jupiter.api.Assertions.assertEquals(30.0, ((Number) JsonPath.read(before, "$.data.total")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(0.0, ((Number) JsonPath.read(before, "$.data.fullReductionAmount")).doubleValue(), 0.0001);
        putPromotions(m, "{\"enabled\":true,\"fullReductions\":[{\"threshold\":20,\"amount\":2},{\"threshold\":40,\"amount\":5}]}", 200);
        var s2 = userLogin();
        addCart(s2, "p104", 2);
        String after = createOrder(s2, "da001", "prv011b-" + System.nanoTime(), "28.00");
        org.junit.jupiter.api.Assertions.assertEquals(2.0, ((Number) JsonPath.read(after, "$.data.fullReductionAmount")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(28.0, ((Number) JsonPath.read(after, "$.data.total")).doubleValue(), 0.0001);
    }
}
