package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.domain.Domain;
import com.elm.practice.repository.InMemoryRepository;
import org.springframework.stereotype.Service;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class StoreService {
    private final InMemoryRepository repo;
    public StoreService(InMemoryRepository repo) { this.repo=repo; }
    public List<Map<String,Object>> list(String keyword, String categoryId, String sort) {
        synchronized (repo) {
        String k = keyword == null ? "" : keyword.trim().toLowerCase();
        // CLOSED stores are hidden from customers; TEMPORARILY_CLOSED remains visible but cannot accept orders.
        var stream = repo.stores.values().stream()
                .filter(s -> s.status != Domain.StoreStatus.CLOSED)
                .filter(s -> k.isEmpty() || s.name.toLowerCase().contains(k) || s.description.toLowerCase().contains(k));
        if (categoryId != null && !categoryId.isBlank()) {
            boolean exists = repo.categories.values().stream().anyMatch(c -> c.id.equals(categoryId));
            if (!exists) return List.of();
            stream = stream.filter(s -> repo.categories.values().stream().anyMatch(c -> c.storeId.equals(s.id) && c.id.equals(categoryId)));
        }
        if ("销量".equals(sort)) stream = stream.sorted(Comparator.comparingInt((Domain.Store s)->s.monthlySales).reversed());
        else if ("距离".equals(sort)) stream = stream.sorted(Comparator.comparing(s -> s.id));
        return stream.map(ViewMapper::store).toList();
        }
    }
    public Domain.Store get(String storeId) { Domain.Store s=repo.stores.get(storeId); if(s==null) throw ApiException.notFound("店铺不存在"); return s; }
    public List<Map<String,Object>> categories(String storeId) {
        synchronized (repo) { get(storeId); return repo.categories.values().stream().filter(c->c.storeId.equals(storeId)).sorted(Comparator.comparingInt(c->c.sortOrder)).map(ViewMapper::category).toList(); }
    }
    public List<Map<String,Object>> products(String storeId, String categoryId, boolean merchantView) {
        synchronized (repo) { get(storeId); var stream=repo.products.values().stream().filter(p->p.storeId.equals(storeId));
        if (categoryId != null && !categoryId.isBlank()) stream=stream.filter(p->p.categoryId.equals(categoryId));
        if (!merchantView) stream=stream.filter(p->p.onSale);
        return stream.sorted(Comparator.comparingInt((Domain.Product p)->p.sales).reversed()).map(ViewMapper::product).toList(); }
    }
    public Domain.Product getProduct(String id) { Domain.Product p=repo.products.get(id); if(p==null) throw ApiException.notFound("商品不存在"); return p; }
    public Map<String,Object> publicProduct(String id) { Domain.Product p=getProduct(id); if(!p.onSale) throw ApiException.notFound("商品不存在"); return ViewMapper.product(p); }
    public Domain.Store requireMerchantStore(Domain.Merchant merchant) {
        Domain.Store s=get(merchant.storeId); if(!merchant.storeId.equals(s.id)) throw ApiException.forbidden("商家未绑定店铺"); return s;
    }
    public void updateStore(Domain.Store s, String name, String desc, String image, java.math.BigDecimal start, java.math.BigDecimal fee) {
        synchronized (repo) {
        if (name != null) s.name=RequestUtil.required(name,"name");
        if (desc != null) s.description=desc.trim(); if (image != null) s.image=image.trim();
        if (start != null) s.startPrice=RequestUtil.money(start,"startPrice"); if (fee != null) s.deliveryFee=RequestUtil.money(fee,"deliveryFee");
        }
    }
}
