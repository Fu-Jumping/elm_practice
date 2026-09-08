package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.domain.Domain;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlConfig;

import static org.junit.jupiter.api.Assertions.*;

/** 认证服务测试：连服务器测试库 elm_practice_test，每用例前 reset.sql 复位种子。 */
@SpringBootTest
@SqlConfig(encoding = "UTF-8")
@Sql(scripts = "/reset.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class AuthServiceTest {
    @Autowired AuthService auth;

    @Test void loginStoresRoleScopedSessionAndNeverReturnsPasswordThroughView() {
        var session = new MockHttpSession();
        var user = auth.loginUser("13800000001", "123456", "user", session);
        assertEquals("u001", user.id);
        assertEquals("USER", ((Domain.Principal) session.getAttribute("ELM_AUTH_PRINCIPAL")).role().name());
    }

    @Test void invalidPhoneIsRejectedByService() {
        ApiException ex = assertThrows(ApiException.class, () -> auth.registerUser("1380000000", "123456", "x"));
        assertEquals(400, ex.getStatus().value());
    }

    @Test void duplicateAccountIsConflict() {
        ApiException ex = assertThrows(ApiException.class, () -> auth.registerUser("13800000001", "123456", "x"));
        assertEquals(409, ex.getStatus().value());
    }

    @Test void wrongRoleCannotUseUserLogin() {
        ApiException ex = assertThrows(ApiException.class, () -> auth.loginUser("13800000001", "123456", "merchant", new MockHttpSession()));
        assertEquals(403, ex.getStatus().value());
    }
}
