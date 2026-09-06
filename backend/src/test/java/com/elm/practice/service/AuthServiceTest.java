package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.repository.InMemoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

import static org.junit.jupiter.api.Assertions.*;

class AuthServiceTest {
    private InMemoryRepository repo;
    private AuthService auth;

    @BeforeEach void setUp() { repo = new InMemoryRepository(); repo.seed(); auth = new AuthService(repo); }

    @Test void loginStoresRoleScopedSessionAndNeverReturnsPasswordThroughView() {
        var session = new MockHttpSession();
        var user = auth.loginUser("13800000001", "123456", "user", session);
        assertEquals("u001", user.id);
        assertEquals("USER", ((com.elm.practice.domain.Domain.Principal) session.getAttribute("ELM_AUTH_PRINCIPAL")).role().name());
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
