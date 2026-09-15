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
 * TC-MBR 集成层：契约 §3.8 会员标识与会员价 + PRD 7.4 计价第 ⑤ 步（TODO-BE-008 会员部分）。
 * 种子（reset.sql）：u001 为会员（member_opened=TRUE）；p102 配置 member_price=17.50，p104 未配置；
 * m002 促销配置含会员 95 折。口径：配置了会员价的商品按会员价计价且不再叠加会员折扣，未配置的才应用会员折扣。
 */
@SpringBootTest @AutoConfigureMockMvc @SqlConfig(encoding="UTF-8")
@Sql(scripts="/reset.sql", executionPhase=Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class MemberIntegrationTest {
    @Autowired MockMvc mvc;

    private MockHttpSession userLogin() throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"13800000001\",\"password\":\"123456\",\"role\":\"user\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    private MockHttpSession newUserSession() throws Exception {
        String acct = "139" + String.format("%08d", java.util.concurrent.ThreadLocalRandom.current().nextInt(100000000));
        mvc.perform(post("/api/v1/users").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"" + acct + "\",\"password\":\"123456\",\"nickname\":\"会员测试\"}"))
                .andExpect(status().isOk());
        return (MockHttpSession) mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"account\":\"" + acct + "\",\"password\":\"123456\",\"role\":\"user\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    private MockHttpSession merchantLogin() throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/v1/merchant/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"merchant-a\",\"password\":\"123456\",\"role\":\"merchant\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    private void addCart(MockHttpSession s, String productId, int qty) throws Exception {
        mvc.perform(post("/api/v1/cart/items").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m002\",\"productId\":\"" + productId + "\",\"quantity\":" + qty + "}"))
                .andExpect(status().isOk());
    }

    private String createOrder(MockHttpSession s, String addressId) throws Exception {
        return mvc.perform(post("/api/v1/orders").session(s).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"storeId\":\"m002\",\"addressId\":\"" + addressId + "\",\"idempotencyKey\":\"mbr-"
                                + System.nanoTime() + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private String newAddress(MockHttpSession s) throws Exception {
        String body = mvc.perform(post("/api/v1/me/addresses").session(s).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contactName\":\"会员\",\"contactSex\":\"先生\",\"contactPhone\":\"13900000000\","
                                + "\"region\":\"天津大学北洋园校区\",\"detail\":\"8号楼 101室\",\"label\":\"学校\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.data.addressId").toString();
    }

    /** TC-MBR-001：会员标识、折扣率、权益说明与开通时间；未登录 401、商家 403。 */
    @Test void tcMbr001_memberInfo() throws Exception {
        mvc.perform(get("/api/v1/me/member")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me/member").session(merchantLogin())).andExpect(status().isForbidden());

        String body = mvc.perform(get("/api/v1/me/member").session(userLogin()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        Assertions.assertTrue((Boolean) JsonPath.read(body, "$.data.memberOpened"));
        Assertions.assertEquals(0.95, ((Number) JsonPath.read(body, "$.data.discountRate")).doubleValue(), 0.0001);
        Assertions.assertFalse(((String) JsonPath.read(body, "$.data.discountDesc")).isBlank());
        Assertions.assertNotNull(JsonPath.read(body, "$.data.activatedAt"));
    }

    /** TC-MBR-002：非会员返回 memberOpened=false 且无开通时间；本契约不提供开通/续费接口。 */
    @Test void tcMbr002_nonMemberInfo() throws Exception {
        var s = newUserSession();
        String body = mvc.perform(get("/api/v1/me/member").session(s))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        Assertions.assertFalse((Boolean) JsonPath.read(body, "$.data.memberOpened"));
        Assertions.assertNull(JsonPath.read(body, "$.data.activatedAt"));
        mvc.perform(post("/api/v1/me/member").session(s)).andExpect(status().isMethodNotAllowed());
    }

    /** TC-MBR-003：商品对象返回 memberPrice（非会员仍返回），未配置时为 null。 */
    @Test void tcMbr003_productExposesMemberPrice() throws Exception {
        String body = mvc.perform(get("/api/v1/stores/m002/products").session(newUserSession()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        java.util.List<java.util.Map<String, Object>> products = JsonPath.read(body, "$.data");
        java.util.Map<String, Object> p102 = products.stream()
                .filter(p -> "p102".equals(p.get("productId"))).findFirst().orElseThrow();
        java.util.Map<String, Object> p104 = products.stream()
                .filter(p -> "p104".equals(p.get("productId"))).findFirst().orElseThrow();
        Assertions.assertEquals(17.5, ((Number) p102.get("memberPrice")).doubleValue(), 0.0001);
        Assertions.assertNull(p104.get("memberPrice"));
    }

    /** TC-MBR-004：配置了会员价的商品按会员价计价，且不再叠加会员折扣。 */
    @Test void tcMbr004_memberPriceItemNotDiscountedAgain() throws Exception {
        var s = userLogin();
        addCart(s, "p102", 2);
        String body = createOrder(s, "da001");
        Assertions.assertEquals(35.0, ((Number) JsonPath.read(body, "$.data.itemSubtotal")).doubleValue(), 0.0001);
        Assertions.assertEquals(0.0, ((Number) JsonPath.read(body, "$.data.memberDiscountAmount")).doubleValue(), 0.0001);
    }

    /** TC-MBR-005：未配置会员价的商品对会员应用店铺会员折扣（m002 95 折）。 */
    @Test void tcMbr005_memberDiscountOnPlainItem() throws Exception {
        var s = userLogin();
        addCart(s, "p104", 2);
        String body = createOrder(s, "da001");
        Assertions.assertEquals(23.0, ((Number) JsonPath.read(body, "$.data.itemSubtotal")).doubleValue(), 0.0001);
        Assertions.assertEquals(1.15, ((Number) JsonPath.read(body, "$.data.memberDiscountAmount")).doubleValue(), 0.0001);
    }

    /** TC-MBR-006：非会员既不按会员价计价，也不享受会员折扣。 */
    @Test void tcMbr006_nonMemberPaysListPrice() throws Exception {
        var s = newUserSession();
        var addr = newAddress(s);
        addCart(s, "p102", 2);
        String body = createOrder(s, addr);
        Assertions.assertEquals(39.0, ((Number) JsonPath.read(body, "$.data.itemSubtotal")).doubleValue(), 0.0001);
        Assertions.assertEquals(0.0, ((Number) JsonPath.read(body, "$.data.memberDiscountAmount")).doubleValue(), 0.0001);

        addCart(s, "p104", 2);
        String body2 = createOrder(s, addr);
        Assertions.assertEquals(23.0, ((Number) JsonPath.read(body2, "$.data.itemSubtotal")).doubleValue(), 0.0001);
        Assertions.assertEquals(0.0, ((Number) JsonPath.read(body2, "$.data.memberDiscountAmount")).doubleValue(), 0.0001);
    }
}
