package com.elm.practice.service;

import com.elm.practice.domain.Domain;
import com.elm.practice.mapper.PromotionMapper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * 店铺促销标签（契约 §3.7 couponTags 与 §3.2 商家卡促销标签）：一律来自真实 promotions / promotion_tiers 配置，
 * 无优惠返回空数组，不由前端补演示值。
 */
@Service
public class PromotionTagService {
    private final PromotionMapper promotions;

    public PromotionTagService(PromotionMapper promotions) { this.promotions = promotions; }

    public List<String> tags(String storeId) {
        Domain.PromoConfig cfg = promotions.findConfig(storeId);
        if (cfg == null || !cfg.enabled) return List.of();
        List<String> tags = new ArrayList<>();
        for (Domain.PromoTier tier : promotions.findTiers(storeId)) {
            if (tier.threshold == null || tier.amount == null) continue;
            tags.add("满" + plain(tier.threshold) + "减" + plain(tier.amount));
        }
        if (cfg.newUserAmount != null && cfg.newUserAmount.signum() > 0) {
            tags.add("新客减" + plain(cfg.newUserAmount));
        }
        if (cfg.freeDeliveryThreshold != null && cfg.freeDeliveryThreshold.signum() > 0) {
            tags.add("满" + plain(cfg.freeDeliveryThreshold) + "免配送费");
        }
        return List.copyOf(tags);
    }

    private static String plain(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
}
