package com.elm.practice.dto;

import java.math.BigDecimal;

/** JSON request bodies. Public fields allow Jackson to deserialize without coupling clients to Java records. */
public final class Requests {
    private Requests() {}
    public static class UserRegister { public String account, password, nickname; }
    public static class Login { public String account, password, role; }
    public static class UserPatch { public String nickname; }
    public static class MerchantRegister { public String account, password, storeName, phone, contactPhone, description; }
    public static class StorePatch { public String name, description, image; public BigDecimal startPrice, deliveryFee; }
    public static class StoreStatusPatch { public String status; }
    public static class CategoryCreate { public String name; public Integer sortOrder; }
    public static class CategoryPatch { public String name; public Integer sortOrder; }
    public static class ProductCreate { public String name, description, image, categoryId; public BigDecimal price; public Integer stock; public Boolean onSale; }
    public static class ProductPatch { public String name, description, image, categoryId; public BigDecimal price; public Integer stock; public Boolean onSale; }
    public static class AvailabilityPatch { public Boolean onSale; public Integer stock; }
    public static class AddressRequest { public String contactName, contactSex, contactPhone, region, detail, label; public Boolean isDefault; }
    public static class CartAdd { public String storeId, productId; public Integer quantity; }
    public static class CartPatch { public Integer quantity; }
    public static class OrderCreate { public String storeId, addressId, remark, idempotencyKey; public BigDecimal expectedTotal; }
    public static class Payment { public Boolean success; }
    public static class StatusPatch { public String status; }
    public static class ReviewCreate { public Integer rating; public String content; }
    public static class ReplyPatch { public String reply; }
    public static class MessageCreate { public String content; }
    public static class PromotionPatch { public BigDecimal threshold, amount; public Boolean enabled; }
}
