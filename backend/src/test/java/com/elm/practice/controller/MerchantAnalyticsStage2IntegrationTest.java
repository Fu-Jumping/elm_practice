package com.elm.practice.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlConfig;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@SqlConfig(encoding = "UTF-8")
@Sql(scripts = "/reset.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class MerchantAnalyticsStage2IntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void arrangeStatisticsSamples() {
        jdbc.update("UPDATE orders SET status='PROCESSING' WHERE order_id='o1002'");
        jdbc.update("UPDATE orders SET status='CANCELLED', paid_at=NOW() WHERE order_id='o1003'");
        jdbc.update("INSERT INTO reviews(review_id,order_id,store_id,user_id,content,rating,tags,images,reply,created_at) "
                + "VALUES('rv-stats','o1002','m002','u001','good',5,JSON_ARRAY(),JSON_ARRAY(),NULL,NOW())");
        jdbc.update("INSERT INTO conversations(conversation_id,order_id,user_id,merchant_id,user_read,merchant_read) "
                + "VALUES('cv-stats','o1001','u001','ma001',TRUE,FALSE)");
        jdbc.update("INSERT INTO messages(message_id,conversation_id,sender_id,sender_role,content,created_at) VALUES "
                + "('msg-stats-1','cv-stats','u001','USER','one',DATE_SUB(NOW(),INTERVAL 1 MINUTE)),"
                + "('msg-stats-2','cv-stats','u001','USER','two',NOW())");
    }

    private MockHttpSession merchant() throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/v1/merchant/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"account\":\"merchant-a\",\"password\":\"123456\",\"role\":\"merchant\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    @Test
    void overviewUsesTodayValidOrdersAndRealPendingCounts() throws Exception {
        mvc.perform(get("/api/v1/merchant/overview").session(merchant()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.todaySalesAmount").value(26.50))
                .andExpect(jsonPath("$.data.validOrderCount").value(1))
                .andExpect(jsonPath("$.data.expectedIncome").value(26.50))
                .andExpect(jsonPath("$.data.pendingOrderCount").value(1))
                .andExpect(jsonPath("$.data.unrepliedReviewCount").value(1))
                .andExpect(jsonPath("$.data.unreadMessageCount").value(2));
    }

    @Test
    void analyticsValidatesRangeAndAggregatesHistoricalProcessingOrders() throws Exception {
        var merchant = merchant();
        mvc.perform(get("/api/v1/merchant/analytics").param("range", "7d").session(merchant))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.range").value("7d"))
                .andExpect(jsonPath("$.data.salesAmount").value(53.00))
                .andExpect(jsonPath("$.data.orderCount").value(2))
                .andExpect(jsonPath("$.data.avgOrderAmount").value(26.50))
                .andExpect(jsonPath("$.data.trend.length()").value(7))
                .andExpect(jsonPath("$.data.trend[0].date").isNotEmpty())
                .andExpect(jsonPath("$.data.trend[0].salesAmount").exists())
                .andExpect(jsonPath("$.data.trend[0].orderCount").exists())
                .andExpect(jsonPath("$.data.channelDistribution[0].name").isNotEmpty())
                .andExpect(jsonPath("$.data.channelDistribution[0].value").value(2))
                .andExpect(jsonPath("$.data.statusDistribution.length()").value(greaterThanOrEqualTo(2)));

        mvc.perform(get("/api/v1/merchant/analytics").param("range", "year").session(merchant))
                .andExpect(status().isBadRequest());
    }

    @Test
    void anEmptyNewStoreReturnsZeroInsteadOfDemoNumbers() throws Exception {
        mvc.perform(post("/api/v1/merchant/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"account\":\"stats-empty\",\"password\":\"123456\",\"storeName\":\"Empty\",\"phone\":\"13800009999\"}"))
                .andExpect(status().isOk());
        MockHttpSession emptyMerchant = (MockHttpSession) mvc.perform(post("/api/v1/merchant/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"account\":\"stats-empty\",\"password\":\"123456\",\"role\":\"merchant\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();

        mvc.perform(get("/api/v1/merchant/overview").session(emptyMerchant))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.todaySalesAmount").value(0))
                .andExpect(jsonPath("$.data.validOrderCount").value(0))
                .andExpect(jsonPath("$.data.expectedIncome").value(0));
        mvc.perform(get("/api/v1/merchant/analytics").param("range", "today").session(emptyMerchant))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.salesAmount").value(0))
                .andExpect(jsonPath("$.data.orderCount").value(0))
                .andExpect(jsonPath("$.data.avgOrderAmount").value(0));
    }
}
