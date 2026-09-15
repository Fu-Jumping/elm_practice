package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.IdGenerator;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.common.Times;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.domain.Domain;
import com.elm.practice.mapper.FavoriteMapper;
import com.elm.practice.mapper.StoreMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 商家收藏（契约 §3.7）：只读写当前用户自己的收藏；(userId, storeId) 唯一且重复收藏幂等；
 * 取消未被收藏的商店幂等 200 空对象，storeId 本身不存在才 404；商家关闭后收藏项保留并回显最新 storeStatus。
 */
@Service
public class FavoriteService {
    private final FavoriteMapper favorites;
    private final StoreMapper stores;
    private final PromotionTagService promotionTags;
    private final IdGenerator ids;

    public FavoriteService(FavoriteMapper favorites, StoreMapper stores, PromotionTagService promotionTags,
                           IdGenerator ids) {
        this.favorites = favorites; this.stores = stores; this.promotionTags = promotionTags; this.ids = ids;
    }

    public List<Map<String, Object>> list(Domain.User u) {
        return favorites.findByUser(u.id).stream().map(this::view).toList();
    }

    @Transactional
    public Map<String, Object> create(Domain.User u, String rawStoreId) {
        String storeId = RequestUtil.required(rawStoreId, "storeId");
        requireStore(storeId);
        Domain.Favorite existing = favorites.findOne(u.id, storeId);
        if (existing != null) return view(existing);
        Domain.Favorite created = new Domain.Favorite(ids.nextId("fv"), u.id, storeId, Times.now());
        favorites.insert(created);
        return view(created);
    }

    @Transactional
    public Map<String, Object> delete(Domain.User u, String storeId) {
        requireStore(storeId);
        favorites.delete(u.id, storeId);
        return Map.of();
    }

    private void requireStore(String storeId) {
        if (stores.findById(storeId) == null) throw ApiException.notFound("商家不存在");
    }

    private Map<String, Object> view(Domain.Favorite favorite) {
        Domain.Store store = stores.findById(favorite.storeId);
        return ViewMapper.favorite(favorite, store, store == null ? List.of() : promotionTags.tags(store.id));
    }
}
