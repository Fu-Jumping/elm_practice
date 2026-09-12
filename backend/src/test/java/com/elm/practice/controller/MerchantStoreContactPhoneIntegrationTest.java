package com.elm.practice.controller;

import com.elm.practice.mapper.MerchantMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlConfig;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * BUG-20260908-012：店铺设置联系电话保存后不回显（后端 StorePatch 缺 contactPhone，值被丢弃）。
 * 归口：后端补 contactPhone——PATCH 保存到 merchants.phone，GET /merchant/store 必须回显。
 */
@SpringBootTest @AutoConfigureMockMvc @SqlConfig(encoding="UTF-8")
@Sql(scripts="/reset.sql", executionPhase=Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class MerchantStoreContactPhoneIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired MerchantMapper merchants;
    private MockHttpSession login() throws Exception {
        return (MockHttpSession)mvc.perform(post("/api/v1/merchant/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"account\":\"merchant-a\",\"password\":\"123456\",\"role\":\"merchant\"}"))
            .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }

    @Test void patchContactPhonePersistsAndEchoes() throws Exception {
        var session = login();
        mvc.perform(patch("/api/v1/merchant/store").session(session).contentType(MediaType.APPLICATION_JSON)
            .content("{\"contactPhone\":\"13900000009\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.contactPhone").value("13900000009"));
        // GET 回显与落库（merchants.phone）双验证
        mvc.perform(get("/api/v1/merchant/store").session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.contactPhone").value("13900000009"));
        assertEquals("13900000009", merchants.findById("ma001").phone);
    }

    @Test void patchWithoutContactPhoneKeepsExisting() throws Exception {
        var session = login();
        mvc.perform(patch("/api/v1/merchant/store").session(session).contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"肯德基宅急送（改名测试）\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.contactPhone").value("13800000002"));
        assertEquals("13800000002", merchants.findById("ma001").phone);
    }

    @Test void invalidContactPhoneRejected() throws Exception {
        var session = login();
        mvc.perform(patch("/api/v1/merchant/store").session(session).contentType(MediaType.APPLICATION_JSON)
            .content("{\"contactPhone\":\"123\"}"))
            .andExpect(status().isBadRequest());
        // 校验失败不得落库
        assertEquals("13800000002", merchants.findById("ma001").phone);
    }
}
