package com.elm.practice.repository;

import com.elm.practice.domain.Domain;
import org.springframework.stereotype.Repository;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Small deterministic repository for local course demos. The interfaces are deliberately
 * storage-agnostic, so this class can be replaced by MyBatis repositories without changing
 * Controller/Service contracts.
 */
@Repository
public class InMemoryRepository {
    public final Map<String, Domain.User> users = new LinkedHashMap<>();
    public final Map<String, Domain.Merchant> merchants = new LinkedHashMap<>();
    public final Map<String, Domain.Store> stores = new LinkedHashMap<>();
    public final Map<String, Domain.Category> categories = new LinkedHashMap<>();
    public final Map<String, Domain.Product> products = new LinkedHashMap<>();
    public final Map<String, Domain.Address> addresses = new LinkedHashMap<>();
    public final Map<String, Domain.CartLine> cartLines = new LinkedHashMap<>();
    public final Map<String, Domain.Order> orders = new LinkedHashMap<>();
    public final Map<String, Domain.Review> reviews = new LinkedHashMap<>();
    public final Map<String, Domain.Conversation> conversations = new LinkedHashMap<>();
    public final Map<String, Map<String, Object>> promotions = new LinkedHashMap<>();
    // Seed records occupy the 1001-1003 range; generated records start at 1004.
    private final AtomicLong sequence = new AtomicLong(1003);
    public static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @PostConstruct
    public synchronized void seed() {
        if (!users.isEmpty()) return;
        String now = now();
        users.put("u001", new Domain.User("u001", "13800000001", hash("123456"), "演示用户", now));
        merchants.put("ma001", new Domain.Merchant("ma001", "merchant-a", hash("123456"), "m002", "13800000002", now));
        stores.put("m001", store("m001", "老王小店", "家常菜与便当", "", "", Domain.StoreStatus.OPEN, 4.6));
        stores.put("m002", store("m002", "肯德基宅急送", "吮指原味鸡，宅家也能吃", "", "ma001", Domain.StoreStatus.OPEN, 4.8));
        stores.put("m003", store("m003", "麦当劳", "经典汉堡套餐", "", "", Domain.StoreStatus.OPEN, 4.7));
        stores.put("m004", store("m004", "老胖烧烤", "夜宵烧烤外卖", "", "", Domain.StoreStatus.TEMPORARILY_CLOSED, 4.5));
        stores.put("m005", store("m005", "元盛居火锅", "鲜切羊肉火锅", "", "", Domain.StoreStatus.OPEN, 4.6));
        int cat = 100;
        for (Domain.Store store : stores.values()) {
            String cid = "c" + (++cat);
            categories.put(cid, new Domain.Category(cid, store.id, "热销推荐", 1));
        }
        Domain.Category kfc = categories.values().stream().filter(c -> c.storeId.equals("m002")).findFirst().orElseThrow();
        product("p101", "m002", kfc.id, "吮指原味鸡", "经典美味", "", "29.00", 20, 120);
        product("p102", "m002", kfc.id, "香辣鸡翅", "外酥里嫩", "", "19.00", 20, 88);
        product("p103", "m002", kfc.id, "黄金鸡块", "分享装", "", "16.00", 30, 75);
        product("p104", "m002", kfc.id, "可乐（中杯）", "冰爽可口", "", "8.00", 40, 140);
        product("p105", "m002", kfc.id, "劲脆鸡腿堡", "现做汉堡", "", "25.00", 15, 64);
        for (Domain.Store store : stores.values()) {
            if (!store.id.equals("m002")) {
                Domain.Category c = categories.values().stream().filter(x -> x.storeId.equals(store.id)).findFirst().orElseThrow();
                product("p" + store.id.substring(1) + "01", store.id, c.id, "招牌套餐", "店内热销", "", "28.00", 20, 30);
            }
        }
        addresses.put("da001", new Domain.Address("da001", "u001", "张同学", "先生", "13800000001",
                "天津大学软件园校区", "12号楼 304室", "学校", true, LocalDateTime.now()));
        // Seed one processing, one completed and one pending-payment order for the fixed acceptance data.
        Domain.Address snapshot = copyAddress(addresses.get("da001"));
        Domain.Order processing = new Domain.Order("o1001", "u001", "m002", "da001", "少放辣", now,
                Domain.OrderStatus.PROCESSING, new BigDecimal("29.00"), new BigDecimal("2.00"), new BigDecimal("31.00"), snapshot, null);
        processing.items.add(new Domain.OrderItem("p101", "吮指原味鸡", "", kfc.id, new BigDecimal("29.00"), 1));
        orders.put(processing.id, processing);
        Domain.Order completed = new Domain.Order("o1002", "u001", "m002", "da001", "", now,
                Domain.OrderStatus.COMPLETED, new BigDecimal("19.00"), new BigDecimal("2.00"), new BigDecimal("21.00"), snapshot, null);
        completed.items.add(new Domain.OrderItem("p102", "香辣鸡翅", "", kfc.id, new BigDecimal("19.00"), 1));
        orders.put(completed.id, completed);
        Domain.Order unpaid = new Domain.Order("o1003", "u001", "m002", "da001", "", now,
                Domain.OrderStatus.PENDING_PAYMENT, new BigDecimal("25.00"), new BigDecimal("2.00"), new BigDecimal("27.00"), snapshot, null);
        unpaid.items.add(new Domain.OrderItem("p105", "劲脆鸡腿堡", "", kfc.id, new BigDecimal("25.00"), 1));
        orders.put(unpaid.id, unpaid);
    }

    public String nextId(String prefix) { return prefix + sequence.incrementAndGet(); }
    public String now() { return LocalDateTime.now().format(TIME); }
    public static String hash(String input) {
        try {
            var digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder();
            for (byte b : bytes) out.append(String.format("%02x", b));
            return out.toString();
        } catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    private Domain.Store store(String id, String name, String desc, String image, String merchantId,
                               Domain.StoreStatus status, double rating) {
        return new Domain.Store(id, name, desc, image, BigDecimal.valueOf(rating), 1000,
                30, new BigDecimal("20.00"), new BigDecimal("3.00"), status,
                merchantId.isBlank() ? null : merchantId);
    }
    private void product(String id, String storeId, String catId, String name, String desc, String image,
                         String price, int stock, int sales) {
        products.put(id, new Domain.Product(id, storeId, catId, name, desc, image,
                new BigDecimal(price), stock, true, sales));
    }
    public static Domain.Address copyAddress(Domain.Address a) {
        return new Domain.Address(a.id, a.userId, a.contactName, a.contactSex, a.contactPhone,
                a.region, a.detail, a.label, a.isDefault, a.updatedAt);
    }
}
