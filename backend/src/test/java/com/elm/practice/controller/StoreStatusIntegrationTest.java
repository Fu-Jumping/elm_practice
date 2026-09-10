package com.elm.practice.controller;

import com.elm.practice.domain.Domain;
import com.elm.practice.mapper.StoreMapper;
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

/** IC-MER-03：响应成功之后，数据库与用户端查询必须同步。 */
@SpringBootTest @AutoConfigureMockMvc @SqlConfig(encoding="UTF-8")
@Sql(scripts="/reset.sql", executionPhase=Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class StoreStatusIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired StoreMapper stores;
    private MockHttpSession login() throws Exception {
        return (MockHttpSession)mvc.perform(post("/api/v1/merchant/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"account\":\"merchant-a\",\"password\":\"123456\",\"role\":\"merchant\"}"))
            .andExpect(status().isOk()).andReturn().getRequest().getSession();
    }
    @Test void closingAndReopeningPersistsAndChangesPublicVisibility() throws Exception {
        var session=login();
        mvc.perform(patch("/api/v1/merchant/store/status").session(session).contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"CLOSED\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("CLOSED"));
        assertEquals(Domain.StoreStatus.CLOSED,stores.findById("m002").status);
        mvc.perform(get("/api/v1/stores").param("keyword","肯德基")).andExpect(jsonPath("$.data.length()").value(0));
        mvc.perform(patch("/api/v1/merchant/store/status").session(session).contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"OPEN\"}")).andExpect(status().isOk());
        assertEquals(Domain.StoreStatus.OPEN,stores.findById("m002").status);
        mvc.perform(get("/api/v1/stores").param("keyword","肯德基")).andExpect(jsonPath("$.data.length()").value(1));
    }
    @Test void invalidStatusDoesNotChangeDatabase() throws Exception {
        mvc.perform(patch("/api/v1/merchant/store/status").session(login()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"PAUSED\"}")).andExpect(status().isBadRequest());
        assertEquals(Domain.StoreStatus.OPEN,stores.findById("m002").status);
    }
}
