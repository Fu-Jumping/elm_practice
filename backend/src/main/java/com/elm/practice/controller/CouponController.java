package com.elm.practice.controller;

import com.elm.practice.common.ApiResponse;
import com.elm.practice.dto.Requests;
import com.elm.practice.service.AuthService;
import com.elm.practice.service.CouponService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

/** 用户红包与爆红包（契约 §3.8、§3.10 CHG-001）。全部从 Session 取用户，只读写本人数据。 */
@RestController
@RequestMapping("/api/v1")
public class CouponController {
    private final AuthService auth; private final CouponService coupons;
    public CouponController(AuthService auth, CouponService coupons) { this.auth = auth; this.coupons = coupons; }

    @GetMapping("/me/coupons")
    public ApiResponse<?> list(@RequestParam(required = false) String status, HttpSession s) {
        return ApiResponse.success(coupons.list(auth.requireUser(s), status));
    }

    @GetMapping("/me/coupons/available")
    public ApiResponse<?> available(@RequestParam String storeId, @RequestParam BigDecimal amount, HttpSession s) {
        return ApiResponse.success(coupons.availableForOrder(auth.requireUser(s), storeId, amount));
    }

    @PostMapping("/me/coupon-packs")
    public ApiResponse<?> purchase(@RequestBody Requests.PackPurchase r, HttpSession s) {
        return ApiResponse.success(coupons.purchasePack(auth.requireUser(s), r));
    }

    @PostMapping("/me/coupons/blast")
    public ApiResponse<?> blast(@RequestBody(required = false) Requests.BlastRequest r, HttpSession s) {
        return ApiResponse.success(coupons.blast(auth.requireUser(s), r));
    }
}
