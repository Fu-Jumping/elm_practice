package com.elm.practice.controller;

import com.elm.practice.common.ApiResponse;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.dto.Requests;
import com.elm.practice.domain.Domain;
import com.elm.practice.service.AuthService;
import com.elm.practice.service.CatalogService;
import com.elm.practice.service.OrderService;
import com.elm.practice.service.StoreService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/merchant")
public class MerchantController {
    private final AuthService auth; private final StoreService stores; private final CatalogService catalog; private final OrderService orders;
    public MerchantController(AuthService auth,StoreService stores,CatalogService catalog,OrderService orders){this.auth=auth;this.stores=stores;this.catalog=catalog;this.orders=orders;}
    @GetMapping("/store") public ApiResponse<?> store(HttpSession s){var m=auth.requireMerchant(s);return ApiResponse.success(ViewMapper.store(stores.requireMerchantStore(m)));}
    @PatchMapping("/store") public ApiResponse<?> patchStore(@RequestBody Requests.StorePatch r,HttpSession s){var m=auth.requireMerchant(s);var st=stores.requireMerchantStore(m);stores.updateStore(st,r.name,r.description,r.image,r.startPrice,r.deliveryFee);return ApiResponse.success(ViewMapper.store(st));}
    @PatchMapping("/store/status") public ApiResponse<?> status(@RequestBody Requests.StoreStatusPatch r,HttpSession s){var m=auth.requireMerchant(s);var st=stores.requireMerchantStore(m);try{st.status=Domain.StoreStatus.valueOf(com.elm.practice.common.RequestUtil.required(r.status,"status"));}catch(IllegalArgumentException e){throw com.elm.practice.common.ApiException.badRequest("status 必须为 OPEN、CLOSED 或 TEMPORARILY_CLOSED");}return ApiResponse.success(ViewMapper.store(st));}
    @GetMapping("/categories") public ApiResponse<?> categories(HttpSession s){return ApiResponse.success(catalog.categories(auth.requireMerchant(s)));}
    @PostMapping("/categories") public ApiResponse<?> createCategory(@RequestBody Requests.CategoryCreate r,HttpSession s){return ApiResponse.success(ViewMapper.category(catalog.createCategory(auth.requireMerchant(s),r.name,r.sortOrder)));}
    @PatchMapping("/categories/{categoryId}") public ApiResponse<?> patchCategory(@PathVariable String categoryId,@RequestBody Requests.CategoryPatch r,HttpSession s){return ApiResponse.success(ViewMapper.category(catalog.patchCategory(auth.requireMerchant(s),categoryId,r.name,r.sortOrder)));}
    @DeleteMapping("/categories/{categoryId}") public ApiResponse<?> deleteCategory(@PathVariable String categoryId,HttpSession s){catalog.deleteCategory(auth.requireMerchant(s),categoryId);return ApiResponse.success(java.util.Map.of());}
    @GetMapping("/products") public ApiResponse<?> products(@RequestParam(required=false) String categoryId,HttpSession s){return ApiResponse.success(catalog.products(auth.requireMerchant(s),categoryId));}
    @PostMapping("/products") public ApiResponse<?> createProduct(@RequestBody Requests.ProductCreate r,HttpSession s){var p=catalog.createProduct(auth.requireMerchant(s),r.name,r.description,r.image,r.categoryId,r.price,r.stock,r.onSale);return ApiResponse.success(ViewMapper.product(p));}
    @GetMapping("/products/{productId}") public ApiResponse<?> product(@PathVariable String productId,HttpSession s){return ApiResponse.success(ViewMapper.product(catalog.getProduct(auth.requireMerchant(s),productId)));}
    @PatchMapping("/products/{productId}") public ApiResponse<?> patchProduct(@PathVariable String productId,@RequestBody Requests.ProductPatch r,HttpSession s){var p=catalog.patchProduct(auth.requireMerchant(s),productId,r.name,r.description,r.image,r.categoryId,r.price,r.stock,r.onSale);return ApiResponse.success(ViewMapper.product(p));}
    @DeleteMapping("/products/{productId}") public ApiResponse<?> deleteProduct(@PathVariable String productId,HttpSession s){catalog.deleteProduct(auth.requireMerchant(s),productId);return ApiResponse.success(java.util.Map.of());}
    @PatchMapping("/products/{productId}/availability") public ApiResponse<?> availability(@PathVariable String productId,@RequestBody Requests.AvailabilityPatch r,HttpSession s){return ApiResponse.success(ViewMapper.product(catalog.availability(auth.requireMerchant(s),productId,r.onSale,r.stock)));}
    @GetMapping("/orders") public ApiResponse<?> orders(@RequestParam(required=false) String status,HttpSession s){return ApiResponse.success(orders.merchantList(auth.requireMerchant(s),status));}
    @GetMapping("/orders/{orderId}") public ApiResponse<?> order(@PathVariable String orderId,HttpSession s){return ApiResponse.success(ViewMapper.order(orders.merchantGet(auth.requireMerchant(s),orderId),true));}
    @PatchMapping("/orders/{orderId}/status") public ApiResponse<?> orderStatus(@PathVariable String orderId,@RequestBody Requests.StatusPatch r,HttpSession s){return ApiResponse.success(ViewMapper.order(orders.advance(auth.requireMerchant(s),orderId,r.status),true));}
}
