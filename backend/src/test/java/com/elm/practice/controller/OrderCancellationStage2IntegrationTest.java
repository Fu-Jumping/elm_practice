package com.elm.practice.controller;

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

@SpringBootTest
@AutoConfigureMockMvc
@SqlConfig(encoding="UTF-8")
@Sql(scripts="/reset.sql",executionPhase=Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class OrderCancellationStage2IntegrationTest {
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

    @Test void pendingPaymentCancellationRestoresStockOnceAndIsIdempotent() throws Exception {
        var user=user();
        mvc.perform(post("/api/v1/orders/o1003/cancel").session(user).contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"地址填错了\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.cancelReason").value("地址填错了"))
                .andExpect(jsonPath("$.data.cancelledBy").value("USER"))
                .andExpect(jsonPath("$.data.cancelledAt").isNotEmpty());

        var merchant=merchant();
        mvc.perform(get("/api/v1/merchant/products/p105").session(merchant))
                .andExpect(jsonPath("$.data.stock").value(151));

        mvc.perform(post("/api/v1/orders/o1003/cancel").session(user).contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"重复请求\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cancelReason").value("地址填错了"));
        mvc.perform(get("/api/v1/merchant/products/p105").session(merchant))
                .andExpect(jsonPath("$.data.stock").value(151));

        mvc.perform(post("/api/v1/orders/o1003/payment").session(user).contentType(MediaType.APPLICATION_JSON)
                .content("{\"success\":true}")).andExpect(status().isConflict());
    }

    @Test void paidPendingOrderCanBeCancelledAndMerchantCanSeeIt() throws Exception {
        mvc.perform(post("/api/v1/orders/o1001/cancel").session(user()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"不需要了\"}"))
                .andExpect(status().isOk());

        var merchant=merchant();
        mvc.perform(get("/api/v1/merchant/orders").param("status","CANCELLED").session(merchant))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].orderId").value("o1001"))
                .andExpect(jsonPath("$.data[0].cancelReason").value("不需要了"));
        mvc.perform(get("/api/v1/merchant/orders/o1001").session(merchant))
                .andExpect(jsonPath("$.data.cancelledAt").isNotEmpty());
        mvc.perform(get("/api/v1/merchant/products/p101").session(merchant))
                .andExpect(jsonPath("$.data.stock").value(101));
    }

    @Test void completedOrderAndOtherUsersOrderCannotBeCancelled() throws Exception {
        var owner=user();
        mvc.perform(post("/api/v1/orders/o1002/cancel").session(owner).contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"太晚了\"}")).andExpect(status().isConflict());

        String account="13912345678";
        mvc.perform(post("/api/v1/users").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\""+account+"\",\"password\":\"123456\",\"nickname\":\"其他用户\"}"))
                .andExpect(status().isOk());
        var other=(MockHttpSession)mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\""+account+"\",\"password\":\"123456\",\"role\":\"user\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
        mvc.perform(post("/api/v1/orders/o1001/cancel").session(other).contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"越权\"}")).andExpect(status().isNotFound());
    }

    @Test void cancellationReasonMustBeOneToFiftyCharacters() throws Exception {
        var user=user();
        mvc.perform(post("/api/v1/orders/o1003/cancel").session(user).contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"   \"}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/orders/o1003/cancel").session(user).contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"123456789012345678901234567890123456789012345678901\"}"))
                .andExpect(status().isBadRequest());
    }
}
