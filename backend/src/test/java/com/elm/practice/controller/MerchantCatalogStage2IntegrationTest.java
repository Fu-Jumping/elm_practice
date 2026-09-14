package com.elm.practice.controller;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlConfig;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@SqlConfig(encoding = "UTF-8")
@Sql(scripts = "/reset.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class MerchantCatalogStage2IntegrationTest {
    @Autowired MockMvc mvc;

    private MockHttpSession merchant() throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/v1/merchant/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"merchant-a\",\"password\":\"123456\",\"role\":\"merchant\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    private MockHttpSession user() throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"account\":\"13800000001\",\"password\":\"123456\",\"role\":\"user\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    @Test void productExtendedFieldsAndSpecificationsRoundTrip() throws Exception {
        var session = merchant();
        String created = mvc.perform(post("/api/v1/merchant/products").session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"二阶段套餐\",\"description\":\"规格测试\",\"image\":\"/uploads/product-demo.png\","
                        + "\"categoryId\":\"c101\",\"price\":20,\"memberPrice\":18,\"stock\":10,\"onSale\":true,"
                        + "\"tags\":[\"招牌\",\"热销\"],\"specOptions\":[{\"name\":\"标准\",\"priceDelta\":0},{\"name\":\"大份\",\"priceDelta\":3}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.memberPrice").value(18))
                .andExpect(jsonPath("$.data.tags[0]").value("招牌"))
                .andExpect(jsonPath("$.data.specOptions[1].priceDelta").value(3))
                .andReturn().getResponse().getContentAsString();
        String productId = JsonPath.read(created, "$.data.productId");

        mvc.perform(put("/api/v1/merchant/products/{id}/specifications", productId).session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"specOptions\":[{\"name\":\"单人份\",\"priceDelta\":0},{\"name\":\"双人份\",\"priceDelta\":8}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.specOptions[1].name").value("双人份"))
                .andExpect(jsonPath("$.data.specOptions[1].priceDelta").value(8));

        mvc.perform(patch("/api/v1/merchant/products/{id}", productId).session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"memberPrice\":17.5,\"tags\":[\"新品\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.memberPrice").value(17.5))
                .andExpect(jsonPath("$.data.tags[0]").value("新品"));
    }

    @Test void invalidProductImageAndSpecificationAreRejected() throws Exception {
        var session = merchant();
        mvc.perform(patch("/api/v1/merchant/products/p101").session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"image\":\"https://evil.example/a.png\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/merchant/products/p101/specifications").session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"specOptions\":[{\"name\":\"大份\",\"priceDelta\":-1}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test void categoryBindingIsAtomicAndStoreScoped() throws Exception {
        var session = merchant();
        mvc.perform(patch("/api/v1/merchant/categories/c102/products").session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"productIds\":[\"p101\",\"p102\"]}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/merchant/products/p101").session(session))
                .andExpect(jsonPath("$.data.categoryId").value("c102"));
        mvc.perform(get("/api/v1/merchant/products/p102").session(session))
                .andExpect(jsonPath("$.data.categoryId").value("c102"));

        mvc.perform(patch("/api/v1/merchant/categories/c102/products").session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"productIds\":[\"p201\"]}"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/merchant/products/p101").session(session))
                .andExpect(jsonPath("$.data.categoryId").value("c102"));
    }

    @Test void imageUploadValidatesRoleTypeAndSizeAndServesFile() throws Exception {
        var merchant = merchant();
        var png = new MockMultipartFile("file", "dish.png", "image/png",
                new byte[]{(byte) 0x89, 0x50, 0x4e, 0x47});
        String uploaded = mvc.perform(multipart("/api/v1/files/images").file(png)
                        .param("scene", "product").session(merchant))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.url").value(org.hamcrest.Matchers.startsWith("/uploads/")))
                .andExpect(jsonPath("$.data.fileName").isNotEmpty())
                .andExpect(jsonPath("$.data.size").value(4))
                .andExpect(jsonPath("$.data.contentType").value("image/png"))
                .andReturn().getResponse().getContentAsString();
        String url = JsonPath.read(uploaded, "$.data.url");
        mvc.perform(get(url)).andExpect(status().isOk()).andExpect(content().bytes(png.getBytes()));

        var textFile = new MockMultipartFile("file", "dish.txt", "text/plain", "x".getBytes());
        mvc.perform(multipart("/api/v1/files/images").file(textFile)
                        .param("scene", "product").session(merchant))
                .andExpect(status().isBadRequest());

        var oversized = new MockMultipartFile("file", "dish.jpg", "image/jpeg", new byte[2 * 1024 * 1024 + 1]);
        mvc.perform(multipart("/api/v1/files/images").file(oversized)
                        .param("scene", "product").session(merchant))
                .andExpect(status().isBadRequest());

        mvc.perform(multipart("/api/v1/files/images").file(png).param("scene", "product").session(user()))
                .andExpect(status().isForbidden());
    }

    @Test void differentSpecificationsCreateDistinctCartLinesAndOrderSnapshots() throws Exception {
        var merchant = merchant();
        mvc.perform(put("/api/v1/merchant/products/p101/specifications").session(merchant)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"specOptions\":[{\"name\":\"标准\",\"priceDelta\":0},{\"name\":\"大份\",\"priceDelta\":3}]}"))
                .andExpect(status().isOk());
        var user = user();

        String normal = mvc.perform(post("/api/v1/cart/items").session(user)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m002\",\"productId\":\"p101\",\"quantity\":1,\"specOptions\":[{\"name\":\"标准\",\"priceDelta\":999}]}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.unitPrice").value(19.5))
                .andReturn().getResponse().getContentAsString();
        String large = mvc.perform(post("/api/v1/cart/items").session(user)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m002\",\"productId\":\"p101\",\"quantity\":1,\"specOptions\":[{\"name\":\"大份\",\"priceDelta\":999}]}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.unitPrice").value(22.5))
                .andReturn().getResponse().getContentAsString();
        assertNotEquals((Object) JsonPath.read(normal, "$.data.cartLineId"), (Object) JsonPath.read(large, "$.data.cartLineId"));

        mvc.perform(get("/api/v1/cart").param("storeId", "m002").session(user))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(2));

        String order = mvc.perform(post("/api/v1/orders").session(user)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"storeId\":\"m002\",\"addressId\":\"da001\",\"idempotencyKey\":\"spec-order\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.items[0].specOptions[0].name").exists())
                .andExpect(jsonPath("$.data.items[1].specOptions[0].name").exists())
                .andReturn().getResponse().getContentAsString();
        assertEquals(42.0, ((Number) JsonPath.read(order, "$.data.itemSubtotal")).doubleValue(), 0.001);
    }
}
