package com.elm.practice.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * AI 点餐助手知识库服务：启动时从 MySQL 加载所有商家与在售商品，
 * 生成结构化文本作为大模型上下文，替代 Function Calling 实时查库，提升稳定性。
 */
@Component
public class ProductKnowledgeService {

    private static final Logger log = LoggerFactory.getLogger(ProductKnowledgeService.class);
    private final JdbcTemplate jdbc;
    private volatile String cache;

    public ProductKnowledgeService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** 获取知识库文本（带内存缓存，首次加载后缓存）。 */
    public String getKnowledge() {
        if (cache == null) cache = buildKnowledge();
        return cache;
    }

    /** 强制刷新缓存（商品/商家变更后可调用）。 */
    public void refresh() { cache = buildKnowledge(); }

    private String buildKnowledge() {
        try {
            StringBuilder sb = new StringBuilder();
            sb.append("# 平台商家与商品知识库\n\n");
            List<Map<String, Object>> stores = jdbc.queryForList(
                    "SELECT store_id, name, description, rating, monthly_sales, delivery_minutes, "
                            + "start_price, delivery_fee, status FROM stores WHERE status != 'CLOSED' ORDER BY monthly_sales DESC");
            for (Map<String, Object> s : stores) {
                String sid = String.valueOf(s.get("store_id"));
                sb.append("## ").append(s.get("name"))
                        .append(" [").append(sid).append("]\n");
                sb.append(String.format("- 评分：%s｜月售：%s｜配送时长：%s分钟｜起送价：¥%s｜配送费：¥%s%n",
                        s.get("rating"), s.get("monthly_sales"), s.get("delivery_minutes"),
                        s.get("start_price"), s.get("delivery_fee")));
                if (s.get("description") != null) {
                    sb.append("- 简介：").append(s.get("description")).append("\n");
                }
                List<Map<String, Object>> cats = jdbc.queryForList(
                        "SELECT category_id, name FROM categories WHERE store_id = ? ORDER BY sort_order, category_id", sid);
                for (Map<String, Object> c : cats) {
                    sb.append("\n### ").append(c.get("name")).append("\n");
                    List<Map<String, Object>> prods = jdbc.queryForList(
                            "SELECT name, description, price, member_price, tags, sales, stock FROM products "
                                    + "WHERE store_id = ? AND category_id = ? AND on_sale = TRUE ORDER BY sales DESC",
                            sid, c.get("category_id"));
                    for (Map<String, Object> p : prods) {
                        String tags = p.get("tags") == null ? "" : String.valueOf(p.get("tags"));
                        Object stock = p.get("stock");
                        String stockText = (stock != null && ((Number) stock).intValue() == 0) ? "（缺货）" : "";
                        sb.append(String.format("- %s：¥%s（月售 %s）%s%s%n",
                                p.get("name"), p.get("price"), p.get("sales"),
                                tags.isEmpty() ? "" : " 标签:" + tags, stockText));
                    }
                }
                sb.append("\n");
            }
            log.info("AI 知识库加载完成，商家数：{}", stores.size());
            return sb.toString();
        } catch (Exception e) {
            log.error("AI 知识库加载失败", e);
            return "# 平台商家与商品知识库\n\n（知识库加载失败，请稍后重试）";
        }
    }
}
