package com.elm.practice.controller;

import com.elm.practice.common.ApiResponse;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.service.StoreService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class StoreController {
    private final StoreService stores;
    public StoreController(StoreService stores){this.stores=stores;}
    @GetMapping("/stores") public ApiResponse<?> stores(@RequestParam(required=false) String keyword,@RequestParam(required=false) String categoryId,@RequestParam(required=false,defaultValue="综合") String sort){return ApiResponse.success(stores.list(keyword,categoryId,sort));}
    @GetMapping("/stores/{storeId}") public ApiResponse<?> store(@PathVariable String storeId){return ApiResponse.success(ViewMapper.store(stores.get(storeId)));}
    @GetMapping("/stores/{storeId}/categories") public ApiResponse<?> categories(@PathVariable String storeId){return ApiResponse.success(stores.categories(storeId));}
    @GetMapping("/stores/{storeId}/products") public ApiResponse<?> products(@PathVariable String storeId,@RequestParam(required=false) String categoryId){return ApiResponse.success(stores.products(storeId,categoryId,false));}
    @GetMapping("/products/{productId}") public ApiResponse<?> product(@PathVariable String productId){return ApiResponse.success(stores.publicProduct(productId));}
}
