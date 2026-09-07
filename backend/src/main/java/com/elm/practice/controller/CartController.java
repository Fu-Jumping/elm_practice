package com.elm.practice.controller;

import com.elm.practice.common.ApiResponse;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.dto.Requests;
import com.elm.practice.service.AuthService;
import com.elm.practice.service.CartService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/cart")
public class CartController {
    private final AuthService auth; private final CartService carts;
    public CartController(AuthService auth,CartService carts){this.auth=auth;this.carts=carts;}
    @GetMapping public ApiResponse<?> list(@RequestParam String storeId,HttpSession s){return ApiResponse.success(carts.list(auth.requireUser(s),storeId));}
    @PostMapping("/items") public ApiResponse<?> add(@RequestBody Requests.CartAdd r,HttpSession s){var c=carts.add(auth.requireUser(s),r);return ApiResponse.success(ViewMapper.cart(c,cartsProduct(c)));}
    @PatchMapping("/items/{cartLineId}") public ApiResponse<?> patch(@PathVariable String cartLineId,@RequestBody Requests.CartPatch r,HttpSession s){var c=carts.patch(auth.requireUser(s),cartLineId,r.quantity);return ApiResponse.success(ViewMapper.cart(c,cartsProduct(c)));}
    @DeleteMapping("/items/{cartLineId}") public ApiResponse<?> delete(@PathVariable String cartLineId,HttpSession s){carts.delete(auth.requireUser(s),cartLineId);return ApiResponse.success(java.util.Map.of());}
    private com.elm.practice.domain.Domain.Product cartsProduct(com.elm.practice.domain.Domain.CartLine c){return carts.product(c.productId);}
}
