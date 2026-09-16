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

@SpringBootTest @AutoConfigureMockMvc @SqlConfig(encoding="UTF-8")
@Sql(scripts="/reset.sql",executionPhase=Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class ConversationStage2IntegrationTest {
    @Autowired MockMvc mvc;
    /** 排序用例需要把先建会话的最后消息时间回拨，构造「老会话、新消息」与「新会话、旧消息」的对照。 */
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;

    private MockHttpSession user() throws Exception {
        return (MockHttpSession)mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"13800000001\",\"password\":\"123456\",\"role\":\"user\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }
    private MockHttpSession merchant() throws Exception {
        return (MockHttpSession)mvc.perform(post("/api/v1/merchant/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"merchant-a\",\"password\":\"123456\",\"role\":\"merchant\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }
    private String createOrder(MockHttpSession user) throws Exception {
        mvc.perform(post("/api/v1/cart/items").session(user).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m002\",\"productId\":\"p104\",\"quantity\":2}"))
                .andExpect(status().isOk());
        String body=mvc.perform(post("/api/v1/orders").session(user).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m002\",\"addressId\":\"da001\",\"idempotencyKey\":\"chat-order\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body,"$.data.orderId");
    }

    @Test void orderFilterSendReadAndConversationSummaryRoundTrip() throws Exception {
        var user=user();
        String orderId=createOrder(user);
        String list=mvc.perform(get("/api/v1/conversations").param("orderId",orderId).session(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].orderId").value(orderId))
                .andExpect(jsonPath("$.data[0].userNickname").value("演**"))
                .andReturn().getResponse().getContentAsString();
        String conversationId=JsonPath.read(list,"$.data[0].conversationId");

        var merchant=merchant();
        mvc.perform(post("/api/v1/conversations/{id}/messages",conversationId).session(merchant)
                .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"您好，正在备餐\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.messages[0].messageId").isNotEmpty())
                .andExpect(jsonPath("$.data.messages[0].senderRole").value("MERCHANT"))
                .andExpect(jsonPath("$.data.lastMessage").value("您好，正在备餐"))
                .andExpect(jsonPath("$.data.unreadCount").value(0));

        mvc.perform(get("/api/v1/conversations/{id}",conversationId).session(user))
                .andExpect(jsonPath("$.data.unreadCount").value(1))
                .andExpect(jsonPath("$.data.updatedAt").isNotEmpty());
        mvc.perform(patch("/api/v1/conversations/{id}/read",conversationId).session(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unreadCount").value(0));
        mvc.perform(get("/api/v1/conversations").param("orderId","not-exists").session(user))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test void emptyAndTooLongMessagesAreRejected() throws Exception {
        var user=user();
        String orderId=createOrder(user);
        String list=mvc.perform(get("/api/v1/conversations").param("orderId",orderId).session(user))
                .andReturn().getResponse().getContentAsString();
        String id=JsonPath.read(list,"$.data[0].conversationId");
        mvc.perform(post("/api/v1/conversations/{id}/messages",id).session(user)
                .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"  \"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/conversations/{id}/messages",id).session(user)
                .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\""+ "x".repeat(1001) +"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test void otherMerchantCannotReadConversation() throws Exception {
        var user=user();
        String orderId=createOrder(user);
        String list=mvc.perform(get("/api/v1/conversations").param("orderId",orderId).session(user))
                .andReturn().getResponse().getContentAsString();
        String id=JsonPath.read(list,"$.data[0].conversationId");

        String account="chat-b-"+System.nanoTime();
        mvc.perform(post("/api/v1/merchants").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\""+account+"\",\"password\":\"123456\",\"storeName\":\"B店\",\"phone\":\"13999999998\"}"))
                .andExpect(status().isOk());
        var other=(MockHttpSession)mvc.perform(post("/api/v1/merchant/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\""+account+"\",\"password\":\"123456\",\"role\":\"merchant\"}"))
                .andReturn().getRequest().getSession();
        mvc.perform(get("/api/v1/conversations/{id}",id).session(other)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/conversations").param("orderId",orderId).session(other))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(0));
    }

    // ================= 消息域 P1 簇（2026-09-15 验收修复） =================

    /** BUG-20260914-005 根因侧：会话对象必须携带 storeId/storeName（契约 §6.1 回写），用户端聊天详情/列表依赖店铺名。 */
    @Test void conversationReturnsStoreIdAndStoreName() throws Exception {
        var user=user();
        String orderId=createOrder(user);
        String list=mvc.perform(get("/api/v1/conversations").param("orderId",orderId).session(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].storeId").value("m002"))
                .andExpect(jsonPath("$.data[0].storeName").value("肯德基宅急送"))
                .andReturn().getResponse().getContentAsString();
        String conversationId=JsonPath.read(list,"$.data[0].conversationId");
        mvc.perform(get("/api/v1/conversations/{id}",conversationId).session(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.storeId").value("m002"))
                .andExpect(jsonPath("$.data.storeName").value("肯德基宅急送"));
    }

    // ================= 会话列表排序（2026-09-16 BUG-20260916-004） =================

    /**
     * 会话列表按**最后一条消息时间倒序**（最近有消息的会话排最上），用户端与商家端同一口径。
     *
     * 线上复现（2026-09-16 负责人反馈「用户端消息页与商家对话，最新的会话在最底部」）：两处列表都用
     * `ORDER BY conversation_id`（≈建会话先后），「老会话刚收到新消息」不会上浮，最新活动的会话被压在下面。
     * 前端替身 `frontend/user-h5/src/mocks/message.ts` 一直按 `lastMessageAt` 倒序（产品口径），
     * 故这是**只有真实后端复现**的替身/真后端不一致；既有用例只按 `orderId` 定位单条，未断言列表整体顺序。
     *
     * 用例构造：同一用户建两个会话各发一条消息，把**先建会话（会话号更小）的消息回拨 1 小时**，
     * 期望「后建但消息更新」的会话排第一。修复前按会话号升序 → 先建者排第一 → 必红。
     */
    @Test void conversationListIsSortedByLastMessageTimeDesc() throws Exception {
        var user=user();
        String orderA=createOrder(user,"chat-order-a");
        String orderB=createOrder(user,"chat-order-b");
        var merchant=merchant();
        String convA=conversationIdOf(user,orderA);
        String convB=conversationIdOf(user,orderB);
        sendMessage(user,convA,"A-较旧");
        sendMessage(merchant,convB,"B-较新");
        // 先建会话的最后消息回拨 1 小时 → 其「最后消息时间」明显落后于后建会话
        jdbc.update("UPDATE messages SET created_at=DATE_SUB(NOW(),INTERVAL 1 HOUR) WHERE conversation_id=?",convA);

        String userList=conversationList(user);
        org.junit.jupiter.api.Assertions.assertEquals(java.util.List.of(convB,convA),conversationIds(userList),
                "用户端会话列表应按最后消息时间倒序，实际="+userList);
        String merchantList=conversationList(merchant);
        org.junit.jupiter.api.Assertions.assertEquals(java.util.List.of(convB,convA),conversationIds(merchantList),
                "商家端会话列表应按最后消息时间倒序，实际="+merchantList);
    }

    /** 建单（会话随订单创建）：idempotencyKey 必须唯一，否则第二单会幂等命中第一单。 */
    private String createOrder(MockHttpSession user,String idempotencyKey) throws Exception {
        mvc.perform(post("/api/v1/cart/items").session(user).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m002\",\"productId\":\"p104\",\"quantity\":2}"))
                .andExpect(status().isOk());
        String body=mvc.perform(post("/api/v1/orders").session(user).contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m002\",\"addressId\":\"da001\",\"idempotencyKey\":\""+idempotencyKey+"\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body,"$.data.orderId");
    }

    private String conversationIdOf(MockHttpSession session,String orderId) throws Exception {
        String body=mvc.perform(get("/api/v1/conversations").param("orderId",orderId).session(session))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body,"$.data[0].conversationId");
    }

    private void sendMessage(MockHttpSession session,String conversationId,String content) throws Exception {
        mvc.perform(post("/api/v1/conversations/{id}/messages",conversationId).session(session)
                .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\""+content+"\"}"))
                .andExpect(status().isOk());
    }

    private String conversationList(MockHttpSession session) throws Exception {
        return mvc.perform(get("/api/v1/conversations").session(session))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private java.util.List<String> conversationIds(String body) {
        return JsonPath.read(body,"$.data[*].conversationId");
    }
}
