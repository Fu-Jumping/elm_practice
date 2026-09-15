package com.elm.practice.controller;

import com.elm.practice.common.ApiResponse;
import com.elm.practice.dto.Requests;
import com.elm.practice.service.AuthService;
import com.elm.practice.service.FavoriteService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

/** 商家收藏（契约 §3.7，TODO-BE-008 收藏部分）。全部从 Session 取用户，只读写本人收藏。 */
@RestController
@RequestMapping("/api/v1")
public class FavoriteController {
    private final AuthService auth; private final FavoriteService favorites;

    public FavoriteController(AuthService auth, FavoriteService favorites) {
        this.auth = auth; this.favorites = favorites;
    }

    @GetMapping("/me/favorites")
    public ApiResponse<?> list(HttpSession s) {
        return ApiResponse.success(favorites.list(auth.requireUser(s)));
    }

    @PostMapping("/me/favorites")
    public ApiResponse<?> create(@RequestBody(required = false) Requests.FavoriteCreate r, HttpSession s) {
        return ApiResponse.success(favorites.create(auth.requireUser(s), r == null ? null : r.storeId));
    }

    @DeleteMapping("/me/favorites/{storeId}")
    public ApiResponse<?> delete(@PathVariable String storeId, HttpSession s) {
        return ApiResponse.success(favorites.delete(auth.requireUser(s), storeId));
    }
}
