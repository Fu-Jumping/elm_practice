package com.elm.practice.common;

import com.elm.practice.domain.Domain;
import java.util.LinkedHashMap;
import java.util.Map;

/** Public response mapping. Keeping it separate prevents password hashes and ownership fields leaking. */
public final class ViewMapper {
    private ViewMapper() {}
    public static Map<String,Object> user(Domain.User u) {
        var m = new LinkedHashMap<String,Object>(); m.put("userId",u.id); m.put("account",u.account);
        m.put("nickname",u.nickname); m.put("createdAt",u.createdAt); return m;
    }
    public static Map<String,Object> merchant(Domain.Merchant m0, Domain.Store store) {
        var m = new LinkedHashMap<String,Object>(); m.put("merchantId",m0.id); m.put("account",m0.account);
        m.put("phone",m0.phone); m.put("storeId",m0.storeId); if (store != null) m.put("store", store(store)); return m;
    }
    public static Map<String,Object> store(Domain.Store s) {
        var m = new LinkedHashMap<String,Object>(); m.put("storeId",s.id); m.put("name",s.name);
        m.put("description",s.description); m.put("image",s.image); m.put("rating",s.rating);
        m.put("monthlySales",s.monthlySales); m.put("deliveryMinutes",s.deliveryMinutes);
        m.put("startPrice",s.startPrice); m.put("deliveryFee",s.deliveryFee); m.put("status",s.status.name()); return m;
    }
    public static Map<String,Object> category(Domain.Category c) {
        var m = new LinkedHashMap<String,Object>(); m.put("categoryId",c.id); m.put("storeId",c.storeId);
        m.put("name",c.name); m.put("sortOrder",c.sortOrder); return m;
    }
    public static Map<String,Object> product(Domain.Product p) {
        var m = new LinkedHashMap<String,Object>(); m.put("productId",p.id); m.put("storeId",p.storeId);
        m.put("categoryId",p.categoryId); m.put("name",p.name); m.put("description",p.description);
        m.put("image",p.image); m.put("price",p.price); m.put("stock",p.stock); m.put("onSale",p.onSale);
        m.put("sales",p.sales); return m;
    }
    public static Map<String,Object> address(Domain.Address a) {
        var m = new LinkedHashMap<String,Object>(); m.put("addressId",a.id); m.put("contactName",a.contactName);
        m.put("contactSex",a.contactSex); m.put("contactPhone",a.contactPhone); m.put("region",a.region);
        m.put("detail",a.detail); m.put("label",a.label); m.put("isDefault",a.isDefault);
        m.put("updatedAt",a.updatedAt == null ? null : a.updatedAt.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        return m;
    }
    public static Map<String,Object> cart(Domain.CartLine line, Domain.Product p) {
        var m = new LinkedHashMap<String,Object>(); m.put("cartLineId",line.id); m.put("storeId",line.storeId);
        m.put("productId",line.productId); m.put("quantity",line.quantity); m.put("unitPrice",p == null ? line.unitPrice : p.price);
        m.put("subtotal",(p == null ? line.unitPrice : p.price).multiply(java.math.BigDecimal.valueOf(line.quantity)).setScale(2));
        if (p != null) { m.put("name",p.name); m.put("image",p.image); m.put("stock",p.stock); m.put("onSale",p.onSale); }
        return m;
    }
    public static Map<String,Object> order(Domain.Order o, boolean includeItems) {
        var m = new LinkedHashMap<String,Object>(); m.put("orderId",o.id); m.put("userId",o.userId); m.put("storeId",o.storeId);
        m.put("addressId",o.addressId); m.put("remark",o.remark); m.put("status",o.status.name()); m.put("createdAt",o.createdAt);
        m.put("itemSubtotal",o.itemSubtotal); m.put("packagingFee",o.packagingFee); m.put("total",o.total); m.put("paidAt",o.paidAt);
        // 金额快照扩展（批次①，契约 §3.5「基础四行 + 优惠项按实际发生展示」）。
        m.put("deliveryFee",o.deliveryFee); m.put("fullReductionAmount",o.fullReductionAmount);
        m.put("newCustomerAmount",o.newCustomerAmount); m.put("memberDiscountAmount",o.memberDiscountAmount);
        m.put("couponAmount",o.couponAmount); m.put("deliveryFeeDiscount",o.deliveryFeeDiscount);
        if (o.addressSnapshot != null) m.put("address", address(o.addressSnapshot));
        if (includeItems) m.put("items", o.items.stream().map(ViewMapper::orderItem).toList());
        return m;
    }
    private static Map<String,Object> orderItem(Domain.OrderItem i) {
        var m = new LinkedHashMap<String,Object>(); m.put("productId",i.productId); m.put("name",i.name); m.put("image",i.image);
        m.put("categoryId",i.categoryId); m.put("unitPrice",i.unitPrice); m.put("quantity",i.quantity); m.put("subtotal",i.subtotal); return m;
    }
    public static Map<String,Object> review(Domain.Review r) {
        var m = new LinkedHashMap<String,Object>(); m.put("reviewId",r.id); m.put("orderId",r.orderId); m.put("storeId",r.storeId);
        m.put("userId",r.userId); m.put("content",r.content); m.put("rating",r.rating); m.put("reply",r.reply);
        m.put("createdAt",r.createdAt); m.put("repliedAt",r.repliedAt); return m;
    }
}
