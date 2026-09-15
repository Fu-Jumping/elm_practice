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

@SpringBootTest @AutoConfigureMockMvc @SqlConfig(encoding="UTF-8")
@Sql(scripts="/reset.sql",executionPhase=Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class ReviewStage2IntegrationTest {
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

    @Test void reviewTagsImagesNicknameReplyAndReviewedRoundTrip() throws Exception {
        mvc.perform(post("/api/v1/orders/o1002/review").session(user()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"rating\":5,\"content\":\"很好吃\",\"tags\":[\"味道好\",\"包装严实\"],"
                        + "\"images\":[\"/uploads/review-1.png\",\"/uploads/review-2.webp\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tags[0]").value("味道好"))
                .andExpect(jsonPath("$.data.images.length()").value(2))
                .andExpect(jsonPath("$.data.userNickname").value("演**"));

        mvc.perform(get("/api/v1/orders/o1002").session(user()))
                .andExpect(jsonPath("$.data.reviewed").value(true));

        var merchant=merchant();
        mvc.perform(get("/api/v1/merchant/reviews").session(merchant))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].userNickname").value("演**"))
                .andExpect(jsonPath("$.data[0].images[1]").value("/uploads/review-2.webp"));

        mvc.perform(patch("/api/v1/merchant/reviews/rv1004/reply").session(merchant)
                .contentType(MediaType.APPLICATION_JSON).content("{\"reply\":\"感谢支持\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reply").value("感谢支持"))
                .andExpect(jsonPath("$.data.repliedAt").isNotEmpty());
    }

    @Test void invalidReviewImagesAreRejectedBeforePersistence() throws Exception {
        var user=user();
        mvc.perform(post("/api/v1/orders/o1002/review").session(user).contentType(MediaType.APPLICATION_JSON)
                .content("{\"rating\":5,\"content\":\"图太多\",\"images\":[\"/uploads/1.png\",\"/uploads/2.png\",\"/uploads/3.png\",\"/uploads/4.png\"]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/orders/o1002/review").session(user).contentType(MediaType.APPLICATION_JSON)
                .content("{\"rating\":5,\"content\":\"外链\",\"images\":[\"https://evil.example/a.png\"]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/merchant/reviews").session(merchant()))
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test void duplicateReviewAndForeignReplyRespectConflictAndOwnership() throws Exception {
        var user=user();
        String body="{\"rating\":4,\"content\":\"不错\",\"tags\":[]}";
        mvc.perform(post("/api/v1/orders/o1002/review").session(user).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/orders/o1002/review").session(user).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());

        String account="merchant-b-"+System.nanoTime();
        mvc.perform(post("/api/v1/merchants").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\""+account+"\",\"password\":\"123456\",\"storeName\":\"B店\",\"phone\":\"13999999999\"}"))
                .andExpect(status().isOk());
        var other=(MockHttpSession)mvc.perform(post("/api/v1/merchant/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\""+account+"\",\"password\":\"123456\",\"role\":\"merchant\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
        mvc.perform(patch("/api/v1/merchant/reviews/rv1004/reply").session(other)
                .contentType(MediaType.APPLICATION_JSON).content("{\"reply\":\"越权\"}"))
                .andExpect(status().isNotFound());
    }

    // ================= 评价聚合与筛选（2026-09-15 Wave3，契约 §6.2 回写） =================

    /** GET /stores/{id}/reviews 返回 summary（平均分+总数）+ list（按筛选收窄）；非法 filter 400。 */
    @Test void reviewFilterAndSummary() throws Exception {
        // 本用例自造数据：o1002（COMPLETED）一条带图 5 星评价
        mvc.perform(post("/api/v1/orders/o1002/review").session(user()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"rating\":5,\"content\":\"带图好评\",\"images\":[\"/uploads/a.png\"]}"))
                .andExpect(status().isOk());
        // 默认（全部）
        mvc.perform(get("/api/v1/stores/m002/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary.totalCount").value(1))
                .andExpect(jsonPath("$.data.summary.averageRating").value(5.0))
                .andExpect(jsonPath("$.data.list.length()").value(1));
        // 有图
        mvc.perform(get("/api/v1/stores/m002/reviews").param("filter", "有图"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list.length()").value(1))
                .andExpect(jsonPath("$.data.list[0].images.length()").value(1));
        // 好评（≥4）1 条；差评（≤3）0 条；最新 = 默认时间倒序
        mvc.perform(get("/api/v1/stores/m002/reviews").param("filter", "好评"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.list.length()").value(1));
        mvc.perform(get("/api/v1/stores/m002/reviews").param("filter", "差评"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.list.length()").value(0));
        // 非法 filter 400
        mvc.perform(get("/api/v1/stores/m002/reviews").param("filter", "随便"))
                .andExpect(status().isBadRequest());
    }
}
