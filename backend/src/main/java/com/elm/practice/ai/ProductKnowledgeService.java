package com.elm.practice.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * AI 点餐助手知识库服务：启动时从 MySQL 加载所有营业商家与在售商品，
 * 生成紧凑结构化 JSON 作为大模型上下文。
 *
 * 事实数据（价格、销量、库存、评分、起送价等）严格来自数据库；
 * flavors/category 语义字段在 tags 全为空的现状下，基于商品名与描述中的
 * 真实文字做保守关键词归纳（如"香辣鸡腿堡"→辣、"九珍果汁"→甜/饮品），
 * 不做无依据的推测。
 */
@Component
public class ProductKnowledgeService {

    private static final Logger log = LoggerFactory.getLogger(ProductKnowledgeService.class);
    private final JdbcTemplate jdbc;
    private volatile String cache;

    public ProductKnowledgeService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** 获取知识库 JSON 文本（带内存缓存，首次加载后缓存）。 */
    public String getKnowledge() {
        if (cache == null) cache = buildKnowledge();
        return cache;
    }

    /** 强制刷新缓存（商品/商家变更后可调用）。 */
    public void refresh() { cache = buildKnowledge(); }

    /** 口味关键词归纳：命中商品名/描述中的真实文字才打标。 */
    private static final String[][] FLAVOR_RULES = {
            {"辣", "辣"},
            {"甜", "甜"}, {"甜", "果汁"}, {"甜", "棉花糖"}, {"甜", "冰粉"}, {"甜", "糖"},
            {"酸", "酸"}, {"酸", "柠檬"},
            {"清淡", "豆腐"}, {"清淡", "涮"},
            {"酥脆", "脆"}, {"酥脆", "薯条"}, {"酥脆", "酥"},
            {"咸香", "烤"}, {"咸香", "蒜香"},
    };

    /** 品类关键词归纳。 */
    private static final String[][] CATEGORY_RULES = {
            {"汉堡", "汉堡"}, {"汉堡", "堡"},
            {"炸鸡小食", "鸡"}, {"炸鸡小食", "鸡块"}, {"炸鸡小食", "鸡翅"},
            {"饮品", "果汁"}, {"饮品", "可乐"}, {"饮品", "奶茶"}, {"饮品", "饮料"}, {"饮品", "汽水"},
            {"烧烤", "烤"}, {"烧烤", "串"},
            {"火锅食材", "肥牛"}, {"火锅食材", "羊肉"}, {"火锅食材", "涮"},
            {"主食", "米饭"}, {"主食", "面条"}, {"主食", "鸡肉卷"}, {"主食", "粉"},
            {"家常菜", "豆腐"}, {"家常菜", "肉丝"}, {"家常菜", "茄子"}, {"家常菜", "小炒"},
            {"甜品", "棉花糖"}, {"甜品", "冰粉"}, {"甜品", "蛋糕"},
    };

    /** 商家业态/场景归纳，基于商家名称与描述中的真实文字。 */
    private static final String[][] CUISINE_RULES = {
            {"炸鸡汉堡", "炸鸡"}, {"炸鸡汉堡", "汉堡"},
            {"快餐", "快餐"},
            {"家常菜", "家常"}, {"家常菜", "小炒"},
            {"烧烤夜宵", "烧烤"}, {"烧烤夜宵", "夜宵"}, {"烧烤夜宵", "深夜"},
            {"火锅", "火锅"}, {"火锅", "涮"},
            {"甜品小吃", "棉花糖"}, {"甜品小吃", "甜品"},
    };

