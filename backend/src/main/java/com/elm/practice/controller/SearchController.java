package com.elm.practice.controller;

import com.elm.practice.common.ApiResponse;
import com.elm.practice.service.SearchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 关键词搜索（契约 §3.6，TODO-BE-007）：同时返回商家与商品两组分页对象。
 * page/size 以字符串接收后自行校验，保证「非正整数返回 400」的错误体与统一响应一致。
 */
@RestController
@RequestMapping("/api/v1")
public class SearchController {
    private final SearchService search;

    public SearchController(SearchService search) { this.search = search; }

    @GetMapping("/search")
    public ApiResponse<?> search(@RequestParam(required = false) String keyword,
                                 @RequestParam(required = false) String categoryId,
                                 @RequestParam(required = false) String sort,
                                 @RequestParam(required = false) String page,
                                 @RequestParam(required = false) String size) {
        return ApiResponse.success(search.search(keyword, categoryId, sort, page, size));
    }
}
