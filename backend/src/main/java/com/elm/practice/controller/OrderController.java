package com.elm.practice.controller;

import com.elm.practice.common.ApiResponse;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.dto.Requests;
import com.elm.practice.service.AuthService;
import com.elm.practice.service.OrderService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {
    private final AuthService auth; private final OrderService orders;
    public OrderController(AuthService auth,OrderService orders){this.auth=auth;this.orders=orders;}
    @PostMapping public ApiResponse<?> create(@RequestBody Requests.OrderCreate r,HttpSession s){return ApiResponse.success(ViewMapper.order(orders.create(auth.requireUser(s),r),true));}
    @GetMapping public ApiResponse<?> list(@RequestParam(required=false) String status,HttpSession s){return ApiResponse.success(orders.list(auth.requireUser(s),status));}
    @GetMapping("/{orderId}") public ApiResponse<?> get(@PathVariable String orderId,HttpSession s){return ApiResponse.success(ViewMapper.order(orders.get(auth.requireUser(s),orderId),true));}
    @GetMapping("/{orderId}/items") public ApiResponse<?> items(@PathVariable String orderId,HttpSession s){return ApiResponse.success(orders.get(auth.requireUser(s),orderId).items.stream().map(i->{var m=new java.util.LinkedHashMap<String,Object>();m.put("productId",i.productId);m.put("name",i.name);m.put("image",i.image);m.put("categoryId",i.categoryId);m.put("unitPrice",i.unitPrice);m.put("quantity",i.quantity);m.put("subtotal",i.subtotal);return m;}).toList());}
    @PostMapping("/{orderId}/cancel") public ApiResponse<?> cancel(@PathVariable String orderId,@RequestBody Requests.CancelOrder r,HttpSession s){return ApiResponse.success(ViewMapper.order(orders.cancel(auth.requireUser(s),orderId,r),true));}
    @PostMapping("/{orderId}/payment") public ApiResponse<?> pay(@PathVariable String orderId,@RequestBody(required=false) Requests.Payment r,HttpSession s){boolean success=r==null||r.success==null||r.success;return ApiResponse.success(ViewMapper.order(orders.pay(auth.requireUser(s),orderId,success),true));}
}