    private String buildKnowledge() {
        try {
            StringBuilder sb = new StringBuilder();
            List<Map<String, Object>> stores = jdbc.queryForList(
                    "SELECT store_id, name, description, rating, monthly_sales, delivery_minutes, "
                            + "start_price, delivery_fee, status FROM stores WHERE status != 'CLOSED' "
                            + "ORDER BY monthly_sales DESC");
            sb.append("{\"stores\":[");
            for (int si = 0; si < stores.size(); si++) {
                Map<String, Object> s = stores.get(si);
                String sid = String.valueOf(s.get("store_id"));
                String sname = String.valueOf(s.get("name"));
                String sdesc = s.get("description") == null ? "" : String.valueOf(s.get("description"));
                if (si > 0) sb.append(',');
                sb.append("{\"id\":").append(json(sid))
                        .append(",\"name\":").append(json(sname))
                        .append(",\"cuisine\":").append(json(deriveCuisines(sname + sdesc)))
                        .append(",\"rating\":").append(num(s.get("rating")))
                        .append(",\"monthlySales\":").append(num(s.get("monthly_sales")))
                        .append(",\"startPrice\":").append(num(s.get("start_price")))
                        .append(",\"deliveryFee\":").append(num(s.get("delivery_fee")))
                        .append(",\"deliveryMinutes\":").append(num(s.get("delivery_minutes")))
                        .append(",\"products\":[");
                List<Map<String, Object>> prods = jdbc.queryForList(
                        "SELECT p.name, p.description, p.price, p.member_price, p.tags, p.sales, p.stock "
                                + "FROM products p WHERE p.store_id = ? AND p.on_sale = TRUE "
                                + "ORDER BY p.sales DESC", sid);
                for (int pi = 0; pi < prods.size(); pi++) {
                    Map<String, Object> p = prods.get(pi);
                    String pname = String.valueOf(p.get("name"));
                    String pdesc = p.get("description") == null ? "" : String.valueOf(p.get("description"));
                    String ptags = p.get("tags") == null ? "" : String.valueOf(p.get("tags"));
                    String haystack = pname + " " + pdesc + " " + ptags;
                    Object stock = p.get("stock");
                    boolean inStock = stock == null || ((Number) stock).intValue() > 0;
                    if (pi > 0) sb.append(',');
                    sb.append("{\"name\":").append(json(pname))
                            .append(",\"price\":").append(num(p.get("price")))
                            .append(",\"monthlySales\":").append(num(p.get("sales")))
                            .append(",\"flavors\":").append(json(deriveTags(haystack, FLAVOR_RULES)))
                            .append(",\"category\":").append(json(deriveTags(haystack, CATEGORY_RULES)))
                            .append(",\"inStock\":").append(inStock);
                    if (!pdesc.isEmpty()) sb.append(",\"desc\":").append(json(pdesc));
                    sb.append('}');
                }
                sb.append("]}");
            }
            sb.append("]}");
            log.info("AI 知识库加载完成，营业商家数：{}", stores.size());
            return sb.toString();
        } catch (Exception e) {
            log.error("AI 知识库加载失败", e);
            return "{\"stores\":[]}";
        }
    }

    /** 按规则表在文本中命中关键词，返回去重后的标签列表（逗号分隔字符串）。 */
    private String deriveTags(String text, String[][] rules) {
        Set<String> hits = new LinkedHashSet<>();
        for (String[] rule : rules) {
            if (text.contains(rule[1])) hits.add(rule[0]);
        }
        return String.join("/", hits);
    }

    /** 商家业态标签，多个用 / 分隔。 */
    private String deriveCuisines(String text) {
        Set<String> hits = new LinkedHashSet<>();
        for (String[] rule : CUISINE_RULES) {
            if (text.contains(rule[1])) hits.add(rule[0]);
        }
        return String.join("/", hits);
    }

    private String json(String v) {
        if (v == null) return "\"\"";
        StringBuilder b = new StringBuilder("\"");
        for (char c : v.toCharArray()) {
            if (c == '"' || c == '\\') b.append('\\');
            b.append(c);
        }
        return b.append('"').toString();
    }

    private String num(Object v) {
        if (v == null) return "0";
        if (v instanceof java.math.BigDecimal bd) return bd.stripTrailingZeros().toPlainString();
        return String.valueOf(v);
    }
}
