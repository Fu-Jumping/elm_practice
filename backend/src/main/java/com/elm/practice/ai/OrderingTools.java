package com.elm.practice.ai;

import dev.langchain4j.agent.tool.Tool;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * AI 点餐助手工具集：供大模型通过 Function Calling 调用，检索真实商家/菜单/菜品数据。
 * 只做查询推荐，不做下单（下单仍走现有购物车/订单接口）。
 */
@Component
public class OrderingTools {

    private final JdbcTemplate jdbc;

    public OrderingTools(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** 搜索商家：按商家名或描述关键词，返回评分/月售/起送/配送费。 */
    @Tool("searchStores")
    public String searchStores(String keyword) {
        String k = keyword == null ? "" : keyword.trim();
        String sql = "SELECT store_id, name, description, rating, monthly_sales, delivery_minutes, "
                + "start_price, delivery_fee, status FROM stores WHERE status != 'CLOSED'";
        List<Map<String, Object>> rows;
        if (k.isEmpty()) {
            rows = jdbc.queryForList(sql + " ORDER BY monthly_sales DESC LIMIT 10");
        } else {
            sql += " AND (name LIKE ? OR description LIKE ?) ORDER BY monthly_sales DESC LIMIT 10";
            rows = jdbc.queryForList(sql, "%" + k + "%", "%" + k + "%");
        }
        if (rows.isEmpty()) return "没有找到相关商家，试试其他关键词或告诉我想吃什么口味。";
        StringBuilder sb = new StringBuilder("为你找到以下商家：\n");
        for (Map<String, Object> r : rows) {
            sb.append(String.format("- %s（评分 %s，月售 %s，起送 ¥%s，配送费 ¥%s，约 %s 分钟）[%s]%n",
                    r.get("name"), r.get("rating"), r.get("monthly_sales"),
                    r.get("start_price"), r.get("delivery_fee"), r.get("delivery_minutes"), r.get("store_id")));
        }
        return sb.toString();
    }

    /** 获取某商家的完整菜单（分类 + 在售商品，含价格/标签/销量）。 */
    @Tool("getStoreMenu")
    public String getStoreMenu(String storeId) {
        if (storeId == null || storeId.isBlank()) return "请先告诉我商家编号（storeId）。";
        Map<String, Object> store = jdbc.queryForList(
                "SELECT name FROM stores WHERE store_id = ?", storeId).stream().findFirst().orElse(null);
        if (store == null) return "没有找到编号为 " + storeId + " 的商家。";
        List<Map<String, Object>> cats = jdbc.queryForList(
                "SELECT category_id, name FROM categories WHERE store_id = ? ORDER BY sort_order, category_id", storeId);
        if (cats.isEmpty()) return store.get("name") + " 暂无分类菜单。";
        StringBuilder sb = new StringBuilder(store.get("name") + " 的菜单：\n");
        for (Map<String, Object> c : cats) {
            sb.append("\n【").append(c.get("name")).append("】\n");
            List<Map<String, Object>> prods = jdbc.queryForList(
                    "SELECT name, description, price, member_price, tags, sales, stock FROM products "
                            + "WHERE store_id = ? AND category_id = ? AND on_sale = TRUE ORDER BY sales DESC",
                    storeId, c.get("category_id"));
            for (Map<String, Object> p : prods) {
                String tags = p.get("tags") == null ? "" : p.get("tags").toString();
                sb.append(String.format("- %s：¥%s（月售 %s，库存 %s）%s%n",
                        p.get("name"), p.get("price"), p.get("sales"), p.get("stock"),
                        tags.isEmpty() ? "" : " 标签:" + tags));
            }
        }
        return sb.toString();
    }

    /** 跨店搜索菜品：按菜名、描述或标签关键词，返回所属商家与价格。 */
    @Tool("searchProducts")
    public String searchProducts(String keyword) {
        if (keyword == null || keyword.isBlank()) return "请告诉我你想找什么菜。";
        String k = keyword.trim();
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT p.name, p.price, p.tags, p.sales, s.name AS store_name, p.store_id "
                        + "FROM products p JOIN stores s ON p.store_id = s.store_id "
                        + "WHERE p.on_sale = TRUE AND s.status != 'CLOSED' "
                        + "AND (p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ?) "
                        + "ORDER BY p.sales DESC LIMIT 15",
                "%" + k + "%", "%" + k + "%", "%" + k + "%");
        if (rows.isEmpty()) return "没有找到「" + k + "」相关的菜品，试试其他关键词。";
        StringBuilder sb = new StringBuilder("为你找到以下菜品：\n");
        for (Map<String, Object> r : rows) {
            sb.append(String.format("- %s（¥%s，月售 %s）来自 %s [%s]%n",
                    r.get("name"), r.get("price"), r.get("sales"), r.get("store_name"), r.get("store_id")));
        }
        return sb.toString();
    }

    /** 按口味标签推荐菜品（如辣、甜、清淡、素食等），返回销量高的菜品。 */
    @Tool("recommendByTaste")
    public String recommendByTaste(String taste) {
        if (taste == null || taste.isBlank()) return "请告诉我你的口味偏好，比如辣、甜、清淡、素食等。";
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT p.name, p.price, p.tags, p.sales, s.name AS store_name, p.store_id "
                        + "FROM products p JOIN stores s ON p.store_id = s.store_id "
                        + "WHERE p.on_sale = TRUE AND s.status != 'CLOSED' AND p.tags LIKE ? "
                        + "ORDER BY p.sales DESC LIMIT 12",
                "%" + taste + "%");
        if (rows.isEmpty()) return "暂时没有「" + taste + "」口味的菜品，你可以试试其他口味。";
        StringBuilder sb = new StringBuilder("为你推荐「" + taste + "」口味的热销菜品：\n");
        for (Map<String, Object> r : rows) {
            sb.append(String.format("- %s（¥%s，月售 %s）来自 %s [%s]%n",
                    r.get("name"), r.get("price"), r.get("sales"), r.get("store_name"), r.get("store_id")));
        }
        return sb.toString();
    }

    /** 获取所有商家分类（用于引导用户）。 */
    @Tool("listStoreCategories")
    public String listStoreCategories() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT DISTINCT name FROM categories ORDER BY name");
        if (rows.isEmpty()) return "暂无分类。";
        StringBuilder sb = new StringBuilder("平台商家分类有：");
        for (int i = 0; i < rows.size(); i++) {
            sb.append(rows.get(i).get("name"));
            if (i < rows.size() - 1) sb.append("、");
        }
        return sb.toString();
    }
}
