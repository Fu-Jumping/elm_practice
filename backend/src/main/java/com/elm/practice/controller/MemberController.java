package com.elm.practice.controller;

import com.elm.practice.common.ApiResponse;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.service.AuthService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 会员标识与权益说明（契约 §3.8，TODO-BE-008 会员部分）。本契约不提供开通与续费接口。 */
@RestController
@RequestMapping("/api/v1")
public class MemberController {
    private final AuthService auth;

    public MemberController(AuthService auth) { this.auth = auth; }

    @GetMapping("/me/member")
    public ApiResponse<?> member(HttpSession s) {
        return ApiResponse.success(ViewMapper.member(auth.requireUser(s)));
    }
}
