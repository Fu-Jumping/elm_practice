package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.IdGenerator;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.common.Times;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.domain.Domain;
import com.elm.practice.dto.Requests;
import com.elm.practice.mapper.FavoriteMapper;
import com.elm.practice.mapper.PromotionMapper;
import com.elm.practice.mapper.StoreMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/** 商家收藏（契约 §3.7）：收藏/取消幂等、用户隔离、店铺关闭后收藏保留。 */
@Service
public class FavoriteService {
    private final FavoriteMapper favorites;
    private final StoreMapper stores;
    private final PromotionMapper promotions;
    private final IdGenerator ids;

    public FavoriteService(FavoriteMapper favorites, StoreMapper stores, PromotionMapper promotions, IdGenerator ids) {
        this.favorites = favorites; this.stores = stores; this.promotions = promotions; this.ids = ids;
    }

    public List<Map<String,Object>> list(Domain.User u) {
        return favorites.listByUser(u.id).stream().map(f -> ViewMapper.favorite(f, couponTags(f.storeId))).toList();
    }

    @Transactional
    public Map<String,Object> add(Domain.User u, Requests.FavoriteCreate req) {
        String storeId = RequestUtil.required(req == null ? null : req.storeId, "storeId");
        Domain.Store store = stores.findById(storeId);
        if (store == null) throw ApiException.notFound("商家不存在");
        Domain.Favorite f = favorites.findByUserStore(u.id, storeId);
        if (f == null) {
            f = new Domain.Favorite();
            f.id = ids.nextId("fav"); f.userId = u.id; f.storeId = storeId; f.createdAt = Times.nowCn();
            favorites.insert(f); // INSERT IGNORE，并发下唯一键冲突不报错
            f = favorites.findByUserStore(u.id, storeId);
        }
        return ViewMapper.favorite(f, couponTags(storeId));
    }

    @Transactional
    public Map<String,Object> remove(Domain.User u, String storeId) {
        Domain.Store store = stores.findById(storeId);
        if (store == null) throw ApiException.notFound("商家不存在");
        // 取消未被收藏的店同样 200，不报错、不产生记录（契约 §3.7 幂等口径）。
        favorites.delete(u.id, storeId);
        return Map.of();
    }

    /** 促销标签：仅当店铺启用优惠且配置了满减阶梯时生成，按门槛升序，如「满20减2」。 */
    private List<String> couponTags(String storeId) {
        Domain.PromoConfig cfg = promotions.findConfig(storeId);
        if (cfg == null || !cfg.enabled) return List.of();
        return promotions.findTiers(storeId).stream()
                .sorted(Comparator.comparing(t -> t.threshold))
                .map(t -> "满" + money(t.threshold) + "减" + money(t.amount))
                .toList();
    }

    private static String money(BigDecimal v) {
        return v.setScale(2).stripTrailingZeros().toPlainString();
    }
}
