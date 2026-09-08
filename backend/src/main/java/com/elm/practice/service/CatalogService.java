package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.IdGenerator;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.domain.Domain;
import com.elm.practice.mapper.CategoryMapper;
import com.elm.practice.mapper.ProductMapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogService {
    private final CategoryMapper categories; private final ProductMapper products;
    private final StoreService stores; private final IdGenerator ids;
    public CatalogService(CategoryMapper categories, ProductMapper products, StoreService stores, IdGenerator ids) {
        this.categories = categories; this.products = products; this.stores = stores; this.ids = ids;
    }

    public java.util.List<java.util.Map<String,Object>> categories(Domain.Merchant m) {
        stores.requireMerchantStore(m); return stores.categories(m.storeId);
    }

    @Transactional
    public Domain.Category createCategory(Domain.Merchant m, String name, Integer sort) {
        stores.requireMerchantStore(m);
        String n = RequestUtil.required(name, "name");
        if (categories.findByName(m.storeId, n) != null) throw ApiException.conflict("同一店铺分类名称不能重复");
        Domain.Category c = new Domain.Category(ids.nextId("c"), m.storeId, n, sort == null ? 1 : sort);
        try { categories.insert(c); }
        catch (DuplicateKeyException e) { throw ApiException.conflict("同一店铺分类名称不能重复"); }
        return c;
    }

    @Transactional
    public Domain.Category patchCategory(Domain.Merchant m, String id, String name, Integer sort) {
        Domain.Category c = requireCategory(m, id);
        if (name != null) {
            String n = RequestUtil.required(name, "name");
            Domain.Category same = categories.findByName(m.storeId, n);
            if (same != null && !same.id.equals(id)) throw ApiException.conflict("同一店铺分类名称不能重复");
            c.name = n;
        }
        if (sort != null) c.sortOrder = sort;
        try { categories.updateFull(c); }
        catch (DuplicateKeyException e) { throw ApiException.conflict("同一店铺分类名称不能重复"); }
        return c;
    }

    @Transactional
    public void deleteCategory(Domain.Merchant m, String id) {
        Domain.Category c = requireCategory(m, id);
        if (products.countByCategory(id) > 0) throw ApiException.conflict("该分类下存在商品，请先处理商品归属");
        categories.delete(c.id);
    }

    public java.util.List<java.util.Map<String,Object>> products(Domain.Merchant m, String categoryId) {
        stores.requireMerchantStore(m); return stores.products(m.storeId, categoryId, true);
    }

    @Transactional
    public Domain.Product createProduct(Domain.Merchant m, String name, String desc, String image, String category,
                                        java.math.BigDecimal price, Integer stock, Boolean sale) {
        stores.requireMerchantStore(m);
        validateProduct(name, category, price, stock);
        requireCategory(m, category);
        Domain.Product p = new Domain.Product(ids.nextId("p"), m.storeId, category, RequestUtil.required(name, "name"),
                desc == null ? "" : desc.trim(), image == null ? "" : image.trim(),
                RequestUtil.money(price, "price"), stock, sale == null || sale, 0);
        products.insert(p);
        return p;
    }

    public Domain.Product getProduct(Domain.Merchant m, String id) {
        Domain.Product p = stores.getProduct(id);
        if (!p.storeId.equals(m.storeId)) throw ApiException.notFound("商品不存在"); return p;
    }

    @Transactional
    public Domain.Product patchProduct(Domain.Merchant m, String id, String name, String desc, String image, String category,
                                       java.math.BigDecimal price, Integer stock, Boolean sale) {
        Domain.Product p = getProduct(m, id);
        if (name != null) p.name = RequestUtil.required(name, "name");
        if (desc != null) p.description = desc.trim();
        if (image != null) p.image = image.trim();
        if (category != null) { requireCategory(m, category); p.categoryId = category; }
        if (price != null) p.price = RequestUtil.money(price, "price");
        if (stock != null) { if (stock < 0) throw ApiException.badRequest("stock必须为非负整数"); p.stock = stock; }
        if (sale != null) p.onSale = sale;
        products.updateFull(p);
        return p;
    }

    @Transactional
    public void deleteProduct(Domain.Merchant m, String id) {
        Domain.Product p = getProduct(m, id);
        if (p.onSale) throw ApiException.conflict("在售商品不能删除，请先下架");
        products.delete(p.id);
    }

    @Transactional
    public Domain.Product availability(Domain.Merchant m, String id, Boolean sale, Integer stock) {
        Domain.Product p = getProduct(m, id);
        if (stock != null && stock < 0) throw ApiException.badRequest("stock必须为非负整数");
        if (stock != null) p.stock = stock;
        if (sale != null) p.onSale = sale;
        products.updateFull(p);
        return p;
    }

    private Domain.Category requireCategory(Domain.Merchant m, String id) {
        if (id == null) throw ApiException.badRequest("categoryId不能为空");
        Domain.Category c = categories.findById(id);
        if (c == null || !c.storeId.equals(m.storeId)) throw ApiException.notFound("分类不存在"); return c;
    }

    private void validateProduct(String name, String cat, java.math.BigDecimal price, Integer stock) {
        RequestUtil.required(name, "name");
        if (cat == null || cat.isBlank()) throw ApiException.badRequest("categoryId不能为空");
        RequestUtil.money(price, "price");
        if (stock == null || stock < 0) throw ApiException.badRequest("stock必须为非负整数");
    }
}
