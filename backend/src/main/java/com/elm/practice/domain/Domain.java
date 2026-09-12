package com.elm.practice.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Internal domain objects. Controllers expose sanitized maps and never expose credentials. */
public final class Domain {
    private Domain() {}

    public enum Role { USER, MERCHANT }
    public enum StoreStatus { OPEN, CLOSED, TEMPORARILY_CLOSED }
    public enum OrderStatus { PENDING_PAYMENT, PROCESSING, PENDING, COOKING, DELIVERING, COMPLETED }

    public record Principal(String id, Role role) {}

    public static final class User {
        public String id;
        public String account;
        public String passwordHash;
        public String nickname;
        public String createdAt;
        /** 批次⑥：当天已用免费爆的日期（yyyy-MM-dd，东八区），null=从未使用。CHG-001 §3.10。 */
        public String freeBlastDate;
        public User(String id, String account, String passwordHash, String nickname, String createdAt) {
            this.id = id; this.account = account; this.passwordHash = passwordHash;
            this.nickname = nickname; this.createdAt = createdAt;
        }
    }
    public static final class Merchant {
        public String id;
        public String account;
        public String passwordHash;
        public String storeId;
        public String phone;
        public String createdAt;
        public Merchant(String id, String account, String passwordHash, String storeId, String phone, String createdAt) {
            this.id = id; this.account = account; this.passwordHash = passwordHash;
            this.storeId = storeId; this.phone = phone;
            this.createdAt = createdAt;
        }
        public Merchant() {}
    }
    public static final class Store {
        public String id, name, description, image, merchantId;
        public BigDecimal rating;
        public int monthlySales, deliveryMinutes;
        public BigDecimal startPrice, deliveryFee;
        public StoreStatus status;
        public Store(String id, String name, String description, String image, BigDecimal rating,
                     int monthlySales, int deliveryMinutes, BigDecimal startPrice, BigDecimal deliveryFee,
                     StoreStatus status, String merchantId) {
            this.id=id; this.name=name; this.description=description; this.image=image; this.rating=rating;
            this.monthlySales=monthlySales; this.deliveryMinutes=deliveryMinutes; this.startPrice=startPrice;
            this.deliveryFee=deliveryFee; this.status=status; this.merchantId=merchantId;
        }
        public Store() {}
    }
    public static final class Category {
        public String id, storeId, name;
        public int sortOrder;
        public Category(String id, String storeId, String name, int sortOrder) {
            this.id=id; this.storeId=storeId; this.name=name; this.sortOrder=sortOrder;
        }
        public Category() {}
    }
    public static final class Product {
        public String id, storeId, categoryId, name, description, image;
        public BigDecimal price;
        public int stock, sales;
        public boolean onSale;
        public Product(String id, String storeId, String categoryId, String name, String description,
                       String image, BigDecimal price, int stock, boolean onSale, int sales) {
            this.id=id; this.storeId=storeId; this.categoryId=categoryId; this.name=name;
            this.description=description; this.image=image; this.price=price; this.stock=stock;
            this.onSale=onSale; this.sales=sales;
        }
        public Product() {}
    }
    public static final class Address {
        public String id, userId, contactName, contactSex, contactPhone, region, detail, label;
        public boolean isDefault;
        public LocalDateTime updatedAt;
        public Address(String id, String userId, String contactName, String contactSex, String contactPhone,
                       String region, String detail, String label, boolean isDefault, LocalDateTime updatedAt) {
            this.id=id; this.userId=userId; this.contactName=contactName; this.contactSex=contactSex;
            this.contactPhone=contactPhone; this.region=region; this.detail=detail; this.label=label;
            this.isDefault=isDefault; this.updatedAt=updatedAt;
        }
        public Address() {}
        /** 订单地址快照的防御性拷贝（原 InMemoryRepository.copyAddress 口径）。 */
        public Address copy() {
            return new Address(id, userId, contactName, contactSex, contactPhone, region, detail, label, isDefault, updatedAt);
        }
    }
    public static final class CartLine {
        public String id, userId, storeId, productId;
        public int quantity;
        public BigDecimal unitPrice;
        public LocalDateTime updatedAt;
        public CartLine(String id, String userId, String storeId, String productId, int quantity,
                        BigDecimal unitPrice, LocalDateTime updatedAt) {
            this.id=id; this.userId=userId; this.storeId=storeId; this.productId=productId;
            this.quantity=quantity; this.unitPrice=unitPrice; this.updatedAt=updatedAt;
        }
        public CartLine() {}
    }
    public static final class Order {
        public String id, userId, storeId, addressId, remark, createdAt, paidAt;
        public OrderStatus status;
        public BigDecimal itemSubtotal, packagingFee, total;
        // 金额快照扩展（批次①，契约 §3.5）：历史行/旧构造默认 0。
        public BigDecimal deliveryFee = BigDecimal.ZERO, fullReductionAmount = BigDecimal.ZERO,
                newCustomerAmount = BigDecimal.ZERO, memberDiscountAmount = BigDecimal.ZERO,
                couponAmount = BigDecimal.ZERO, deliveryFeeDiscount = BigDecimal.ZERO;
        public Address addressSnapshot;
        public final List<OrderItem> items = new ArrayList<>();
        public String idempotencyKey;
        public Order(String id, String userId, String storeId, String addressId, String remark,
                     String createdAt, OrderStatus status, BigDecimal itemSubtotal,
                     BigDecimal packagingFee, BigDecimal total, Address addressSnapshot, String idempotencyKey) {
            this.id=id; this.userId=userId; this.storeId=storeId; this.addressId=addressId; this.remark=remark;
            this.createdAt=createdAt; this.status=status; this.itemSubtotal=itemSubtotal;
            this.packagingFee=packagingFee; this.total=total; this.addressSnapshot=addressSnapshot;
            this.idempotencyKey=idempotencyKey;
        }
        public Order() {}
    }
    /** 满减阶梯行（批次①，promotion_tiers 表映射）。 */
    public static final class PromoTier {
        public BigDecimal threshold, amount;
        public PromoTier() {}
        public PromoTier(BigDecimal threshold, BigDecimal amount) { this.threshold=threshold; this.amount=amount; }
    }
    /** 店铺优惠配置聚合（promotions 扩列 + promotion_tiers），供计价七步使用。 */
    public static final class PromoConfig {
        public boolean enabled;
        public final List<PromoTier> tiers = new ArrayList<>();
        public BigDecimal newUserAmount = BigDecimal.ZERO;        // 新客立减，0=关闭
        public BigDecimal freeDeliveryThreshold = BigDecimal.ZERO; // 免配送费门槛，0=不启用
        public BigDecimal memberDiscountRate = BigDecimal.ONE;     // 会员折扣率，1.00=关闭
    }
    /** 用户红包（批次⑥，coupons 表映射；§3.8 + CHG-001 §3.10）。 */
    public static final class Coupon {
        public String id, userId, name, storeId, validFrom, validTo, usedOrderId, packId;
        public BigDecimal amount, threshold;
        public String scope = "ALL";   // ALL 全场 / STORE 指定商家
        public boolean used, canBlast;
        public String source = "SEED"; // SEED 种子 / PACK 购买所得 / BLAST_OUT 爆出来的
        public Coupon() {}
    }
    /** 红包套餐购买记录（批次⑥，coupon_packs 表映射，CHG-001；前端模拟付费不落支付记录）。 */
    public static final class CouponPack {
        public String id, userId, packKey, createdAt;
        public BigDecimal price;
        public int quantity;
        public CouponPack() {}
        public CouponPack(String id, String userId, String packKey, BigDecimal price, int quantity, String createdAt) {
            this.id=id; this.userId=userId; this.packKey=packKey; this.price=price;
            this.quantity=quantity; this.createdAt=createdAt;
        }
    }
    public static final class OrderItem {
        public String productId, name, image, categoryId;
        public BigDecimal unitPrice, subtotal;
        public int quantity;
        public OrderItem(String productId, String name, String image, String categoryId,
                         BigDecimal unitPrice, int quantity) {
            this.productId=productId; this.name=name; this.image=image; this.categoryId=categoryId;
            this.unitPrice=unitPrice; this.quantity=quantity;
            this.subtotal=unitPrice.multiply(BigDecimal.valueOf(quantity)).setScale(2);
        }
        public OrderItem() {}
    }
    public static final class Review {
        public String id, orderId, storeId, userId, content, reply, createdAt, repliedAt;
        public int rating;
        public Review(String id, String orderId, String storeId, String userId, String content,
                      int rating, String createdAt) {
            this.id=id; this.orderId=orderId; this.storeId=storeId; this.userId=userId;
            this.content=content; this.rating=rating; this.createdAt=createdAt;
        }
        public Review() {}
    }
    public static final class Conversation {
        public String id, orderId, userId, merchantId;
        public boolean userRead, merchantRead;
        public final List<Message> messages = new ArrayList<>();
        public Conversation(String id, String orderId, String userId, String merchantId) {
            this.id=id; this.orderId=orderId; this.userId=userId; this.merchantId=merchantId;
        }
        public Conversation() {}
    }
    public static final class Message {
        public String id, senderId, senderRole, content, createdAt;
        public Message(String id, String senderId, String senderRole, String content, String createdAt) {
            this.id=id; this.senderId=senderId; this.senderRole=senderRole; this.content=content; this.createdAt=createdAt;
        }
        public Message() {}
    }
}
