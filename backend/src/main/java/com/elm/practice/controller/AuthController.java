package com.elm.practice.controller;

import com.elm.practice.common.ApiResponse;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.dto.Requests;
import com.elm.practice.service.AuthService;
import com.elm.practice.repository.InMemoryRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AuthController {
    private final AuthService auth; private final InMemoryRepository repo;
    public AuthController(AuthService auth, InMemoryRepository repo){this.auth=auth;this.repo=repo;}
    @PostMapping("/users") public ApiResponse<?> registerUser(@RequestBody Requests.UserRegister r){return ApiResponse.success(ViewMapper.user(auth.registerUser(r.account,r.password,r.nickname)));}
    @PostMapping("/auth/login") public ApiResponse<?> login(@RequestBody Requests.Login r,HttpSession session){return ApiResponse.success(ViewMapper.user(auth.loginUser(r.account,r.password,r.role,session)));}
    @PostMapping("/auth/logout") public ApiResponse<?> logout(HttpSession session){auth.logout(session);return ApiResponse.success(java.util.Map.of());}
    @GetMapping("/me") public ApiResponse<?> me(HttpSession session){return ApiResponse.success(ViewMapper.user(auth.requireUser(session)));}
    @PatchMapping("/me") public ApiResponse<?> patchMe(@RequestBody Requests.UserPatch r,HttpSession session){var u=auth.requireUser(session);if(r.nickname!=null)u.nickname=RequestUtil.required(r.nickname,"nickname");return ApiResponse.success(ViewMapper.user(u));}
    @PostMapping("/merchants") public ApiResponse<?> registerMerchant(@RequestBody Requests.MerchantRegister r){var m=auth.registerMerchant(r.account,r.password,r.storeName,r.phone,r.description);return ApiResponse.success(ViewMapper.merchant(m,repo.stores.get(m.storeId)));}
    @PostMapping("/merchant/auth/login") public ApiResponse<?> loginMerchant(@RequestBody Requests.Login r,HttpSession session){var m=auth.loginMerchant(r.account,r.password,r.role,session);return ApiResponse.success(ViewMapper.merchant(m,repo.stores.get(m.storeId)));}
    @GetMapping("/merchant/me") public ApiResponse<?> merchantMe(HttpSession session){var m=auth.requireMerchant(session);return ApiResponse.success(ViewMapper.merchant(m,repo.stores.get(m.storeId)));}
}
