package com.elm.practice.controller;

import com.elm.practice.common.ApiResponse;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.dto.Requests;
import com.elm.practice.service.AddressService;
import com.elm.practice.service.AuthService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me/addresses")
public class AddressController {
    private final AuthService auth; private final AddressService addresses;
    public AddressController(AuthService auth,AddressService addresses){this.auth=auth;this.addresses=addresses;}
    @GetMapping public ApiResponse<?> list(HttpSession s){return ApiResponse.success(addresses.list(auth.requireUser(s)));}
    @PostMapping public ApiResponse<?> create(@RequestBody Requests.AddressRequest r,HttpSession s){return ApiResponse.success(ViewMapper.address(addresses.create(auth.requireUser(s),r)));}
    @GetMapping("/{addressId}") public ApiResponse<?> get(@PathVariable String addressId,HttpSession s){return ApiResponse.success(ViewMapper.address(addresses.get(auth.requireUser(s),addressId)));}
    @PatchMapping("/{addressId}") public ApiResponse<?> patch(@PathVariable String addressId,@RequestBody Requests.AddressRequest r,HttpSession s){return ApiResponse.success(ViewMapper.address(addresses.patch(auth.requireUser(s),addressId,r)));}
    @DeleteMapping("/{addressId}") public ApiResponse<?> delete(@PathVariable String addressId,HttpSession s){addresses.delete(auth.requireUser(s),addressId);return ApiResponse.success(java.util.Map.of());}
}
