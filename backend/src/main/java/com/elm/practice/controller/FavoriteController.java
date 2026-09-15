package com.elm.practice.controller;

import com.elm.practice.common.ApiResponse;
import com.elm.practice.dto.Requests;
import com.elm.practice.service.AuthService;
import com.elm.practice.service.FavoriteService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

/** 商家收藏（契约 §3.7）。 */
@RestController
@RequestMapping("/api/v1/me/favorites")
public class FavoriteController {
    private final AuthService auth;
    private final FavoriteService favorites;

    public FavoriteController(AuthService auth, FavoriteService favorites) {
        this.auth = auth; this.favorites = favorites;
    }

    @GetMapping
    public ApiResponse<?> list(HttpSession s) {
        return ApiResponse.success(favorites.list(auth.requireUser(s)));
    }

    @PostMapping
    public ApiResponse<?> add(@RequestBody Requests.FavoriteCreate req, HttpSession s) {
        return ApiResponse.success(favorites.add(auth.requireUser(s), req));
    }

    @DeleteMapping("/{storeId}")
    public ApiResponse<?> remove(@PathVariable String storeId, HttpSession s) {
        return ApiResponse.success(favorites.remove(auth.requireUser(s), storeId));
    }
}
