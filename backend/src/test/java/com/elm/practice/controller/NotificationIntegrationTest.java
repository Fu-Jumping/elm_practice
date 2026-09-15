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
 * TC-NTF 集成层：契约 §3.9 通知（TODO-BE-006 通知部分）。
 * 种子（reset.sql）：u001 有 n001（MEMBER、未读、2 小时前）与 n002（ORDER、已读、3 小时前，relatedId=o1002）。
 * 触发时机：订单状态更新（支付成功进 PENDING / 接单 / 出餐配送 / 完成 / 用户取消）写 ORDER；
 * 红包到账写 COUPON（relatedId=红包编号）；会员权益提醒写 MEMBER。
 */
@SpringBootTest @AutoConfigureMockMvc @SqlConfig(encoding="UTF-8")
@Sql(scripts="/reset.sql", executionPhase=Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class NotificationIntegrationTest {
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
        return mvc.perform(get("/api/v1/me/notifications").session(s))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private int unread(MockHttpSession s) throws Exception {
        String body = mvc.perform(get("/api/v1/me/notifications/unread-count").session(s))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.data")).intValue();
    }

    /** 返回某类通知条数（用于触发时机断言）。 */
    private long count(MockHttpSession s, String type) throws Exception {
        return ((java.util.List<?>) JsonPath.read(list(s), "$.data[?(@.type=='" + type + "')]")).size();
    }

    /** TC-NTF-001：列表按时间倒序，字段齐备且只返回当前用户通知。 */
    @Test void tcNtf001_listDescendingAndOwnOnly() throws Exception {
        var s = userLogin();
        String body = list(s);
        Assertions.assertEquals(2, ((Number) JsonPath.read(body, "$.data.length()")).intValue());
        Assertions.assertEquals("n001", JsonPath.read(body, "$.data[0].notificationId"));
        Assertions.assertEquals("MEMBER", JsonPath.read(body, "$.data[0].type"));
        Assertions.assertFalse((Boolean) JsonPath.read(body, "$.data[0].read"));
        Assertions.assertNotNull(JsonPath.read(body, "$.data[0].title"));
        Assertions.assertNotNull(JsonPath.read(body, "$.data[0].content"));
        Assertions.assertNotNull(JsonPath.read(body, "$.data[0].createdAt"));
        Assertions.assertEquals("o1002", JsonPath.read(body, "$.data[1].relatedId"));

        // 新用户看不到 u001 的通知
        String acct = "139" + String.format("%08d", java.util.concurrent.ThreadLocalRandom.current().nextInt(100000000));
        mvc.perform(post("/api/v1/users").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"" + acct + "\",\"password\":\"123456\",\"nickname\":\"通知测试\"}"))
                .andExpect(status().isOk());
        var other = (MockHttpSession) mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"account\":\"" + acct + "\",\"password\":\"123456\",\"role\":\"user\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
        Assertions.assertEquals(0, ((Number) JsonPath.read(list(other), "$.data.length()")).intValue());
    }

    /** TC-NTF-002：未读数；标记单条已读幂等；全部已读后未读数归零。 */
    @Test void tcNtf002_unreadCountAndMarkReadIdempotent() throws Exception {
        var s = userLogin();
        Assertions.assertEquals(1, unread(s));
        mvc.perform(patch("/api/v1/me/notifications/n001/read").session(s))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
        mvc.perform(patch("/api/v1/me/notifications/n001/read").session(s)).andExpect(status().isOk());
        Assertions.assertEquals(0, unread(s));

        mvc.perform(patch("/api/v1/me/notifications/read").session(s))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
        Assertions.assertEquals(0, unread(s));
    }

    /** TC-NTF-003：不存在的通知 404；未登录 401；商家会话 403。 */
    @Test void tcNtf003_notFoundAndPermissions() throws Exception {
        var s = userLogin();
        mvc.perform(patch("/api/v1/me/notifications/n999/read").session(s)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/me/notifications")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/v1/me/notifications/read")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me/notifications/unread-count")).andExpect(status().isUnauthorized());
        var m = merchantLogin();
        mvc.perform(get("/api/v1/me/notifications").session(m)).andExpect(status().isForbidden());
    }

    /** TC-NTF-004：支付成功进入 PENDING 写 ORDER 通知，relatedId 为订单号。 */
    @Test void tcNtf004_paymentWritesOrderNotification() throws Exception {
        var s = userLogin();
        long before = count(s, "ORDER");
        mvc.perform(post("/api/v1/orders/o1003/payment").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"success\":true}")).andExpect(status().isOk());
        String body = list(s);
        Assertions.assertEquals(before + 1, ((java.util.List<?>) JsonPath.read(body, "$.data[?(@.type=='ORDER')]")).size());
        var related = ((java.util.List<?>) JsonPath.read(body, "$.data[?(@.type=='ORDER' && @.relatedId=='o1003')]"));
        Assertions.assertEquals(1, related.size(), "支付成功必须写 relatedId=o1003 的 ORDER 通知：" + body);
    }

    /** TC-NTF-005：商家接单 / 出餐配送 / 完成各写一条 ORDER 通知。 */
    @Test void tcNtf005_merchantAdvanceWritesOrderNotifications() throws Exception {
        var m = merchantLogin();
        for (String next : new String[]{"COOKING", "DELIVERING", "COMPLETED"}) {
            mvc.perform(patch("/api/v1/merchant/orders/o1001/status").session(m).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"status\":\"" + next + "\"}")).andExpect(status().isOk());
        }
        String body = list(userLogin());
        Assertions.assertEquals(3, ((Number) JsonPath.read(body, "$.data[?(@.type=='ORDER' && @.relatedId=='o1001')].length()")).intValue(),
                "接单/配送/完成三次状态更新应各写一条 ORDER 通知：" + body);
    }

    /** TC-NTF-006：用户取消写 ORDER 通知。 */
    @Test void tcNtf006_cancelWritesOrderNotification() throws Exception {
        var s = userLogin();
        mvc.perform(post("/api/v1/orders/o1001/cancel").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"不想要了\"}")).andExpect(status().isOk());
        String body = list(s);
        Assertions.assertEquals(1, ((Number) JsonPath.read(body, "$.data[?(@.type=='ORDER' && @.relatedId=='o1001')].length()")).intValue(),
                "用户取消必须写 ORDER 通知：" + body);
    }

    /** TC-NTF-007：红包到账写 COUPON 通知，relatedId 为红包编号。 */
    @Test void tcNtf007_couponGrantWritesCouponNotification() throws Exception {
        var s = userLogin();
        String pack = mvc.perform(post("/api/v1/me/coupon-packs").session(s).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"packKey\":\"pack49\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        java.util.List<String> ids = JsonPath.read(pack, "$.data.coupons[*].couponId");
        Assertions.assertFalse(ids.isEmpty());
        String body = list(s);
        for (String couponId : ids) {
            Assertions.assertEquals(1,
                    ((java.util.List<?>) JsonPath.read(body, "$.data[?(@.type=='COUPON' && @.relatedId=='" + couponId + "')]")).size(),
                    "每张到账红包都应写 COUPON 通知：" + couponId);
        }
    }

    /** TC-NTF-008：会员权益提醒（种子）在列表中可见。 */
    @Test void tcNtf008_memberNotificationPresent() throws Exception {
        String body = list(userLogin());
        Assertions.assertEquals(1, ((java.util.List<?>) JsonPath.read(body, "$.data[?(@.type=='MEMBER')]")).size());
    }
}
