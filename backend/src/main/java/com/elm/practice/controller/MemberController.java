package com.elm.practice.controller;

import com.elm.practice.common.ApiResponse;
import com.elm.practice.service.AuthService;
import com.elm.practice.service.MemberService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 会员标识（契约 §3.8）。 */
@RestController
@RequestMapping("/api/v1/me")
public class MemberController {
    private final AuthService auth;
    private final MemberService members;

    public MemberController(AuthService auth, MemberService members) {
        this.auth = auth; this.members = members;
    }

    @GetMapping("/member")
    public ApiResponse<?> member(HttpSession s) {
        return ApiResponse.success(members.member(auth.requireUser(s)));
    }
}
