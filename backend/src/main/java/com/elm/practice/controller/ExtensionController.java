package com.elm.practice.controller;

import com.elm.practice.common.ApiResponse;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.dto.Requests;
import com.elm.practice.domain.Domain;
import com.elm.practice.service.AuthService;
import com.elm.practice.service.ExtensionService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ExtensionController {
    private final AuthService auth; private final ExtensionService extension;
    public ExtensionController(AuthService auth,ExtensionService extension){this.auth=auth;this.extension=extension;}
    @GetMapping("/stores/{storeId}/reviews") public ApiResponse<?> reviews(@PathVariable String storeId,@RequestParam(required=false) Integer rating,@RequestParam(required=false) String filter){return ApiResponse.success(extension.storeReviews(storeId,rating,filter));}
    @PostMapping("/orders/{orderId}/review") public ApiResponse<?> review(@PathVariable String orderId,@RequestBody Requests.ReviewCreate r,HttpSession s){return ApiResponse.success(ViewMapper.review(extension.review(auth.requireUser(s),orderId,r)));}
    @GetMapping("/merchant/reviews") public ApiResponse<?> merchantReviews(HttpSession s){return ApiResponse.success(extension.merchantReviews(auth.requireMerchant(s)));}
    @PatchMapping("/merchant/reviews/{reviewId}/reply") public ApiResponse<?> reply(@PathVariable String reviewId,@RequestBody Requests.ReplyPatch r,HttpSession s){return ApiResponse.success(ViewMapper.review(extension.reply(auth.requireMerchant(s),reviewId,r)));}
    @GetMapping("/conversations") public ApiResponse<?> conversations(@RequestParam(required=false) String orderId,HttpSession s){return ApiResponse.success(extension.conversations(RequestUtil.principal(s),orderId));}
    @GetMapping("/conversations/{conversationId}") public ApiResponse<?> conversation(@PathVariable String conversationId,HttpSession s){return ApiResponse.success(extension.conversation(RequestUtil.principal(s),conversationId));}
    @PostMapping("/conversations/{conversationId}/messages") public ApiResponse<?> message(@PathVariable String conversationId,@RequestBody Requests.MessageCreate r,HttpSession s){return ApiResponse.success(extension.send(RequestUtil.principal(s),conversationId,r));}
    @PatchMapping("/conversations/{conversationId}/read") public ApiResponse<?> read(@PathVariable String conversationId,HttpSession s){return ApiResponse.success(extension.markRead(RequestUtil.principal(s),conversationId));}
    @GetMapping("/merchant/promotions") public ApiResponse<?> promotion(HttpSession s){return ApiResponse.success(extension.promotion(auth.requireMerchant(s)));}
    @PutMapping("/merchant/promotions") public ApiResponse<?> savePromotion(@RequestBody Requests.PromotionPatch r,HttpSession s){return ApiResponse.success(extension.savePromotion(auth.requireMerchant(s),r));}
    @GetMapping("/merchant/overview") public ApiResponse<?> overview(HttpSession s){return ApiResponse.success(extension.overview(auth.requireMerchant(s)));}
    @GetMapping("/merchant/analytics") public ApiResponse<?> analytics(@RequestParam(required=false) String range,HttpSession s){return ApiResponse.success(extension.analytics(auth.requireMerchant(s),range));}
}
