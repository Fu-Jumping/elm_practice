package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.domain.Domain;
import com.elm.practice.mapper.CategoryMapper;
import com.elm.practice.mapper.MerchantMapper;
import com.elm.practice.mapper.PlatformCategoryMapper;
import com.elm.practice.mapper.ProductMapper;
import com.elm.practice.mapper.StoreMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class StoreService {
    private final StoreMapper stores; private final CategoryMapper categories; private final ProductMapper products;
    private final MerchantMapper merchants; private final PromotionTagService promotionTags;
    private final PlatformCategoryMapper platformCategories;
    public StoreService(StoreMapper stores, CategoryMapper categories, ProductMapper products, MerchantMapper merchants,
                        PromotionTagService promotionTags, PlatformCategoryMapper platformCategories) {
        this.stores = stores; this.categories = categories; this.products = products; this.merchants = merchants;
        this.promotionTags = promotionTags; this.platformCategories = platformCategories;
    }

    /**
     * 用户端店铺列表（契约 §3.2）：CLOSED 店铺隐藏、TEMPORARILY_CLOSED 可见但不可下单；
     * 分类条件同时接受店铺自身 categories 与平台级课程分类（批次⑨ C1），两者都不认识时返回空列表。
     * 促销标签耦合真实 promotions 配置（§3.7 couponTags / 商家卡标签）。
     */
    public List<Map<String,Object>> list(String keyword, String categoryId, String sort) {
        String k = keyword == null ? "" : keyword.trim().toLowerCase();
        if (categoryId != null && !categoryId.isBlank()
                && categories.findById(categoryId) == null
                && platformCategories.countById(categoryId) == 0) return List.of();
        return stores.listVisible(k, categoryId, sort).stream()
                .map(s -> ViewMapper.storeWithTags(s, promotionTags.tags(s.id))).toList();
    }

    public Domain.Store get(String storeId) {
        Domain.Store s = stores.findById(storeId);
        if (s == null) throw ApiException.notFound("店铺不存在"); return s;
    }

    public List<Map<String,Object>> categories(String storeId) {
        get(storeId);
        return categories.findByStore(storeId).stream().map(ViewMapper::category).toList();
    }

    public List<Map<String,Object>> products(String storeId, String categoryId, boolean merchantView) {
        get(storeId);
        return products.findByStore(storeId, categoryId, !merchantView).stream().map(ViewMapper::product).toList();
    }

    public Domain.Product getProduct(String id) {
        Domain.Product p = products.findById(id);
        if (p == null) throw ApiException.notFound("商品不存在"); return p;
    }

    public Map<String,Object> publicProduct(String id) {
        Domain.Product p = getProduct(id);
        if (!p.onSale) throw ApiException.notFound("商品不存在");
        return ViewMapper.product(p);
    }

    public Domain.Store requireMerchantStore(Domain.Merchant merchant) {
        Domain.Store s = get(merchant.storeId);
        if (!merchant.storeId.equals(s.id)) throw ApiException.forbidden("商家未绑定店铺"); return s;
    }

    @Transactional
    public void updateStore(Domain.Merchant m, Domain.Store s, String name, String desc, String image, java.math.BigDecimal start, java.math.BigDecimal fee, String contactPhone) {
        if (name != null) s.name = RequestUtil.required(name, "name");
        if (desc != null) s.description = desc.trim();
        if (image != null) s.image = image.trim();
        if (start != null) s.startPrice = RequestUtil.money(start, "startPrice");
        if (fee != null) s.deliveryFee = RequestUtil.money(fee, "deliveryFee");
        // BUG-20260908-012：联系电话随店铺设置保存（落 merchants.phone）；不传 = 不改，传值必须为 11 位手机号。
        if (contactPhone != null) {
            String phone = contactPhone.trim();
            if (!phone.matches("^1\\d{10}$")) throw ApiException.badRequest("联系电话必须是 11 位手机号");
            if (merchants.updatePhone(m.id, phone) != 1) throw ApiException.notFound("商家不存在");
            m.phone = phone;
        }
        stores.updateFull(s);
    }

    @Transactional
    public void updateStatus(Domain.Store store, Domain.StoreStatus status) {
        if (stores.updateStatus(store.id, status) != 1) throw ApiException.notFound("店铺不存在");
        store.status = status;
    }
}
