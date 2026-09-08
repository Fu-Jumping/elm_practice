package com.elm.practice.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlConfig;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.nullValue;

@SpringBootTest
@AutoConfigureMockMvc
@SqlConfig(encoding = "UTF-8")
@Sql(scripts = "/reset.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class AuthControllerIntegrationTest {
    @Autowired MockMvc mvc;

    @Test void protectedEndpointReturnsUnified401Json() throws Exception {
        mvc.perform(get("/api/v1/me/addresses"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(40101))
                .andExpect(jsonPath("$.data").value(nullValue()));
    }

    @Test void loginCreatesSessionAndReturnsSanitizedUser() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"account\":\"13800000001\",\"password\":\"123456\",\"role\":\"user\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.account").value("13800000001"))
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist());
    }

    @Test void storeListReturnsUnifiedJsonWithoutClosedStores() throws Exception {
        mvc.perform(get("/api/v1/stores"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.length()").value(5))
                .andExpect(jsonPath("$.data[?(@.status == 'CLOSED')]").isEmpty());
    }

    /** BUG-002：前端部署在服务器 IP 时浏览器登录 403，CORS 白名单需放行 http://82.157.137.114:* */
    @Test void corsAllowsServerHostOrigin() throws Exception {
        mvc.perform(get("/api/v1/stores").header("Origin", "http://82.157.137.114:8080"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://82.157.137.114:8080"));
    }

    /** BUG-003：商家端按契约传 contactPhone，注册接口须兼容该字段而非仅认 phone */
    @Test void merchantRegisterAcceptsContractContactPhoneField() throws Exception {
        mvc.perform(post("/api/v1/merchants").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"account\":\"13900001111\",\"password\":\"123456\",\"storeName\":\"BUG003测试店铺\",\"contactPhone\":\"13900001111\",\"description\":\"bug003\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.storeId").exists());
    }
}
