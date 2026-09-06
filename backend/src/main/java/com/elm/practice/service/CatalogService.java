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
public class CatalogService {
    private final InMemoryRepository repo; private final StoreService stores;
    public CatalogService(InMemoryRepository repo, StoreService stores) { this.repo=repo; this.stores=stores; }
    public List<Map<String,Object>> categories(Domain.Merchant m) { stores.requireMerchantStore(m); return stores.categories(m.storeId); }
    public Domain.Category createCategory(Domain.Merchant m, String name, Integer sort) {
        synchronized (repo) {
        stores.requireMerchantStore(m); String n=RequestUtil.required(name,"name");
        if(repo.categories.values().stream().anyMatch(c->c.storeId.equals(m.storeId)&&c.name.equals(n))) throw ApiException.conflict("同一店铺分类名称不能重复");
        String id=repo.nextId("c"); Domain.Category c=new Domain.Category(id,m.storeId,n,sort==null?1:sort); repo.categories.put(id,c); return c; }
    }
    public Domain.Category patchCategory(Domain.Merchant m,String id,String name,Integer sort) {
        synchronized (repo) { Domain.Category c=requireCategory(m,id); if(name!=null){String n=RequestUtil.required(name,"name"); if(repo.categories.values().stream().anyMatch(x->!x.id.equals(id)&&x.storeId.equals(m.storeId)&&x.name.equals(n))) throw ApiException.conflict("同一店铺分类名称不能重复"); c.name=n;} if(sort!=null)c.sortOrder=sort; return c; }
    }
    public void deleteCategory(Domain.Merchant m,String id) { synchronized (repo) { Domain.Category c=requireCategory(m,id); if(repo.products.values().stream().anyMatch(p->p.categoryId.equals(id))) throw ApiException.conflict("该分类下存在商品，请先处理商品归属"); repo.categories.remove(c.id); } }
    public List<Map<String,Object>> products(Domain.Merchant m,String categoryId) { stores.requireMerchantStore(m); return stores.products(m.storeId,categoryId,true); }
    public Domain.Product createProduct(Domain.Merchant m,String name,String desc,String image,String category,java.math.BigDecimal price,Integer stock,Boolean sale) {
        synchronized (repo) {
        stores.requireMerchantStore(m); validateProduct(name,category,price,stock); requireCategory(m,category);
        String id=repo.nextId("p"); Domain.Product p=new Domain.Product(id,m.storeId,category,RequestUtil.required(name,"name"),desc==null?"":desc.trim(),image==null?"":image.trim(),RequestUtil.money(price,"price"),stock,sale==null||sale,0); repo.products.put(id,p); return p; }
    }
    public Domain.Product getProduct(Domain.Merchant m,String id){Domain.Product p=stores.getProduct(id); if(!p.storeId.equals(m.storeId)) throw ApiException.notFound("商品不存在"); return p;}
    public Domain.Product patchProduct(Domain.Merchant m,String id,String name,String desc,String image,String category,java.math.BigDecimal price,Integer stock,Boolean sale){ synchronized (repo) { Domain.Product p=getProduct(m,id); if(name!=null)p.name=RequestUtil.required(name,"name"); if(desc!=null)p.description=desc.trim(); if(image!=null)p.image=image.trim(); if(category!=null){requireCategory(m,category);p.categoryId=category;} if(price!=null)p.price=RequestUtil.money(price,"price"); if(stock!=null){if(stock<0)throw ApiException.badRequest("stock必须为非负整数");p.stock=stock;}if(sale!=null)p.onSale=sale;return p;} }
    public void deleteProduct(Domain.Merchant m,String id){ synchronized (repo) { Domain.Product p=getProduct(m,id);if(p.onSale)throw ApiException.conflict("在售商品不能删除，请先下架");repo.products.remove(p.id); } }
    public Domain.Product availability(Domain.Merchant m,String id,Boolean sale,Integer stock){ synchronized (repo) { Domain.Product p=getProduct(m,id);if(stock!=null&&stock<0)throw ApiException.badRequest("stock必须为非负整数");if(stock!=null)p.stock=stock;if(sale!=null)p.onSale=sale;return p;} }
    private Domain.Category requireCategory(Domain.Merchant m,String id){if(id==null)throw ApiException.badRequest("categoryId不能为空");Domain.Category c=repo.categories.get(id);if(c==null||!c.storeId.equals(m.storeId))throw ApiException.notFound("分类不存在");return c;}
    private void validateProduct(String name,String cat,java.math.BigDecimal price,Integer stock){RequestUtil.required(name,"name");if(cat==null||cat.isBlank())throw ApiException.badRequest("categoryId不能为空");RequestUtil.money(price,"price");if(stock==null||stock<0)throw ApiException.badRequest("stock必须为非负整数");}
}
