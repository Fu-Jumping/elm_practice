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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * TC-SRH 集成层：契约 §3.6 搜索、排序与分页（TODO-BE-007）。
 * 基线（reset.sql 种子）：m001 老王小店 1200/4.60、m002 肯德基宅急送 3500/4.80、
 * m003 麦当劳 2800/4.70、m004 老胖烧烤 800/4.50（TEMPORARILY_CLOSED）、m005 元盛居火锅 950/4.90；
 * 种子距离字段 distanceKm：m001 1.8 / m002 2.4 / m003 2.9 / m004 3.6 / m005 4.2。
 * 关键词「老」命中商家 m001、m004，并因商品「老北京鸡肉卷」命中 m002；关键词「堡」经商品名命中 m002。
 */
@SpringBootTest @AutoConfigureMockMvc @SqlConfig(encoding="UTF-8")
@Sql(scripts="/reset.sql", executionPhase=Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class SearchIntegrationTest {
    @Autowired MockMvc mvc;

    private String search(MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(request).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private MockHttpServletRequestBuilder query() {
        return get("/api/v1/search");
    }

    /** 数组长度：JsonPath 的 filter + length() 在部分版本返回 JSONArray，统一在这里取 size。 */
    private static int sizeOf(String body, String path) {
        return ((List<?>) JsonPath.read(body, path)).size();
    }

    /** TC-SRH-001：响应为两组分页对象（list/page/size/total），是 §1.3 列表约定的唯一例外。 */
    @Test void tcSrh001_returnsTwoPagedGroups() throws Exception {
        String body = search(query().param("keyword", "肯德基"));
        Assertions.assertEquals(0, ((Number) JsonPath.read(body, "$.code")).intValue());
        Assertions.assertEquals(1, ((Number) JsonPath.read(body, "$.data.merchants.total")).intValue());
        Assertions.assertEquals(1, ((Number) JsonPath.read(body, "$.data.merchants.page")).intValue());
        Assertions.assertEquals(10, ((Number) JsonPath.read(body, "$.data.merchants.size")).intValue());
        Assertions.assertEquals("m002", JsonPath.read(body, "$.data.merchants.list[0].storeId"));
        // 2026-09-15 搜索增强（TODO-BE-025）：品牌词经词条重映射带出该店热销商品（肯德基→鸡腿堡），
        // 商品组不再为空（原 P0 口径 products=0，随增强有意变更，见契约 §3.6 词条重映射段）
        Assertions.assertEquals(2, ((Number) JsonPath.read(body, "$.data.products.total")).intValue());
        Assertions.assertEquals(1, ((Number) JsonPath.read(body, "$.data.products.page")).intValue());
        Assertions.assertEquals(10, ((Number) JsonPath.read(body, "$.data.products.size")).intValue());
    }

    /** TC-SRH-002：关键词匹配商家名或商品名；商品名命中时回带所属商家。 */
    @Test void tcSrh002_keywordMatchesMerchantNameOrProductName() throws Exception {
        String body = search(query().param("keyword", "堡"));
        Assertions.assertEquals(1, ((Number) JsonPath.read(body, "$.data.merchants.total")).intValue());
        Assertions.assertEquals("m002", JsonPath.read(body, "$.data.merchants.list[0].storeId"));
        Assertions.assertEquals(2, ((Number) JsonPath.read(body, "$.data.products.total")).intValue());
        Assertions.assertEquals("p101", JsonPath.read(body, "$.data.products.list[0].productId"));
    }

    /** TC-SRH-003：综合 = 销量优先；距离 = 种子字段 distanceKm 升序（两者顺序不同，可判别）。 */
    @Test void tcSrh003_sortCompositeAndDistance() throws Exception {
        String composite = search(query().param("keyword", "老").param("sort", "综合"));
        Assertions.assertEquals(3, ((Number) JsonPath.read(composite, "$.data.merchants.total")).intValue());
        Assertions.assertEquals("m002", JsonPath.read(composite, "$.data.merchants.list[0].storeId"));
        Assertions.assertEquals("m001", JsonPath.read(composite, "$.data.merchants.list[1].storeId"));
        Assertions.assertEquals("m004", JsonPath.read(composite, "$.data.merchants.list[2].storeId"));

        String bySales = search(query().param("keyword", "老").param("sort", "销量"));
        Assertions.assertEquals("m002", JsonPath.read(bySales, "$.data.merchants.list[0].storeId"));

        String byDistance = search(query().param("keyword", "老").param("sort", "距离"));
        Assertions.assertEquals("m001", JsonPath.read(byDistance, "$.data.merchants.list[0].storeId"));
        Assertions.assertEquals("m002", JsonPath.read(byDistance, "$.data.merchants.list[1].storeId"));
        Assertions.assertEquals("m004", JsonPath.read(byDistance, "$.data.merchants.list[2].storeId"));
        Assertions.assertEquals("1.8km", JsonPath.read(byDistance, "$.data.merchants.list[0].distanceText"));
    }

    /** TC-SRH-004：分页参数生效且 total 为命中总数。 */
    @Test void tcSrh004_paginationApplies() throws Exception {
        String body = search(query().param("keyword", "老").param("page", "2").param("size", "1"));
        Assertions.assertEquals(3, ((Number) JsonPath.read(body, "$.data.merchants.total")).intValue());
        Assertions.assertEquals(2, ((Number) JsonPath.read(body, "$.data.merchants.page")).intValue());
        Assertions.assertEquals(1, ((Number) JsonPath.read(body, "$.data.merchants.size")).intValue());
        Assertions.assertEquals(1, sizeOf(body, "$.data.merchants.list"));
        Assertions.assertEquals("m001", JsonPath.read(body, "$.data.merchants.list[0].storeId"));
    }

    /** TC-SRH-005：分类条件收窄；分类无匹配返回空列表，不返回 404。 */
    @Test void tcSrh005_categoryFilterAndEmptyResult() throws Exception {
        String narrowed = search(query().param("keyword", "老").param("categoryId", "c101"));
        Assertions.assertEquals(1, ((Number) JsonPath.read(narrowed, "$.data.merchants.total")).intValue());
        Assertions.assertEquals("m002", JsonPath.read(narrowed, "$.data.merchants.list[0].storeId"));

        String empty = search(query().param("keyword", "老").param("categoryId", "c999"));
        Assertions.assertEquals(0, ((Number) JsonPath.read(empty, "$.data.merchants.total")).intValue());
        Assertions.assertEquals(0, ((Number) JsonPath.read(empty, "$.data.products.total")).intValue());
    }

    /** TC-SRH-006：空关键词返回空列表（不报错）；非法 sort 与非法分页返回 400。 */
    @Test void tcSrh006_emptyKeywordAndInvalidParams() throws Exception {
        String blank = search(query().param("keyword", "   "));
        Assertions.assertEquals(0, ((Number) JsonPath.read(blank, "$.data.merchants.total")).intValue());
        Assertions.assertEquals(0, ((Number) JsonPath.read(blank, "$.data.products.total")).intValue());

        mvc.perform(query().param("keyword", "肯德基").param("sort", "价格")).andExpect(status().isBadRequest());
        mvc.perform(query().param("keyword", "肯德基").param("page", "0")).andExpect(status().isBadRequest());
        mvc.perform(query().param("keyword", "肯德基").param("size", "-1")).andExpect(status().isBadRequest());
        mvc.perform(query().param("keyword", "肯德基").param("page", "abc")).andExpect(status().isBadRequest());
    }

    /** TC-SRH-007：平台级课程分类（C1）也能作为搜索的商家过滤条件。 */
    @Test void tcSrh007_platformCourseCategoryFilter() throws Exception {
        String body = search(query().param("keyword", "老").param("categoryId", "pc07"));
        Assertions.assertEquals(1, ((Number) JsonPath.read(body, "$.data.merchants.total")).intValue());
        Assertions.assertEquals("m002", JsonPath.read(body, "$.data.merchants.list[0].storeId"));
    }

    /** TC-SRH-008：CLOSED 店铺不出现在搜索结果（与 §3.2 用户端可见性一致）。 */
    @Test void tcSrh008_closedStoreHidden() throws Exception {
        var merchant = (MockHttpSession) mvc.perform(post("/api/v1/merchant/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"account\":\"merchant-a\",\"password\":\"123456\",\"role\":\"merchant\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
        mvc.perform(patch("/api/v1/merchant/store/status").session(merchant).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CLOSED\"}")).andExpect(status().isOk());

        String body = search(query().param("keyword", "肯德基"));
        Assertions.assertEquals(0, ((Number) JsonPath.read(body, "$.data.merchants.total")).intValue());
        Assertions.assertEquals(0, ((Number) JsonPath.read(body, "$.data.products.total")).intValue());
    }

    // ================= 词条重映射与联想（2026-09-15 搜索增强，TODO-BE-025） =================

    @Test void synonymExpansionRecallsProductsBeyondSubstring() throws Exception {
        // "炸鸡"目录无完整子串（鸡腿堡/鸡块），经重映射（炸鸡→鸡）必须召回
        String body = mvc.perform(get("/api/v1/search").param("keyword", "炸鸡"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.merchants.list[?(@.storeId == 'm002')]").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        var names = (java.util.List<?>) com.jayway.jsonpath.JsonPath.read(body, "$.data.products.list[*].name");
        org.junit.jupiter.api.Assertions.assertTrue(names.toString().contains("鸡腿堡"),
                "重映射（炸鸡→鸡）应召回鸡腿堡类商品: " + names);
    }

    @Test void brandAliasCaseInsensitiveMatchesStore() throws Exception {
        for (String w : new String[]{"kfc", "KFC"}) {
            mvc.perform(get("/api/v1/search").param("keyword", w))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.merchants.list[?(@.storeId == 'm002')]").isNotEmpty());
        }
    }

    @Test void designHotWordsAllReturnNonEmptyResults() throws Exception {
        // 演示保证：设计稿 8 热门词（含目录中不存在的麻辣烫/奶茶/寿司/饺子/沙拉）经重映射全部非空
        for (String w : new String[]{"麻辣烫", "奶茶", "烧烤", "炸鸡", "寿司", "饺子", "面条", "沙拉"}) {
            String body = mvc.perform(get("/api/v1/search").param("keyword", w))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            int m = com.jayway.jsonpath.JsonPath.read(body, "$.data.merchants.total");
            int pr = com.jayway.jsonpath.JsonPath.read(body, "$.data.products.total");
            org.junit.jupiter.api.Assertions.assertTrue(m + pr > 0,
                    "演示热门词「" + w + "」必须召回非空（merchants=" + m + ", products=" + pr + "）");
        }
    }

    @Test void priceIntentReturnsCheapestFirst() throws Exception {
        String body = mvc.perform(get("/api/v1/search").param("keyword", "便宜"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var list = (java.util.List<?>) com.jayway.jsonpath.JsonPath.read(body, "$.data.products.list");
        org.junit.jupiter.api.Assertions.assertFalse(list.isEmpty(), "便宜应返回低价商品");
        String first = com.jayway.jsonpath.JsonPath.read(body, "$.data.products.list[0].name");
        org.junit.jupiter.api.Assertions.assertTrue(first.contains("米饭"), "最低价（米饭）应居首，实际=" + first);
    }

    @Test void suggestReturnsTermsStoresAndProducts() throws Exception {
        String body = mvc.perform(get("/api/v1/search/suggest").param("keyword", "肯"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        java.util.List<String> texts = com.jayway.jsonpath.JsonPath.read(body, "$.data.suggestions[*].text");
        org.junit.jupiter.api.Assertions.assertTrue(texts.stream().anyMatch(t -> t.contains("肯德基")), "联想应含肯德基: " + texts);
    }

    @Test void suggestBlankKeywordReturnsEmpty() throws Exception {
        mvc.perform(get("/api/v1/search/suggest").param("keyword", " "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.suggestions.length()").value(0));
    }

    @Test void hotWordsComeFromDictionaryAndAllSearchable() throws Exception {
        String body = mvc.perform(get("/api/v1/search/hot"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        java.util.List<String> words = com.jayway.jsonpath.JsonPath.read(body, "$.data[*].word");
        org.junit.jupiter.api.Assertions.assertFalse(words.isEmpty(), "热门词接口应返回字典词条");
        for (String w : words) {
            String sb = mvc.perform(get("/api/v1/search").param("keyword", w))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            int m = com.jayway.jsonpath.JsonPath.read(sb, "$.data.merchants.total");
            int pr = com.jayway.jsonpath.JsonPath.read(sb, "$.data.products.total");
            org.junit.jupiter.api.Assertions.assertTrue(m + pr > 0, "热门词「" + w + "」搜索不得为空");
        }
    }
}
