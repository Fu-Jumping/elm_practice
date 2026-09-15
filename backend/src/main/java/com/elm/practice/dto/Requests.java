package com.elm.practice.dto;

import com.elm.practice.domain.Domain;
import java.math.BigDecimal;
import java.util.List;

public final class Requests {
    private Requests() {}
    public static class UserRegister { public String account, password, nickname; }
    public static class Login { public String account, password, role; }
    public static class UserPatch { public String nickname; }
    public static class MerchantRegister { public String account, password, storeName, phone, contactPhone, description; }
    public static class StorePatch { public String name, description, image, contactPhone; public BigDecimal startPrice, deliveryFee; }
    public static class StoreStatusPatch { public String status; }
    public static class CategoryCreate { public String name; public Integer sortOrder; }
    public static class CategoryPatch { public String name; public Integer sortOrder; }
    public static class CategoryProductsPatch { public List<String> productIds; }
    public static class ProductCreate {
        public String name, description, image, categoryId;
        public BigDecimal price, memberPrice;
        public Integer stock;
        public Boolean onSale;
        public List<String> tags;
        public List<Domain.SpecOption> specOptions;
    }
    public static class ProductPatch {
        public String name, description, image, categoryId;
        public BigDecimal price, memberPrice;
        public Integer stock;
        public Boolean onSale;
        public List<String> tags;
        public List<Domain.SpecOption> specOptions;
    }
    public static class SpecificationsPatch { public List<Domain.SpecOption> specOptions; }
    public static class AvailabilityPatch { public Boolean onSale; public Integer stock; }
    public static class AddressRequest { public String contactName, contactSex, contactPhone, region, detail, label; public Boolean isDefault; }
    public static class CartAdd { public String storeId, productId; public Integer quantity; public List<Domain.SpecOption> specOptions; }
    public static class CartPatch { public Integer quantity; }
    public static class OrderCreate { public String storeId, addressId, remark, idempotencyKey, couponId; public BigDecimal expectedTotal; }
    public static class CancelOrder { public String reason; }
    public static class Payment { public Boolean success; }
    public static class StatusPatch { public String status; }
    public static class ReviewCreate { public Integer rating; public String content; public List<String> tags, images; }
    public static class ReplyPatch { public String reply; }
    public static class MessageCreate { public String content; }
    public static class FavoriteCreate { public String storeId; }
    public static class PromotionTierItem { public BigDecimal threshold, amount; }
    public static class PromotionPatch {
        public Boolean enabled;
        public List<PromotionTierItem> fullReductions;
        public BigDecimal newCustomerAmount; public Boolean newCustomerEnabled;
        public BigDecimal freeDeliveryThreshold;
        public BigDecimal memberDiscountRate; public Boolean memberDiscountEnabled;
    }
    public static class PackPurchase { public String packKey; }
    public static class BlastRequest { public String couponId; }
}
