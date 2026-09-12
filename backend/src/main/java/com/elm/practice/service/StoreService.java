package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.domain.Domain;
import com.elm.practice.mapper.CategoryMapper;
import com.elm.practice.mapper.MerchantMapper;
import com.elm.practice.mapper.ProductMapper;
import com.elm.practice.mapper.StoreMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class StoreService {
    private final StoreMapper stores; private final CategoryMapper categories; private final ProductMapper products;
    private final MerchantMapper merchants;
    public StoreService(StoreMapper stores, CategoryMapper categories, ProductMapper products, MerchantMapper merchants) {
        this.stores = stores; this.categories = categories; this.products = products; this.merchants = merchants;
    }

    public List<Map<String,Object>> list(String keyword, String categoryId, String sort) {
        // CLOSED 店铺对用户端隐藏；TEMPORARILY_CLOSED 可见但不可下单（过滤/排序下推 SQL）。
        String k = keyword == null ? "" : keyword.trim().toLowerCase();
        if (categoryId != null && !categoryId.isBlank() && categories.findById(categoryId) == null) return List.of();
        return stores.listVisible(k, categoryId, sort).stream().map(ViewMapper::store).toList();
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
