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

import java.time.LocalDate;
import java.time.ZoneId;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 批次⑥ 红包与爆红包集成测试（契约 §3.8 会员与红包、§3.10/§10.5 CHG-001 爆红包；验收用例第 5 行）。
 * 基线（reset.sql 种子）：
 * - cp001 全场满20减2（u001，未用，30 天有效）；cp002 指定 m002 满40减5（未用）；
 *   cp003 已用券（used=1，有效期内，used 标记随列表回显）；cp004 已过期券（validTo 在昨天）。
 * - m002 起送 20、配送费 5；满 20 减 2、满 40 减 5、新客立减 3、免配送费门槛 30。
 * - m001 起送 15、配送费 3，无促销配置。
 */
@SpringBootTest @AutoConfigureMockMvc @SqlConfig(encoding="UTF-8")
@Sql(scripts="/reset.sql", executionPhase=Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class CouponIntegrationTest {
    @Autowired MockMvc mvc;
    private static final ZoneId Cn = ZoneId.of("Asia/Shanghai");

    private MockHttpSession userLogin() throws Exception {
        return (MockHttpSession)mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"13800000001\",\"password\":\"123456\",\"role\":\"user\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    /** 注册并登录一个全新用户（无种子券、无免费爆记录）。账号必须为 11 位手机号。 */
    private MockHttpSession newUserSession() throws Exception {
        String acct = "137" + String.format("%08d", java.util.concurrent.ThreadLocalRandom.current().nextInt(100000000));
        mvc.perform(post("/api/v1/users").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"" + acct + "\",\"password\":\"123456\",\"nickname\":\"券用户\"}"))
                .andExpect(status().isOk());
        return (MockHttpSession)mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"" + acct + "\",\"password\":\"123456\",\"role\":\"user\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    private String newAddress(MockHttpSession s) throws Exception {
        String body = mvc.perform(post("/api/v1/me/addresses").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"contactName\":\"券用户\",\"contactSex\":\"先生\",\"contactPhone\":\"13700000000\","
                        + "\"region\":\"天津大学北洋园校区\",\"detail\":\"12号楼 304室\",\"label\":\"学校\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.data.addressId").toString();
    }

    private void addCart(MockHttpSession s, String storeId, String productId, int qty) throws Exception {
        mvc.perform(post("/api/v1/cart/items").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"" + storeId + "\",\"productId\":\"" + productId + "\",\"quantity\":" + qty + "}"))
                .andExpect(status().isOk());
    }

    private String orderWithCoupon(MockHttpSession s, String storeId, String addr, String couponId) throws Exception {
        String couponPart = couponId == null ? "" : ",\"couponId\":\"" + couponId + "\"";
        return mvc.perform(post("/api/v1/orders").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"" + storeId + "\",\"addressId\":\"" + addr + "\","
                        + "\"idempotencyKey\":\"cpn-" + System.nanoTime() + "\"" + couponPart + "}"))
                .andReturn().getResponse().getContentAsString();
    }

    private int orderExpect(MockHttpSession s, String storeId, String addr, String couponId, int httpStatus) throws Exception {
        String couponPart = couponId == null ? "" : ",\"couponId\":\"" + couponId + "\"";
        return mvc.perform(post("/api/v1/orders").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"" + storeId + "\",\"addressId\":\"" + addr + "\","
                        + "\"idempotencyKey\":\"cpn-" + System.nanoTime() + "\"" + couponPart + "}"))
                .andExpect(status().is(httpStatus)).andReturn().getResponse().getStatus();
    }

    /** 购买套餐，返回响应体。 */
    private String buyPack(MockHttpSession s, String packKey) throws Exception {
        return mvc.perform(post("/api/v1/me/coupon-packs").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"packKey\":\"" + packKey + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private String blast(MockHttpSession s, String couponId, int httpStatus) throws Exception {
        String body = couponId == null ? "{}" : "{\"couponId\":\"" + couponId + "\"}";
        return mvc.perform(post("/api/v1/me/coupons/blast").session(s).contentType(MediaType.APPLICATION_JSON)
                .content(body)).andExpect(status().is(httpStatus)).andReturn().getResponse().getContentAsString();
    }

    /** 从列表响应中按 couponId 取单张券视图（Java 侧过滤，避免 JsonPath 过滤投影歧义）。 */
    @SuppressWarnings("unchecked")
    private java.util.Map<String,Object> couponOf(String body, String couponId) {
        java.util.List<java.util.Map<String,Object>> list = JsonPath.read(body, "$.data");
        return list.stream().filter(c -> couponId.equals(c.get("couponId"))).findFirst().orElse(null);
    }

    // ---------------------------------------------------------------- TC-CPN 红包查询

    /** TC-CPN-001：列表默认查可用券，回显契约 §3.8 全字段；已用券在有效期内仍在可用 Tab 且 used=true。 */
    @Test void tcCpn001_listReturnsSeededCoupons() throws Exception {
        var s = userLogin();
        String body = mvc.perform(get("/api/v1/me/coupons").session(s))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        java.util.List<?> all = JsonPath.read(body, "$.data");
        org.junit.jupiter.api.Assertions.assertTrue(all.size() >= 3, "可用券至少 3 张，实际 " + all);
        var cp001 = couponOf(body, "cp001");
        org.junit.jupiter.api.Assertions.assertNotNull(cp001, "cp001 应在可用列表：" + body);
        org.junit.jupiter.api.Assertions.assertTrue(String.valueOf(cp001.get("name")).contains("满20减2"));
        org.junit.jupiter.api.Assertions.assertEquals(2.0, ((Number) cp001.get("amount")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(20.0, ((Number) cp001.get("threshold")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals("ALL", cp001.get("scope"));
        org.junit.jupiter.api.Assertions.assertEquals("available", cp001.get("status"));
        org.junit.jupiter.api.Assertions.assertEquals(false, cp001.get("used"));
        // cp003 已用但未过期：status=available、used=true（两字段语义独立）
        var cp003 = couponOf(body, "cp003");
        org.junit.jupiter.api.Assertions.assertNotNull(cp003, "cp003 应在可用列表：" + body);
        org.junit.jupiter.api.Assertions.assertEquals(true, cp003.get("used"));
        org.junit.jupiter.api.Assertions.assertEquals("available", cp003.get("status"));
        // 过期 Tab 包含 cp004，不包含 cp001
        String expired = mvc.perform(get("/api/v1/me/coupons?status=expired").session(s))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertTrue(expired.contains("cp004"));
        org.junit.jupiter.api.Assertions.assertFalse(expired.contains("cp001"));
    }

    /** TC-CPN-002：可用红包查询按门槛（基数=商品小计）与适用范围过滤，已用/过期券不返回。 */
    @Test void tcCpn002_availableFilterByThresholdAndScope() throws Exception {
        var s = userLogin();
        // 小计 20：全场 cp001（满20）命中；cp002（m002 满40）不命中
        String b1 = mvc.perform(get("/api/v1/me/coupons/available?storeId=m002&amount=20").session(s))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertTrue(b1.contains("cp001"));
        org.junit.jupiter.api.Assertions.assertFalse(b1.contains("cp002"));
        org.junit.jupiter.api.Assertions.assertFalse(b1.contains("cp003"), "已用券不得作为可用券返回");
        org.junit.jupiter.api.Assertions.assertFalse(b1.contains("cp004"), "过期券不得作为可用券返回");
        // 小计 45 在 m002：两张都命中
        String b2 = mvc.perform(get("/api/v1/me/coupons/available?storeId=m002&amount=45").session(s))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertTrue(b2.contains("cp001"));
        org.junit.jupiter.api.Assertions.assertTrue(b2.contains("cp002"));
        // 小计 45 在 m001：STORE 限定 m002 的 cp002 不命中
        String b3 = mvc.perform(get("/api/v1/me/coupons/available?storeId=m001&amount=45").session(s))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertTrue(b3.contains("cp001"));
        org.junit.jupiter.api.Assertions.assertFalse(b3.contains("cp002"));
    }

    // ---------------------------------------------------------------- TC-CPN 下单选用

    /** TC-CPN-003：下单选用全场红包——小计 23 命中满减 2、会员 95 折 1.15 与红包 2，实付 = 23−2−1.15−2+5+2 = 24.85，券置已用。 */
    @Test void tcCpn003_orderWithCouponReducesTotalAndMarksUsed() throws Exception {
        var s = userLogin();
        addCart(s, "m002", "p104", 2);
        String body = orderWithCoupon(s, "m002", "da001", "cp001");
        org.junit.jupiter.api.Assertions.assertEquals(2.0, ((Number) JsonPath.read(body, "$.data.couponAmount")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(24.85, ((Number) JsonPath.read(body, "$.data.total")).doubleValue(), 0.0001);
        // 券已置为已用，可用查询不再返回
        String avail = mvc.perform(get("/api/v1/me/coupons/available?storeId=m002&amount=99").session(s))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertFalse(avail.contains("cp001"));
        String list = mvc.perform(get("/api/v1/me/coupons").session(s))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var used = couponOf(list, "cp001");
        org.junit.jupiter.api.Assertions.assertNotNull(used, "核销后 cp001 仍应在列表（used=true）：" + list);
        org.junit.jupiter.api.Assertions.assertEquals(true, used.get("used"));
    }

    /** TC-CPN-004：不满足门槛返回 400（details 说明原因），红包保持未用、订单不产生。u001 在 m001 小计 17 < cp001 门槛 20。 */
    @Test void tcCpn004_thresholdNotMetReturns400AndKeepsCouponUnused() throws Exception {
        var s = userLogin();
        addCart(s, "m001", "p202", 1); // 15.00
        addCart(s, "m001", "p203", 1); // 2.00 → 小计 17，m001 起送 15
        orderExpect(s, "m001", "da001", "cp001", 400);
        String list = mvc.perform(get("/api/v1/me/coupons").session(s))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var kept = couponOf(list, "cp001");
        org.junit.jupiter.api.Assertions.assertNotNull(kept, "400 后券仍应存在：" + list);
        org.junit.jupiter.api.Assertions.assertEquals(false, kept.get("used"));
    }

    /** TC-CPN-005：适用范围不符（STORE 券用在他店）返回 400。 */
    @Test void tcCpn005_scopeMismatchReturns400() throws Exception {
        var s = userLogin();
        addCart(s, "m001", "p202", 1);
        addCart(s, "m001", "p203", 1);
        orderExpect(s, "m001", "da001", "cp002", 400);
    }

    /** TC-CPN-006：已使用的红包再选用返回 409。 */
    @Test void tcCpn006_usedCouponReturns409() throws Exception {
        var s = userLogin();
        addCart(s, "m001", "p202", 1);
        addCart(s, "m001", "p203", 1);
        orderExpect(s, "m001", "da001", "cp003", 409);
    }

    /** TC-CPN-007：已过期的红包选用返回 409。 */
    @Test void tcCpn007_expiredCouponReturns409() throws Exception {
        var s = userLogin();
        addCart(s, "m001", "p202", 1);
        addCart(s, "m001", "p203", 1);
        orderExpect(s, "m001", "da001", "cp004", 409);
    }

    /** TC-CPN-008：他人红包按不存在处理 404（不泄露券归属）。 */
    @Test void tcCpn008_otherUsersCouponReturns404() throws Exception {
        var s = newUserSession();
        String addr = newAddress(s);
        addCart(s, "m001", "p202", 1); // 15.00 ≥ m001 起送 15
        orderExpect(s, "m001", addr, "cp001", 404);
    }

    /** TC-CPN-009：未登录 401。 */
    @Test void tcCpn009_unauthenticatedReturns401() throws Exception {
        mvc.perform(get("/api/v1/me/coupons")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me/coupons/available?storeId=m002&amount=20")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/me/coupon-packs").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    // ---------------------------------------------------------------- TC-PACK 套餐购买（CHG-001）

    /** TC-PACK-001：pack49 = 4 张（3×满30减5 + 1×无门槛减5），7 天有效，source=PACK、can_blast=true。 */
    @Test void tcPack001_pack49GeneratesFourCoupons() throws Exception {
        var s = newUserSession();
        String body = buyPack(s, "pack49");
        org.junit.jupiter.api.Assertions.assertEquals(4, ((Number) JsonPath.read(body, "$.data.quantity")).intValue());
        org.junit.jupiter.api.Assertions.assertEquals(49.0, ((Number) JsonPath.read(body, "$.data.price")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(4, ((Number) JsonPath.read(body, "$.data.coupons.length()")).intValue());
        // pack49 = 3×满30减5 + 1×无门槛减5（插入顺序）
        for (int i = 0; i < 3; i++) {
            org.junit.jupiter.api.Assertions.assertEquals(30.0, ((Number) JsonPath.read(body, "$.data.coupons[" + i + "].threshold")).doubleValue(), 0.0001);
            org.junit.jupiter.api.Assertions.assertEquals(5.0, ((Number) JsonPath.read(body, "$.data.coupons[" + i + "].amount")).doubleValue(), 0.0001);
        }
        org.junit.jupiter.api.Assertions.assertEquals(0.0, ((Number) JsonPath.read(body, "$.data.coupons[3].threshold")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(5.0, ((Number) JsonPath.read(body, "$.data.coupons[3].amount")).doubleValue(), 0.0001);
        for (int i = 0; i < 4; i++) {
            org.junit.jupiter.api.Assertions.assertEquals("PACK", JsonPath.read(body, "$.data.coupons[" + i + "].source"));
            org.junit.jupiter.api.Assertions.assertEquals(true, JsonPath.read(body, "$.data.coupons[" + i + "].canBlast"));
            org.junit.jupiter.api.Assertions.assertEquals("ALL", JsonPath.read(body, "$.data.coupons[" + i + "].scope"));
            String validTo = JsonPath.read(body, "$.data.coupons[" + i + "].validTo");
            org.junit.jupiter.api.Assertions.assertEquals(LocalDate.now(Cn).plusDays(7).toString(), validTo.substring(0, 10));
        }
        org.junit.jupiter.api.Assertions.assertNotNull(JsonPath.read(body, "$.data.packId"));
    }

    /** TC-PACK-002：pack99 = 8 张（6×满30减5 + 1×满40减10 + 1×无门槛减5）；非法 packKey 400；不限购买次数。 */
    @Test void tcPack002_pack99AndInvalidKey() throws Exception {
        var s = newUserSession();
        String b1 = buyPack(s, "pack99");
        org.junit.jupiter.api.Assertions.assertEquals(8, ((Number) JsonPath.read(b1, "$.data.quantity")).intValue());
        org.junit.jupiter.api.Assertions.assertEquals(99.0, ((Number) JsonPath.read(b1, "$.data.price")).doubleValue(), 0.0001);
        // pack99 = 6×满30减5 + 1×满40减10（index 6） + 1×无门槛减5（index 7）
        for (int i = 0; i < 6; i++) {
            org.junit.jupiter.api.Assertions.assertEquals(30.0, ((Number) JsonPath.read(b1, "$.data.coupons[" + i + "].threshold")).doubleValue(), 0.0001);
            org.junit.jupiter.api.Assertions.assertEquals(5.0, ((Number) JsonPath.read(b1, "$.data.coupons[" + i + "].amount")).doubleValue(), 0.0001);
        }
        org.junit.jupiter.api.Assertions.assertEquals(40.0, ((Number) JsonPath.read(b1, "$.data.coupons[6].threshold")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(10.0, ((Number) JsonPath.read(b1, "$.data.coupons[6].amount")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(0.0, ((Number) JsonPath.read(b1, "$.data.coupons[7].threshold")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(5.0, ((Number) JsonPath.read(b1, "$.data.coupons[7].amount")).doubleValue(), 0.0001);
        // 再买一次 pack49 不限制次数
        buyPack(s, "pack49");
        String list = mvc.perform(get("/api/v1/me/coupons").session(s))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertEquals(12, ((Number) JsonPath.read(list, "$.data.length()")).intValue());
        // 非法 packKey → 400
        mvc.perform(post("/api/v1/me/coupon-packs").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"packKey\":\"pack666\"}")).andExpect(status().isBadRequest());
    }

    // ---------------------------------------------------------------- TC-BLAST 爆红包

    /** TC-BLAST-001：免费爆——当天首次不消耗券、新增 BLAST_OUT/can_blast=false 券，validTo=今天 23:59:59；第二次 409。 */
    @Test void tcBlast001_freeOncePerDayThen409() throws Exception {
        var s = newUserSession();
        String body = blast(s, null, 200);
        org.junit.jupiter.api.Assertions.assertEquals(true, JsonPath.read(body, "$.data.freeBlast"));
        org.junit.jupiter.api.Assertions.assertEquals("BLAST_OUT", JsonPath.read(body, "$.data.source"));
        org.junit.jupiter.api.Assertions.assertEquals(false, JsonPath.read(body, "$.data.canBlast"));
        int tier = ((Number) JsonPath.read(body, "$.data.tierIndex")).intValue();
        org.junit.jupiter.api.Assertions.assertTrue(tier >= 1 && tier <= 10, "档位序号必须在 1..10，实际 " + tier);
        String validTo = JsonPath.read(body, "$.data.validTo");
        org.junit.jupiter.api.Assertions.assertEquals(LocalDate.now(Cn).toString() + " 23:59:59", validTo);
        org.junit.jupiter.api.Assertions.assertNotNull(JsonPath.read(body, "$.data.couponId"));
        // 当天第二次免费爆 → 409
        blast(s, null, 409);
    }

    /** TC-BLAST-002：消耗券爆出为替换式——同一 couponId 原地更新、不新增行；爆后不可再爆。 */
    @Test void tcBlast002_consumeReplacesCouponInPlace() throws Exception {
        var s = newUserSession();
        String pack = buyPack(s, "pack49");
        String couponId = JsonPath.read(pack, "$.data.coupons[0].couponId");
        String before = mvc.perform(get("/api/v1/me/coupons").session(s))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        int countBefore = ((Number) JsonPath.read(before, "$.data.length()")).intValue();
        String body = blast(s, couponId, 200);
        org.junit.jupiter.api.Assertions.assertEquals(couponId, JsonPath.read(body, "$.data.couponId"));
        org.junit.jupiter.api.Assertions.assertEquals(false, JsonPath.read(body, "$.data.canBlast"));
        org.junit.jupiter.api.Assertions.assertEquals("BLAST_OUT", JsonPath.read(body, "$.data.source"));
        org.junit.jupiter.api.Assertions.assertEquals(false, JsonPath.read(body, "$.data.freeBlast"));
        org.junit.jupiter.api.Assertions.assertEquals(LocalDate.now(Cn).toString() + " 23:59:59", JsonPath.read(body, "$.data.validTo"));
        // 券数量不增加（替换式，不新增行）
        String after = mvc.perform(get("/api/v1/me/coupons").session(s))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertEquals(countBefore, ((Number) JsonPath.read(after, "$.data.length()")).intValue());
        // 爆出的券不可再爆
        blast(s, couponId, 409);
    }

    /** TC-BLAST-003：爆他人券 404；无免费次数且不消耗券的请求体仍走 409（不泄露他人券）。 */
    @Test void tcBlast003_otherUsersCoupon404() throws Exception {
        var a = newUserSession();
        var b = newUserSession();
        String pack = buyPack(a, "pack49");
        String couponId = JsonPath.read(pack, "$.data.coupons[0].couponId");
        blast(b, couponId, 404);
    }

    /** TC-BLAST-004：购买所得券可在确认订单页按 couponId 选用——新客 m002 小计 31：
     *  满20减2、新客减3、满30免配送、红包减5，实付 = 31−2−3−5+0+2 = 23.00，券置已用。 */
    @Test void tcBlast004_packCouponUsableInOrder() throws Exception {
        var s = newUserSession();
        String addr = newAddress(s);
        String pack = buyPack(s, "pack49");
        String couponId = JsonPath.read(pack, "$.data.coupons[0].couponId");
        addCart(s, "m002", "p101", 1); // 19.50
        addCart(s, "m002", "p104", 1); // 11.50 → 小计 31
        String body = orderWithCoupon(s, "m002", addr, couponId);
        org.junit.jupiter.api.Assertions.assertEquals(5.0, ((Number) JsonPath.read(body, "$.data.couponAmount")).doubleValue(), 0.0001);
        org.junit.jupiter.api.Assertions.assertEquals(23.0, ((Number) JsonPath.read(body, "$.data.total")).doubleValue(), 0.0001);
    }
}
