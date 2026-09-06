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
            this.storeId = storeId; this.phone = phone; this.createdAt = createdAt;
        }
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
    }
    public static final class Category {
        public String id, storeId, name;
        public int sortOrder;
        public Category(String id, String storeId, String name, int sortOrder) {
            this.id=id; this.storeId=storeId; this.name=name; this.sortOrder=sortOrder;
        }
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
    }
    public static final class Order {
        public String id, userId, storeId, addressId, remark, createdAt, paidAt;
        public OrderStatus status;
        public BigDecimal itemSubtotal, packagingFee, total;
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
    }
    public static final class Review {
        public String id, orderId, storeId, userId, content, reply, createdAt, repliedAt;
        public int rating;
        public Review(String id, String orderId, String storeId, String userId, String content,
                      int rating, String createdAt) {
            this.id=id; this.orderId=orderId; this.storeId=storeId; this.userId=userId;
            this.content=content; this.rating=rating; this.createdAt=createdAt;
        }
    }
    public static final class Conversation {
        public String id, orderId, userId, merchantId;
        public boolean userRead, merchantRead;
        public final List<Message> messages = new ArrayList<>();
        public Conversation(String id, String orderId, String userId, String merchantId) {
            this.id=id; this.orderId=orderId; this.userId=userId; this.merchantId=merchantId;
        }
    }
    public static final class Message {
        public String id, senderId, senderRole, content, createdAt;
        public Message(String id, String senderId, String senderRole, String content, String createdAt) {
            this.id=id; this.senderId=senderId; this.senderRole=senderRole; this.content=content; this.createdAt=createdAt;
        }
    }
}
