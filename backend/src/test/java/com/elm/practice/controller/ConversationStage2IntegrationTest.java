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
}
